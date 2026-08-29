import type { DayHistory } from '../use-day-history';
import { tierForDay } from '../bloom';
import { startOfDay, startOfMonth } from '../calendar';
import { dayKey } from '../use-day-history';

/**
 * Four tiles a row — a home-screen grid, not a calendar.
 *
 * The month zoom deliberately drops the weekday alignment: seven narrow columns
 * make small cells and a lot of padding days, and neither earns its place when
 * what you came to see is the colour of each day up close.
 */
export const COLS = 4;

export type DayCell = {
  key: string;
  date: Date;
  steps: number;
  /** Tier colour index, or -1 for a day still to come (drawn as an outline). */
  tier: number;
  /** Day number, shown under the tile. */
  label: string;
  /** An already-lived day — the only kind that opens. */
  selectable: boolean;
  future: boolean;
  today: boolean;
};

/**
 * The days of one month, in order, four to a row.
 *
 * No padding days: the grid runs from the 1st to the last, so the last row is
 * simply short. Index `row * COLS + col` is the day, which is also how the tap
 * handler reads a touch point.
 */
export function buildMonthCells(
  history: DayHistory,
  month: Date,
  today: Date,
): { cells: DayCell[]; rows: number } {
  const first = startOfMonth(month);
  const todayMs = startOfDay(today).getTime();
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();

  const cells = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(first.getFullYear(), first.getMonth(), index + 1);
    const dayMs = date.getTime();
    const future = dayMs > todayMs;
    const steps = history[dayKey(date)] ?? 0;

    return {
      key: dayKey(date),
      date,
      steps,
      tier: future ? -1 : tierForDay(steps),
      label: String(index + 1),
      selectable: !future,
      future,
      today: dayMs === todayMs,
    };
  });

  return { cells, rows: Math.ceil(daysInMonth / COLS) };
}
