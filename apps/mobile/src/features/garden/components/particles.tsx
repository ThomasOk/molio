import type { SharedValue } from 'react-native-reanimated';
import type { GardenPalette, Hue } from '../palette';
import * as React from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { smoothstep } from '../bloom';

/**
 * Butterflies and drifting petals — static on purpose.
 *
 * They do not move: there is no clock, no per-frame worklet, nothing running
 * once the garden has settled. Each element sits at a fixed spot in the calm
 * cream above the meadow (near the ring, as in the reference) and only fades in
 * as the garden blooms — an `opacity` worklet that recomputes during a sync and
 * is idle the rest of the time. That is the whole point: the celebration is
 * visible without costing a permanently animating screen.
 */

const PETAL_SHAPE = 'M10 1 C 15.4 5, 16.2 13, 10 19 C 3.8 13, 4.6 5, 10 1 Z';

type Driver = 'abundance' | 'bloom';

type StaticPetal = {
  id: string;
  /** Position as a fraction of the scene, from the top-left. */
  x: number;
  y: number;
  size: number;
  rotate: number;
  hue: Hue;
  /** Fade-in edges on `bloom`. */
  appear: [number, number];
};

type StaticButterfly = {
  id: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
  driver: Driver;
  appear: [number, number];
};

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const PETAL_HUES: Hue[] = ['coral', 'white', 'pink', 'cream', 'red'];

// Scattered through the upper cream band, beside and above where the ring sits.
const PETALS: StaticPetal[] = (() => {
  const random = lcg(551337);
  return Array.from({ length: 10 }, (_, i) => ({
    id: `petal-${i}`,
    x: 0.05 + random() * 0.9,
    // Upper 45 % of the scene only — never down in the flowers.
    y: 0.04 + random() * 0.42,
    size: 8 + random() * 6,
    rotate: random() * 360,
    hue: PETAL_HUES[Math.floor(random() * PETAL_HUES.length)],
    // Staggered so they arrive gradually across the back half of the bloom.
    appear: [0.4 + random() * 0.2, 0.7 + random() * 0.2] as [number, number],
  }));
})();

// A few butterflies near the top corners: two with the full bloom, two more as
// the top paliers fill in. All static, all facing a fixed way.
const BUTTERFLIES: StaticButterfly[] = [
  { id: 'b0', x: 0.1, y: 0.08, size: 34, rotate: -12, driver: 'bloom', appear: [0.72, 0.94] },
  { id: 'b1', x: 0.82, y: 0.13, size: 27, rotate: 10, driver: 'bloom', appear: [0.8, 0.98] },
  { id: 'b2', x: 0.5, y: 0.05, size: 30, rotate: 4, driver: 'abundance', appear: [0.2, 0.55] },
  { id: 'b3', x: 0.88, y: 0.32, size: 23, rotate: 18, driver: 'abundance', appear: [0.55, 0.85] },
];

type Props = {
  bloom: SharedValue<number>;
  /** The density driver — brings in the abundance-regime butterflies. */
  abundance: SharedValue<number>;
  palette: GardenPalette;
  width: number;
  height: number;
};

export function Particles({ bloom, abundance, palette, width, height }: Props) {
  return (
    <>
      {PETALS.map(petal => (
        <StaticPetalView
          key={petal.id}
          petal={petal}
          bloom={bloom}
          palette={palette}
          width={width}
          height={height}
        />
      ))}
      {BUTTERFLIES.map(butterfly => (
        <StaticButterflyView
          key={butterfly.id}
          butterfly={butterfly}
          bloom={bloom}
          abundance={abundance}
          palette={palette}
          width={width}
          height={height}
        />
      ))}
    </>
  );
}

const StaticPetalView = React.memo(({
  petal,
  bloom,
  palette,
  width,
  height,
}: {
  petal: StaticPetal;
  bloom: SharedValue<number>;
  palette: GardenPalette;
  width: number;
  height: number;
}) => {
  const colors = palette.hues[petal.hue];

  const style = useAnimatedStyle(() => ({
    opacity: smoothstep(petal.appear[0], petal.appear[1], bloom.get()) * 0.9,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: petal.x * width,
          top: petal.y * height,
          width: petal.size,
          height: petal.size,
          transform: [{ rotate: `${petal.rotate}deg` }],
        },
        style,
      ]}
    >
      <Svg width={petal.size} height={petal.size} viewBox="0 0 20 20">
        <Path
          d={PETAL_SHAPE}
          fill={colors.petal}
          stroke={colors.edge}
          strokeWidth={0.6}
        />
      </Svg>
    </Animated.View>
  );
});

const StaticButterflyView = React.memo(({
  butterfly,
  bloom,
  abundance,
  palette,
  width,
  height,
}: {
  butterfly: StaticButterfly;
  bloom: SharedValue<number>;
  abundance: SharedValue<number>;
  palette: GardenPalette;
  width: number;
  height: number;
}) => {
  const size = butterfly.size;

  const style = useAnimatedStyle(() => {
    const driver
      = butterfly.driver === 'bloom' ? bloom.get() : abundance.get();
    return {
      opacity: smoothstep(butterfly.appear[0], butterfly.appear[1], driver),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: butterfly.x * width,
          top: butterfly.y * height,
          width: size,
          height: size,
          transform: [{ rotate: `${butterfly.rotate}deg` }],
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 20">
        <Path d="M12 10 C 8 2, 1 2, 2 8 C 2.5 12, 8 12, 12 10 Z" fill={palette.butterflyWarm} />
        <Path d="M12 10 C 16 2, 23 2, 22 8 C 21.5 12, 16 12, 12 10 Z" fill={palette.butterflyWarm} />
        <Path d="M12 10 C 9 14.5, 4 16, 4 12.5 C 4 10.4, 9 10, 12 10 Z" fill={palette.butterflyCool} />
        <Path d="M12 10 C 15 14.5, 20 16, 20 12.5 C 20 10.4, 15 10, 12 10 Z" fill={palette.butterflyCool} />
        <Ellipse cx={12} cy={10} rx={0.9} ry={4.6} fill={palette.ink} />
      </Svg>
    </Animated.View>
  );
});
