/**
 * The shared progress model.
 *
 * This is the only shape the UI knows about. Apple Health / Health Connect will
 * arrive later behind a service layer that maps their records into `DayProgress`
 * — no screen or visualisation may reference a native health type directly.
 */

/**
 * Which progress visualisation is rendered.
 *
 * `refined-grid` is the active variant. `living-cells` is the alternative kept
 * warm for experimentation; both consume identical `DayProgress` data, so
 * switching is a prop change, never a layout or business-logic change.
 */
export type ProgressVariant = 'refined-grid' | 'living-cells';

export const DEFAULT_PROGRESS_VARIANT: ProgressVariant = 'refined-grid';

export type DayProgress = {
  /** Calendar day, ISO `YYYY-MM-DD`, in the user's local timezone. */
  date: string;
  steps: number;
  dailyGoal: number;
  /**
   * `steps / dailyGoal * 100`, deliberately uncapped: the design gives 120%+
   * and 180%+ days their own treatment, so clamping here would erase them.
   */
  progressPercentage: number;
  goalCompleted: boolean;
  isToday: boolean;
  isSelected: boolean;
  xp: number;
  /** Kilometres walked. Optional — not every source provides distance. */
  distance?: number;
  /**
   * Whether the day has any measurement at all. A future day, or a day before
   * the user installed Stride, renders as an empty outline rather than as a
   * zero-step day — the design treats those as visually distinct states.
   */
  hasData: boolean;
};

/** Everything Home needs about the user's current standing. */
export type ProgressSummary = {
  today: DayProgress;
  /** Consecutive days, ending today, where the goal was met. */
  streak: number;
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
  xpToday: number;
  /** Most recent days, oldest first — the mini map's window. */
  recentDays: DayProgress[];
};

/** Builds a `DayProgress` from raw numbers, deriving everything derivable. */
export function createDayProgress(
  input: Omit<
    DayProgress,
    'progressPercentage' | 'goalCompleted' | 'isToday' | 'isSelected' | 'hasData'
  > & Partial<Pick<DayProgress, 'isToday' | 'isSelected' | 'hasData'>>,
): DayProgress {
  const { steps, dailyGoal } = input;
  const progressPercentage = dailyGoal > 0 ? (steps / dailyGoal) * 100 : 0;

  return {
    ...input,
    progressPercentage,
    goalCompleted: progressPercentage >= 100,
    isToday: input.isToday ?? false,
    isSelected: input.isSelected ?? false,
    hasData: input.hasData ?? true,
  };
}
