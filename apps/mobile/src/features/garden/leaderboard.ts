import type { Hue } from './palette';
import type { DayHistory } from './use-day-history';

import { tierForDay } from './bloom';
import { shiftDays } from './calendar';
import { FRIENDS } from './friends';
import { PROFILE } from './profile';
import { dayKey } from './use-day-history';

/**
 * How many days of trend a row shows.
 *
 * Seven, not the five of the reference: a week is a unit people already hold in
 * their head, and it is the same span the heatmap reads down its seven rows. It
 * still fits — 7 × 13 px + 6 × 4 px = 115 pt of the 350 available.
 */
export const TREND_DAYS = 7;

export type Standing = {
  id: string;
  name: string;
  flower: Hue;
  /** Today's steps — what the ranking sorts on. */
  steps: number;
  /** `TREND_DAYS` tiers, oldest first; the last one is today. */
  tiers: number[];
  isMe: boolean;
};

/**
 * My own last week, read from the real day history.
 *
 * The friends are mocked but I am not: my row shows what the home ring shows, so
 * a sync moves me up the board while you watch. An unrecorded day is 0, the same
 * reading the heatmap gives it.
 */
function myDays(history: DayHistory, today: Date): number[] {
  return Array.from(
    { length: TREND_DAYS },
    (_, i) => history[dayKey(shiftDays(today, i - (TREND_DAYS - 1)))] ?? 0,
  );
}

/**
 * The day's board — me and the mocked friends, richest day first.
 *
 * Ties break on the name rather than being left to the input order: a dozen
 * people on a quiet morning are all on zero, and a board that reshuffles them on
 * every render would be unreadable.
 */
export function buildStandings(history: DayHistory, today: Date): Standing[] {
  const everyone = [
    { id: 'me', name: PROFILE.name, flower: PROFILE.flower, days: myDays(history, today), isMe: true },
    ...FRIENDS.map(friend => ({ ...friend, isMe: false })),
  ];

  return everyone
    .map(({ days, ...who }) => {
      const steps = days[TREND_DAYS - 1] ?? 0;
      return {
        ...who,
        steps,
        tiers: days.map(tierForDay),
      };
    })
    .sort((a, b) => b.steps - a.steps || (a.name < b.name ? -1 : 1));
}
