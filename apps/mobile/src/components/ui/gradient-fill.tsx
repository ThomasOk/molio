import * as React from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const NON_ID_CHARS = /[^a-z0-9]/gi;

type Props = {
  from: string;
  to: string;
  /** `vertical` runs bottom-to-top, matching the design's `to top` fills. */
  direction?: 'vertical' | 'horizontal';
};

/**
 * A two-stop gradient that fills its parent.
 *
 * React Native has no gradient background, and `experimental_backgroundImage`
 * is still experimental, so this leans on react-native-svg — already a
 * dependency — rather than pulling in expo-linear-gradient.
 *
 * Give the parent a size and `overflow: 'hidden'`; this paints inside it.
 */
export function GradientFill({ from, to, direction = 'vertical' }: Props) {
  // SVG ids are document-scoped, so two gradients on one screen would collide.
  const id = `g${React.useId().replace(NON_ID_CHARS, '')}`;
  const coords
    = direction === 'vertical'
      ? { x1: '0', y1: '1', x2: '0', y2: '0' }
      : { x1: '0', y1: '0', x2: '1', y2: '0' };

  return (
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} {...coords}>
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
