/**
 * Calendar arithmetic for the activity screens — local time, no `Intl`.
 *
 * Same reasoning as `dayKey`: an ISO/UTC date shifts the day boundary by the
 * timezone offset, and Hermes' `Intl` is not something to lean on for a French
 * month name. Everything here works on local-midnight `Date`s and hard-coded FR
 * names, so the heatmap, the month zoom and the day detail all agree on which
 * day a cell is.
 */

/** Short month names, as the heatmap's column labels read them. */
export const MONTHS_SHORT = [
  'jan',
  'fév',
  'mar',
  'avr',
  'mai',
  'juin',
  'juil',
  'août',
  'sep',
  'oct',
  'nov',
  'déc',
];

/** Full month names, for the month zoom's title and the day detail. */
export const MONTHS_LONG = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** Monday → Sunday, the order every grid in the app reads. */
export const WEEKDAY_LETTERS = [
  { id: 'mon', letter: 'L' },
  { id: 'tue', letter: 'M' },
  { id: 'wed', letter: 'M' },
  { id: 'thu', letter: 'J' },
  { id: 'fri', letter: 'V' },
  { id: 'sat', letter: 'S' },
  { id: 'sun', letter: 'D' },
];

const WEEKDAYS_LONG = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
];

/** A date `days` from `from`, at local midnight arithmetic. */
export function shiftDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

/** Monday-first weekday index: 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** The Monday on or before `date`, at local midnight. */
export function mondayOf(date: Date): Date {
  const m = shiftDays(date, -weekdayIndex(date));
  m.setHours(0, 0, 0, 0);
  return m;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The 1st of `date`'s month, at local midnight — the canonical "a month". */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(month: Date, count: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + count, 1);
}

/** Whole months from `from` to `to` (negative if `to` is earlier). */
export function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12
    + (to.getMonth() - from.getMonth());
}

/** "août 2026" — the month zoom's title. */
export function formatMonthTitle(month: Date): string {
  return `${MONTHS_LONG[month.getMonth()]} ${month.getFullYear()}`;
}

/**
 * "mercredi 12 août" — the leaderboard's subtitle.
 *
 * No year: the board is about today, and a year on it would read as an archive
 * you could page back through, which it is not.
 */
export function formatDayMonth(date: Date): string {
  const day = date.getDate();
  return [
    WEEKDAYS_LONG[weekdayIndex(date)],
    day === 1 ? '1er' : String(day),
    MONTHS_LONG[date.getMonth()],
  ].join(' ');
}

/** "mercredi 12 août 2026" — the day detail's headline. */
export function formatLongDate(date: Date): string {
  const day = date.getDate();
  return [
    WEEKDAYS_LONG[weekdayIndex(date)],
    day === 1 ? '1er' : String(day),
    MONTHS_LONG[date.getMonth()],
    String(date.getFullYear()),
  ].join(' ');
}
