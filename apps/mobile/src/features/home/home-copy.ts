import type { ProgressSummary } from '@/features/progress';

/**
 * Home's copy, in one place.
 *
 * The product's whole emotional loop is "I don't want to leave today empty",
 * so the line under the gauge is written to name what is left rather than to
 * congratulate or nag. It moves to the i18n catalogue once the copy is final.
 */

export type HomeMessage = {
  text: string;
  /** Goal met — the design switches this line to the accent colour. */
  isCelebration: boolean;
};

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

/** Groups thousands without depending on Intl being present. */
export function formatNumber(value: number): string {
  return Math.round(value).toString().replace(THOUSANDS, ',');
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

/** "SAT 22 AUG", as in the design. */
export function formatHeaderDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function homeMessage(summary: ProgressSummary): HomeMessage {
  const { today, streak, recentDays } = summary;
  const remaining = Math.max(0, today.dailyGoal - today.steps);
  const hasHistory = recentDays.some(day => day.hasData && !day.isToday);

  if (today.goalCompleted) {
    return {
      text:
        streak > 1
          ? `Goal complete. ${streak} days strong.`
          : 'Goal complete. That is one cell filled.',
      isCelebration: true,
    };
  }

  if (today.steps === 0) {
    return {
      text: hasHistory
        ? 'Today is still empty. A short walk fixes that.'
        : 'Your year starts today.',
      isCelebration: false,
    };
  }

  if (remaining <= 1200) {
    return {
      text: `${formatNumber(remaining)} steps to go. A short walk would complete today.`,
      isCelebration: false,
    };
  }

  if (today.progressPercentage >= 50)
    return { text: 'Past halfway. Keep the day going.', isCelebration: false };

  return { text: 'Nice start. A walk after lunch would do it.', isCelebration: false };
}
