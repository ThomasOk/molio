import type { ProgressTier } from '../tiers';
import type { DayProgress, ProgressVariant } from '../types';
import { MotiView } from 'moti';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { useStrideTheme } from '@/lib/theme';
import { dayCellVisual } from '../cell-visual';
import { TIER_LABELS, tierForDay } from '../tiers';
import { DEFAULT_PROGRESS_VARIANT } from '../types';

export type DayCellProps = {
  day: DayProgress;
  /** Edge of the cell's box, in px. The shape inside scales with the tier. */
  size: number;
  variant?: ProgressVariant;
  onPress?: (day: DayProgress) => void;
};

/**
 * One day, in whichever visualisation is active.
 *
 * Nothing outside this module knows whether a day is drawn as a square or a
 * circle — that is the whole point of the variant prop.
 */
export function DayCell({
  day,
  size,
  variant = DEFAULT_PROGRESS_VARIANT,
  onPress,
}: DayCellProps) {
  const theme = useStrideTheme();
  const tier = tierForDay(day);
  const visual = React.useMemo(
    () =>
      dayCellVisual({
        variant,
        tier,
        size,
        theme,
        isToday: day.isToday,
        isSelected: day.isSelected,
        percentage: day.progressPercentage,
      }),
    [variant, tier, size, theme, day.isToday, day.isSelected, day.progressPercentage],
  );

  const shape = (
    <View style={visual.inner}>
      {visual.todayFillColor !== null && (
        <View
          style={{
            height: `${visual.todayFillRatio * 100}%`,
            backgroundColor: visual.todayFillColor,
          }}
        />
      )}
      {visual.coreHighlight !== null && <View style={visual.coreHighlight} />}
    </View>
  );

  // Living Cells marks today with a slow pulse; Refined Grid stays still.
  const body
    = day.isToday && variant === 'living-cells'
      ? (
          <MotiView
            from={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0.55, scale: 1.06 }}
            transition={{ type: 'timing', duration: 1300, loop: true, repeatReverse: true }}
          >
            {shape}
          </MotiView>
        )
      : shape;

  // A grid of hundreds of individually-announced cells is unusable with a
  // screen reader, so static cells are decorative and the enclosing
  // ProgressMap carries a summary instead.
  if (!onPress) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={visual.box}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dayAccessibilityLabel(day, tier)}
      accessibilityState={{ selected: day.isSelected }}
      hitSlop={Math.max(0, Math.round((44 - size) / 2))}
      onPress={() => onPress(day)}
      style={visual.box}
    >
      {body}
    </Pressable>
  );
}

/**
 * Today and selected are conveyed by a ring in the design, but a screen reader
 * gets neither the ring nor the colour, so both are spelled out here.
 */
export function dayAccessibilityLabel(day: DayProgress, tier: ProgressTier): string {
  const parts = [day.isToday ? 'Today' : day.date];

  if (!day.hasData) {
    parts.push('no data');
  }
  else {
    parts.push(`${day.steps.toLocaleString()} steps`);
    parts.push(`${Math.round(day.progressPercentage)}% of goal`);
    parts.push(TIER_LABELS[tier]);
  }

  if (day.isSelected)
    parts.push('selected');

  return parts.join(', ');
}
