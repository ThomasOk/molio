import type { GardenPalette, Hue } from '../palette';
import * as React from 'react';
import Svg, { Circle, Ellipse, G } from 'react-native-svg';

/** How many petals ring the disc. Eight reads as a daisy without looking mechanical. */
const PETALS = 8;

type Props = {
  hue: Hue;
  size: number;
  palette: GardenPalette;
};

/**
 * A profile flower — the user's avatar, drawn rather than photographed.
 *
 * Vector, not a raster asset: it scales from the 40 px home portrait to the big
 * level-screen one with no blur, recolours per hue for free, and is the same
 * primitive every leaderboard row will use for its own flower. Predefined for
 * now (one hue); later the user picks the species and colour.
 */
export function FlowerAvatar({ hue, size, palette }: Props) {
  const h = palette.hues[hue];
  const c = size / 2;
  const frame = Math.max(1.5, size * 0.04);

  return (
    <Svg width={size} height={size}>
      {/* The portrait disc — a white ground with a hairline frame. */}
      <Circle cx={c} cy={c} r={c - frame / 2} fill={palette.card} stroke={palette.cardBorder} strokeWidth={frame} />

      <G>
        {Array.from({ length: PETALS }, (_, i) => (
          <Ellipse
            key={i}
            cx={c}
            cy={c - size * 0.19}
            rx={size * 0.085}
            ry={size * 0.19}
            fill={h.petal}
            stroke={h.edge}
            strokeWidth={Math.max(0.5, size * 0.006)}
            transform={`rotate(${(360 / PETALS) * i} ${c} ${c})`}
          />
        ))}
      </G>

      <Circle cx={c} cy={c} r={size * 0.135} fill={h.center} />
      <Circle cx={c} cy={c} r={size * 0.07} fill={h.core} />
    </Svg>
  );
}
