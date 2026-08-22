import type { DayProgress, ProgressSummary } from './types';
import { createDayProgress } from './types';

/**
 * Mock progress data, kept deliberately separate from every presentation
 * component.
 *
 * This exists so the UI can be built and reviewed against every interesting
 * state before any health data exists. It will be replaced by Apple Health /
 * Health Connect adapters that produce the same `ProgressSummary`, so nothing
 * downstream of this file should need to change.
 */

export const DEFAULT_DAILY_GOAL = 8000;

export type ScenarioId
  = | 'new-user'
    | 'low-progress'
    | 'almost-complete'
    | 'goal-complete'
    | 'exceptional-day'
    | 'long-streak'
    | 'sparse-history'
    | 'dense-history';

export const SCENARIO_IDS: readonly ScenarioId[] = [
  'new-user',
  'low-progress',
  'almost-complete',
  'goal-complete',
  'exceptional-day',
  'long-streak',
  'sparse-history',
  'dense-history',
];

export const SCENARIO_LABELS: Record<ScenarioId, string> = {
  'new-user': 'New user',
  'low-progress': 'Low progress',
  'almost-complete': 'Almost complete',
  'goal-complete': 'Goal complete',
  'exceptional-day': '120%+ day',
  'long-streak': 'Long streak',
  'sparse-history': 'Sparse history',
  'dense-history': 'Dense history',
};

/** Days shown by Home's mini map: five weeks, Sunday through Saturday. */
export const MINI_MAP_DAYS = 35;

/** Deterministic LCG — the same seed always yields the same year. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    return state / 4294967296;
  };
}

export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);

  return next;
}

/** XP rule for generated history. The three Home states override it. */
function xpForSteps(steps: number, goalCompleted: boolean): number {
  return Math.round(steps / 40) + (goalCompleted ? 100 : 0);
}

type HistoryDensity = 'none' | 'sparse' | 'dense';

/**
 * Step counts for a stretch of past days.
 *
 * `sparse` is an inconsistent walker — many blank and low days. `dense` is
 * someone who mostly hits the goal, with the occasional big day.
 */
function stepsForDay(random: () => number, density: HistoryDensity): number | null {
  if (density === 'none')
    return null;

  const roll = random();

  if (density === 'sparse') {
    if (roll < 0.28)
      return 0;
    if (roll < 0.72)
      return Math.round(600 + random() * 5200);
    if (roll < 0.93)
      return Math.round(DEFAULT_DAILY_GOAL * (1 + random() * 0.2));

    return Math.round(DEFAULT_DAILY_GOAL * (1.2 + random() * 0.5));
  }

  if (roll < 0.07)
    return 0;
  if (roll < 0.24)
    return Math.round(1000 + random() * 6000);
  if (roll < 0.72)
    return Math.round(DEFAULT_DAILY_GOAL * (1 + random() * 0.32));
  if (roll < 0.93)
    return Math.round(DEFAULT_DAILY_GOAL * (1.18 + random() * 0.55));

  return Math.round(DEFAULT_DAILY_GOAL * (1.72 + random() * 0.3));
}

type HistoryOptions = {
  /** Last day of the generated window, inclusive. */
  endDate: Date;
  count: number;
  density: HistoryDensity;
  seed: number;
  /** Days from the end that should already be locked to the goal. */
  streak?: number;
  /** Steps for the final day. `null` leaves the generated value in place. */
  todaySteps?: number | null;
  /** Days that have not happened yet, counted back from `endDate`. */
  futureDays?: number;
};

function buildHistory({
  endDate,
  count,
  density,
  seed,
  streak = 0,
  todaySteps = null,
  futureDays = 0,
}: HistoryOptions): DayProgress[] {
  const random = makeRandom(seed);
  const lastRealIndex = count - 1 - futureDays;

  return Array.from({ length: count }, (_, index) => {
    const date = addDays(endDate, index - (count - 1));
    const isFuture = index > lastRealIndex;
    const isLastReal = index === lastRealIndex;

    let steps = isFuture ? null : stepsForDay(random, density);

    // Guarantee the requested streak lands immediately before/on today.
    const distanceFromLastReal = lastRealIndex - index;
    if (!isFuture && distanceFromLastReal > 0 && distanceFromLastReal < streak)
      steps = Math.round(DEFAULT_DAILY_GOAL * (1 + random() * 0.45));

    if (isLastReal && todaySteps !== null)
      steps = todaySteps;

    const goalCompleted = steps !== null && steps >= DEFAULT_DAILY_GOAL;

    return createDayProgress({
      date: toIsoDate(date),
      steps: steps ?? 0,
      dailyGoal: DEFAULT_DAILY_GOAL,
      xp: steps === null ? 0 : xpForSteps(steps, goalCompleted),
      distance: steps === null ? undefined : Number((steps * 0.000_76).toFixed(1)),
      isToday: isLastReal,
      hasData: steps !== null,
    });
  });
}

