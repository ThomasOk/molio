import { create } from 'zustand';

import { getItem, setItem } from '@/lib/storage';
import { createSelectors } from '@/lib/utils';
import { clamp, MAX_STEPS } from './bloom';

/**
 * The day-steps store — the single home for "how many steps on day X".
 *
 * Today's count lives on the home screen's `useBloomLab` while it animates, but
 * that hook is per-screen and forgets everything on unmount; the stats heatmap
 * and, later, the leaderboard need a durable per-day record that outlives any one
 * screen. So the committed count is mirrored here on every sync (`record`), keyed
 * by calendar day, and persisted to MMKV. This is the store the handoff asked for
 * before the stats/leaderboard screens — the animation engine stays in
 * `useBloomLab`, only the numbers settle here.
 *
 * `history` includes today: `record` writes today's key, so the heatmap's last
 * cell tracks live syncs. Days are keyed in LOCAL time (see `dayKey`).
 */

const HISTORY_KEY = 'garden.day.history';

/** How many past weeks the demo seed fills, matching the heatmap window. */
const SEED_WEEKS = 16;

export type DayHistory = Record<string, number>;

type DayHistoryState = {
  history: DayHistory;
  /** Mirror today's committed total into the history. Persists. */
  record: (steps: number) => void;
  /** Load MMKV; on an empty store, seed demo data so the heatmap reads real. */
  hydrate: () => void;
  /** Dev only — wipe the history (and reseed on next hydrate). */
  clear: () => void;
};

/**
 * `YYYY-MM-DD` from a date's LOCAL components — not `toISOString()`, which is UTC
 * and would file an evening step count under tomorrow east of Greenwich. No
 * `Intl`, to stay worklet-safe if this is ever needed on the UI thread.
 */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** A date `days` before `from` (local midnight arithmetic, DST-safe enough here). */
function daysAgo(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * A plausible history for the last SEED_WEEKS, PAST DAYS ONLY.
 *
 * A mock, like `profile.ts` — there is no real step source yet (the sync is
 * faked), so the heatmap would otherwise be one lonely cell. Today is left out on
 * purpose: its cell reflects the real committed count (0 until the first sync),
 * so the calendar never disagrees with the home ring. Delete this the day a real
 * Health source lands.
 */
function seedDemoHistory(): DayHistory {
  const today = new Date();
  const history: DayHistory = {};

  for (let i = SEED_WEEKS * 7; i >= 1; i -= 1) {
    const date = daysAgo(today, i);
    const weekend = date.getDay() === 0 || date.getDay() === 6;

    // ~1 day in 7 is a rest day at zero — the gaps are what make a streak mean
    // something.
    if (Math.random() < 0.14) {
      history[dayKey(date)] = 0;
      continue;
    }

    // A weekday base around 7-9k, weekends lighter and streakier; an occasional
    // banner day pushes into the top tier.
    const base = weekend ? 3500 : 6500;
    const spread = weekend ? 6000 : 5000;
    let steps = base + Math.random() * spread;
    if (Math.random() < 0.08)
      steps = 15000 + Math.random() * 4500;

    history[dayKey(date)] = Math.round(clamp(steps, 0, MAX_STEPS));
  }

  return history;
}

const _useDayHistory = create<DayHistoryState>((set, get) => ({
  history: {},

  record: (steps) => {
    const value = Math.round(clamp(steps, 0, MAX_STEPS));
    const next = { ...get().history, [dayKey(new Date())]: value };
    set({ history: next });
    setItem(HISTORY_KEY, next);
  },

  hydrate: () => {
    const stored = getItem<DayHistory>(HISTORY_KEY);
    if (stored && Object.keys(stored).length > 0) {
      set({ history: stored });
      return;
    }
    const seeded = seedDemoHistory();
    set({ history: seeded });
    setItem(HISTORY_KEY, seeded);
  },

  clear: () => {
    set({ history: {} });
    setItem(HISTORY_KEY, {});
  },
}));

export const useDayHistory = createSelectors(_useDayHistory);

export function recordDaySteps(steps: number) {
  return _useDayHistory.getState().record(steps);
}
export const hydrateDayHistory = () => _useDayHistory.getState().hydrate();
export const clearDayHistory = () => _useDayHistory.getState().clear();
