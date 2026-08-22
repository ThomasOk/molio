export type StepSource = 'apple-health' | 'health-connect';

export type DailyActivity = {
  date: string;
  goal: number;
  source: StepSource;
  steps: number;
  syncedAt: string;
  userId: string;
};

export type ProgressLevel = 0 | 1 | 2 | 3 | 4;

export function getProgressLevel(steps: number, goal: number): ProgressLevel {
  if (goal <= 0 || steps <= 0)
    return 0;

  const completion = steps / goal;

  if (completion >= 1)
    return 4;
  if (completion >= 0.75)
    return 3;
  if (completion >= 0.5)
    return 2;

  return 1;
}
