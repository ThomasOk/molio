import type { DayProgress, ProgressVariant } from '../types';
import * as React from 'react';
import { View } from 'react-native';

import { StrideText } from '@/components/ui/stride-text';
import { DEFAULT_PROGRESS_VARIANT } from '../types';
import { DayCell } from './day-cell';

export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export type ProgressMapProps = {
  /** Oldest first. Length need not be a multiple of `columns`. */
  days: DayProgress[];
  variant?: ProgressVariant;
  /** One column per weekday by default. */
  columns?: number;
  cellSize?: number;
  gap?: number;
  /** Pass `null` to drop the weekday header. */
  weekdayLabels?: readonly string[] | null;
  onSelectDay?: (day: DayProgress) => void;
};

/**
 * A range of days, drawn with whichever visualisation variant is active.
 *
 * This is the seam the whole product depends on: screens hand it `DayProgress`
 * and never learn what shape a day is. Swapping `refined-grid` for
 * `living-cells` changes nothing above this component.
 */
export function ProgressMap({
  days,
  variant = DEFAULT_PROGRESS_VARIANT,
  columns = 7,
  cellSize = 26,
  gap = 6,
  weekdayLabels = WEEKDAY_INITIALS,
  onSelectDay,
}: ProgressMapProps) {
  const rows = React.useMemo(() => chunk(days, columns), [days, columns]);

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={mapAccessibilityLabel(days)}
      style={{ gap }}
    >
      {weekdayLabels !== null && (
        <View style={{ flexDirection: 'row', gap }}>
          {weekdayLabels.map((label, index) => (
            <StrideText
              // Weekday initials repeat (S M T W T F S), so position is the
              // only stable identity here.
              // eslint-disable-next-line react/no-array-index-key
              key={`${label}-${index}`}
              variant="label-sm"
              className="flex-1 text-center text-[8.5px] tracking-normal"
            >
              {label}
            </StrideText>
          ))}
        </View>
      )}

      {rows.map(row => (
        <View key={row[0]?.date ?? 'row'} style={{ flexDirection: 'row', gap }}>
          {row.map(day => (
            <View key={day.date} style={{ flex: 1, alignItems: 'center' }}>
              <DayCell
                day={day}
                size={cellSize}
                variant={variant}
                onPress={onSelectDay}
              />
            </View>
          ))}
          {/* Keep a short final row aligned with the ones above it: the
              spacer absorbs both the missing columns and their gaps. */}
          {row.length < columns && (
            <View
              style={{
                flex: columns - row.length,
                marginLeft: gap * (columns - row.length - 1),
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];

  for (let index = 0; index < items.length; index += size)
    out.push(items.slice(index, index + size));

  return out;
}

function mapAccessibilityLabel(days: DayProgress[]): string {
  const measured = days.filter(day => day.hasData);
  const completed = measured.filter(day => day.goalCompleted).length;

  if (measured.length === 0)
    return 'Progress map, no days recorded yet';

  return `Progress map, ${days.length} days, goal met on ${completed} of ${measured.length} recorded days`;
}
