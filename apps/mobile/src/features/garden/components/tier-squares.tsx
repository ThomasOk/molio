import type { GardenPalette } from '../palette';
import * as React from 'react';
import { View } from 'react-native';

/**
 * A grid of tier-coloured squares — the shared visual brick of the activity
 * language. The stats heatmap is one of these (16 week-columns × 7 day-rows);
 * the leaderboard trend will be another (one row). It knows nothing about dates
 * or steps: hand it tier indices and it paints them from `palette.tiers`.
 *
 * `tiers` is read COLUMN-MAJOR — index `c * rows + r` is column c, row r — so a
 * caller that thinks in weeks (a column per week, days down each) fills it in the
 * order it reads. `rows` derives from the length unless pinned. A tier below 0 is
 * an out-of-range cell (e.g. a future day) and paints transparent, holding its
 * place in the grid.
 */
export function TierSquares({
  tiers,
  columns,
  size,
  gap,
  radius,
  palette,
  rows: fixedRows,
}: {
  tiers: number[];
  columns: number;
  size: number;
  gap: number;
  radius: number;
  palette: GardenPalette;
  rows?: number;
}) {
  const rows = fixedRows ?? Math.ceil(tiers.length / columns);

  return (
    <View style={{ flexDirection: 'row', gap }}>
      {Array.from({ length: columns }, (_, c) => (
        <View key={c} style={{ gap }}>
          {Array.from({ length: rows }, (_, r) => {
            const tier = tiers[c * rows + r];
            const color
              = tier == null || tier < 0
                ? 'transparent'
                : palette.tiers[Math.min(tier, palette.tiers.length - 1)];
            return (
              <View
                key={r}
                style={{
                  width: size,
                  height: size,
                  borderRadius: radius,
                  backgroundColor: color,
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