/**
 * The mini map is weekday-aligned, so its window ends on the Saturday of the
 * current week and the trailing days are simply "no data yet".
 */
function miniMapWindow(today: Date): { endDate: Date; futureDays: number } {
  const daysToSaturday = 6 - today.getDay();

  return { endDate: addDays(today, daysToSaturday), futureDays: daysToSaturday };
}

type ScenarioConfig = {
  todaySteps: number | null;
  streak: number;
  level: number;
  xpInLevel: number;
  xpToday: number;
  density: HistoryDensity;
  seed: number;
};

/**
 * XP figures follow the design system card: level 12, 4,000 XP per level, and
 * the bar reads `xpInLevel / xpForNextLevel`.
 */
const XP_PER_LEVEL = 4000;

const SCENARIOS: Record<ScenarioId, ScenarioConfig> = {
  'new-user': { todaySteps: 0, streak: 0, level: 1, xpInLevel: 0, xpToday: 0, density: 'none', seed: 1 },
  'low-progress': { todaySteps: 2140, streak: 18, level: 12, xpInLevel: 3240, xpToday: 70, density: 'dense', seed: 20_260_822 },
  'almost-complete': { todaySteps: 7420, streak: 18, level: 12, xpInLevel: 3300, xpToday: 180, density: 'dense', seed: 20_260_822 },
  'goal-complete': { todaySteps: 8420, streak: 19, level: 12, xpInLevel: 3470, xpToday: 310, density: 'dense', seed: 20_260_822 },
  'exceptional-day': { todaySteps: 15_200, streak: 21, level: 13, xpInLevel: 1180, xpToday: 480, density: 'dense', seed: 20_260_822 },
  'long-streak': { todaySteps: 9100, streak: 64, level: 24, xpInLevel: 2600, xpToday: 330, density: 'dense', seed: 77 },
  'sparse-history': { todaySteps: 3300, streak: 0, level: 4, xpInLevel: 900, xpToday: 82, density: 'sparse', seed: 404 },
  'dense-history': { todaySteps: 11_400, streak: 32, level: 18, xpInLevel: 3800, xpToday: 385, density: 'dense', seed: 909 },
};

export function getMockSummary(
  scenario: ScenarioId,
  today: Date = new Date(),
): ProgressSummary {
  const config = SCENARIOS[scenario];
  const { endDate, futureDays } = miniMapWindow(today);

  const recentDays = buildHistory({
    endDate,
    count: MINI_MAP_DAYS,
    density: config.density,
    seed: config.seed,
    streak: config.streak,
    todaySteps: config.todaySteps,
    futureDays,
  });

  const todayIndex = MINI_MAP_DAYS - 1 - futureDays;
  const todayProgress = recentDays[todayIndex];

  return {
    today: { ...todayProgress, xp: config.xpToday },
    streak: config.streak,
    level: config.level,
    xpInLevel: config.xpInLevel,
    xpForNextLevel: XP_PER_LEVEL,
    xpToday: config.xpToday,
    recentDays,
  };
}

/** A full year of days, for the annual Progress Map in a later milestone. */
export function getMockYear(
  scenario: ScenarioId,
  today: Date = new Date(),
): DayProgress[] {
  const config = SCENARIOS[scenario];
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.round((today.getTime() - startOfYear.getTime()) / 86_400_000);

  return buildHistory({
    endDate: new Date(today.getFullYear(), 11, 31),
    count: 365,
    density: config.density,
    seed: config.seed,
    streak: config.streak,
    todaySteps: config.todaySteps,
    futureDays: 364 - dayOfYear,
  });
}
