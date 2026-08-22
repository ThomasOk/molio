import type { DayProgress, ProgressVariant } from '../types';
import { View } from 'react-native';

import { GradientFill } from '@/components/ui/gradient-fill';
import { StrideText } from '@/components/ui/stride-text';
import { useStrideTheme } from '@/lib/theme';
import { DEFAULT_PROGRESS_VARIANT } from '../types';

/** The design derives the gauge from the grid: 25 cells, each 1/25th of goal. */
export const GAUGE_SEGMENTS = 25;

const CELL_SIZE = 96;

type Props = {
  day: DayProgress;
  variant?: ProgressVariant;
};

/**
 * Today's progress as an oversized day cell, filled bottom-up.
 *
 * This is the link between the hero number and the Progress Map: it is the same
 * cell the day will occupy in the year, just large enough to read a percentage
 * inside. Like every other cell it follows the active variant — a rounded
 * square under Refined Grid, a disc under Living Cells.
 */
export function TodayCell({ day, variant = DEFAULT_PROGRESS_VARIANT }: Props) {
  const { colors, isDark } = useStrideTheme();
  const percentage = Math.max(0, day.progressPercentage);
  const done = percentage >= 100;

  const [from, to] = done
    ? [colors.gaugeDoneFrom, colors.gaugeDoneTo]
    : [colors.gaugeFrom, colors.gaugeTo];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderRadius: variant === 'living-cells' ? CELL_SIZE / 2 : 20,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.ring,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        ...(done && isDark && {
          boxShadow: [
            { offsetX: 0, offsetY: 0, blurRadius: 34, color: 'rgba(183,240,90,0.28)' },
          ],
        }),
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: `${Math.min(100, percentage)}%`,
        }}
      >
        <GradientFill from={from} to={to} />
      </View>

      <StrideText
        variant="mono"
        className="w-full pb-[10px] text-center font-stride-mono-medium"
        style={{
          // The label sits on the fill once it has climbed past it.
          color: percentage > 22 ? colors.onAccent : colors.textSecondary,
        }}
      >
        {`${Math.round(percentage)}%`}
      </StrideText>
    </View>
  );
}

/**
 * The 25-segment bar under the hero number.
 *
 * Each segment is one twenty-fifth of the daily goal, so the bar reads as
 * "cells earned today" rather than as a generic progress bar. Once the goal is
 * met every segment switches to the goal fill and lights up.
 */
export function GoalGauge({ day, variant = DEFAULT_PROGRESS_VARIANT }: Props) {
  const { colors, ramp, isDark } = useStrideTheme();
  const percentage = Math.max(0, day.progressPercentage);
  const filled = (percentage / 100) * GAUGE_SEGMENTS;
  const done = percentage >= 100;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Daily goal progress"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(100, percentage)) }}
      style={{ flexDirection: 'row', gap: 3 }}
    >
      {Array.from({ length: GAUGE_SEGMENTS }, (_, index) => {
        const on = index < Math.floor(filled);
        const partial = !on && index < filled;

        let backgroundColor = colors.inactive;
        if (on)
          backgroundColor = done ? colors.goalFill : colors.primary;
        else if (partial)
          backgroundColor = ramp[2];

        return (
          <View
            key={index}
            style={{
              flex: 1,
              height: 12,
              borderRadius: variant === 'living-cells' ? 99 : 3,
              backgroundColor,
              ...(on && done && isDark && {
                boxShadow: [
                  { offsetX: 0, offsetY: 0, blurRadius: 8, color: 'rgba(183,240,90,0.28)' },
                ],
              }),
            }}
          />
        );
      })}
    </View>
  );
}
