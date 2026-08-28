import * as React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * A bold exclamation mark for the unseen-level-up badge — a stem and a dot drawn
 * as solid shapes rather than a font glyph, so it stays crisp and heavy at the
 * badge's tiny size where a typeface "!" reads thin and easy to miss.
 *
 * The stem is tall and tapers to a rounded point, sitting well clear above a
 * separate round dot, so the two never read as one stubby bar.
 */
export function AlertMark({ size = 12, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path
        d="M4.9 3.05Q4.9 1.95 6 1.95 7.1 1.95 7.1 3.05L6.62 6.55Q6.55 7.25 6 7.25 5.45 7.25 5.38 6.55Z"
        fill={color}
      />
      <Circle cx={6} cy={9.35} r={1.25} fill={color} />
    </Svg>
  );
}
