import type { GardenPalette } from '../palette';
import * as React from 'react';
import Svg, { Rect } from 'react-native-svg';

/**
 * The three steps in a 24×24 box: x, height, and which tier paints it.
 *
 * Second place on the left, first in the middle, third on the right — a real
 * podium's arrangement, which is what stops three bars from reading as a chart.
 *
 * The colours climb the tier ramp to its CORAL crown for first place, the same
 * ramp and the same crown the heatmap gives the best day of the year: the two
 * screens reward the top of a scale with one colour. It also keeps every step
 * legible on cream — the palest tier would have gone half-missing on the
 * button's face, and a podium with a step you cannot see is a broken podium.
 */
const STEPS = [
  { x: 0.5, height: 11, tier: 3 },
  { x: 8.5, height: 18, tier: 4 },
  { x: 16.5, height: 7, tier: 2 },
] as const;

const STEP_W = 7;
/** The floor all three stand on — nothing is drawn there, they just line up. */
const BASE = 22;

/**
 * A podium — the leaderboard in miniature, for the button that opens it.
 *
 * Flat-topped blocks with a slight corner softening, not capsules: a podium is
 * a thing you stand on, and rounded tops read as a bar chart with pill ends.
 */
export function PodiumMark({
  size = 24,
  palette,
}: {
  size?: number;
  palette: GardenPalette;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {STEPS.map(step => (
        <Rect
          key={step.x}
          x={step.x}
          y={BASE - step.height}
          width={STEP_W}
          height={step.height}
          rx={1.5}
          fill={palette.tiers[step.tier]}
        />
      ))}
    </Svg>
  );
}
