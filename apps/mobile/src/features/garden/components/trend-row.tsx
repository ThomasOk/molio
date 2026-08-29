import type { GardenPalette } from '../palette';
import * as React from 'react';
import { View } from 'react-native';

/**
 * The square a lived day paints, and the gap between two of them. Seven days
 * come to 7 × 13 + 6 × 4 = 115 pt, which is what the row leaves the name.
 */
const CELL = 13;
const GAP = 4;
/** What a day at zero shrinks to. */
const DOT = 5;

/**
 * A week of days as a row of tier squares — the leaderboard's trend.
 *
 * Deliberately NOT `TierSquares`, which the heatmap uses, because of one rule
 * this row needs and 364 heatmap cells must not pay for: a day at zero
 * RETRACTS TO A DOT instead of painting a full square.
 *
 * The reason is the paper. Tier 0 is `#E7E1D2`, a hair off the cream, so at this
 * size a full empty square reads as a hole in the row rather than as a quiet
 * day. Shrinking it makes the gap deliberate. Two sizes only — never five: the
 * colour already carries how big the day was, so size is left to say the one
 * thing colour cannot say here, which is whether the day happened at all.
 */
export function TrendRow({
  tiers,
  palette,
}: {
  tiers: number[];
  palette: GardenPalette;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: GAP }}>
      {/* Built by position, like TierSquares: a day's index in the week IS its
          identity, and there is no id to key on. */}
      {Array.from({ length: tiers.length }, (_, index) => {
        const tier = tiers[index];
        const empty = tier <= 0;
        const size = empty ? DOT : CELL;
        return (
          <View
            key={index}
            style={{
              width: CELL,
              height: CELL,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: empty ? size / 2 : 3,
                backgroundColor: palette.tiers[Math.min(Math.max(tier, 0), palette.tiers.length - 1)],
              }}
            />
          </View>
        );
      })}
    </View>
  );
}
