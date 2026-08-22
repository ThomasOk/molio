import type { DayProgress, ProgressVariant } from './types';

/**
 * Progression tiers, straight from the Claude Design system sheet.
 *
 * `-1` is "no data" and is not a step on the ramp — it renders as an empty
 * outline (Refined Grid) or a bare dot (Living Cells). `0` is a measured day
 * with no steps, which is a real, visible state.
 */
export type ProgressTier = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Human-readable tier names, used for accessibility copy. */
export const TIER_LABELS: Record<ProgressTier, string> = {
  '-1': 'No data',
  '0': 'Inactive',
  '1': 'Very low',
  '2': 'Low',
  '3': 'Good',
  '4': 'Almost',
  '5': 'Goal',
  '6': 'Strong',
  '7': 'Exceptional',
};

export function tierForPercentage(percentage: number | null): ProgressTier {
  if (percentage === null)
    return -1;
  if (percentage <= 0)
    return 0;
  if (percentage < 25)
    return 1;
  if (percentage < 50)
    return 2;
  if (percentage < 75)
    return 3;
  if (percentage < 100)
    return 4;
  if (percentage < 120)
    return 5;
  if (percentage < 180)
    return 6;
  return 7;
}

export function tierForDay(day: DayProgress): ProgressTier {
  return tierForPercentage(day.hasData ? day.progressPercentage : null);
}

/**
 * How much of the cell box each tier fills, indexed by tier.
 *
 * Refined Grid barely shrinks — the square stays a square and the ramp carries
 * the meaning. Living Cells uses scale as its primary signal, which is why the
 * two look so different from the same data.
 */
export const TIER_SCALE: Record<ProgressVariant, readonly number[]> = {
  'refined-grid': [0.78, 0.84, 0.89, 0.94, 0.97, 1, 1, 1],
  'living-cells': [0.3, 0.42, 0.56, 0.68, 0.8, 0.9, 0.97, 1.02],
};

/** Tiers at or above this glow. Below it, cells are flat. */
export const GLOW_FROM_TIER = 5;
