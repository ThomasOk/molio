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

// `.v2` retires the old 16-week demo seed so the fuller full-year mock takes its
// place on next launch. Safe to bump while the data is still a mock — there is no
// real step source yet. Drop the suffix once a real Health source lands.
const HISTORY_KEY = 'garden.day.history.v2';

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

/**
 * A plausible history for the whole current year so far, PAST DAYS ONLY.
 *
 * A mock, like `profile.ts` — there is no real step source yet (the sync is
 * faked), so the year heatmap would otherwise be one lonely cell. It fills from
 * January 1st up to yesterday; today is left out on purpose: its cell reflects
 * the real committed count (0 until the first sync), so the calendar never
 * disagrees with the home ring. Delete this the day a real Health source lands.
 */
function seedDemoHistory(): DayHistory {
  const today = new Date();
  const todayKey = dayKey(today);
  const history: DayHistory = {};

  // Walk each day from Jan 1st, stopping the moment we reach today.
  const cursor = new Date(today.getFullYear(), 0, 1);
  while (dayKey(cursor) !== todayKey) {
    const weekend = cursor.getDay() === 0 || cursor.getDay() === 6;

    // ~1 day in 7 is a rest day at zero — the gaps are what make a streak mean
    // something.
    if (Math.random() < 0.14) {
      history[dayKey(cursor)] = 0;
    }
    else {
      // A weekday base around 7-9k, weekends lighter and streakier; an occasional
      // banner day pushes into the top tier.
      const base = weekend ? 3500 : 6500;
      const spread = weekend ? 6000 : 5000;
      let steps = base + Math.random() * spread;
      if (Math.random() < 0.08)
        steps = 15000 + Math.random() * 4500;

      history[dayKey(cursor)] = Math.round(clamp(steps, 0, MAX_STEPS));
    }

    cursor.setDate(cursor.getDate() + 1);
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

/**
 * Today's committed steps, read straight from MMKV.
 *
 * Lets `useBloomLab` restore the day's count on mount so an app restart doesn't
 * drop it back to 0 — which, with the persisted "last seen level", would leave
 * the day sitting below what the user already saw and wrongly mute the
 * unseen-level-up badge. Reads storage directly so it doesn't depend on the store
 * being hydrated yet.
 */
export function getTodaySteps(): number {
  const stored = getItem<DayHistory>(HISTORY_KEY);
  return stored?.[dayKey(new Date())] ?? 0;
}

export function recordDaySteps(steps: number) {
  return _useDayHistory.getState().record(steps);
}
export const hydrateDayHistory = () => _useDayHistory.getState().hydrate();
export const clearDayHistory = () => _useDayHistory.getState().clear();
