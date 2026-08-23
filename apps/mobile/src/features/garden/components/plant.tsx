import type { SharedValue } from 'react-native-reanimated';
import type { AbundanceFlower, Detail, Plant } from '../flora';
import type { GardenPalette, Hue, HueColors } from '../palette';
import * as React from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { smoothstep } from '../bloom';
import { fadeForDepth, shiftHue } from '../palette';
import {
  FlowerHead,
  HEAD_ANCHOR,
  HEAD_SIZE,
  HEAD_VIEWBOX,
  PlantStem,
  STEM_VIEWBOX,
} from './species';

const TAU = Math.PI * 2;

/** Flower-head box size per depth layer, as a fraction of the scene height. */
const HEAD_BASE = [0.056, 0.084, 0.115, 0.155] as const;

/** How far off the bottom edge each depth layer plants its feet. */
const BASELINE = [0.09, 0.055, 0.025, 0] as const;

/**
 * Every colour a flower and its stem need, faded for depth and shifted off the
 * species colour. Pulled out so a base plant and an abundance flower tint the
 * same way — a daisy is a daisy whichever regime drew it.
 */
export function plantColors(
  palette: GardenPalette,
  source: { hue: Hue; hueShift: number; depth: number },
) {
  const { hue, hueShift, depth } = source;
  const h = palette.hues[hue];
  const tint = (value: string) =>
    fadeForDepth(shiftHue(value, hueShift), depth, palette);

  return {
    petal: tint(h.petal),
    edge: tint(h.edge),
    center: tint(h.center),
    core: tint(h.core),
    stem: fadeForDepth(shiftHue(palette.stem, hueShift * 0.85), depth, palette),
    leaf: fadeForDepth(shiftHue(palette.leaf, hueShift * 0.6), depth, palette),
    bud: fadeForDepth(palette.bud, depth, palette),
  };
}

/**
 * Everything about a plant's size and where its parts sit.
 *
 * Pure and pulled out of the component so the two interesting decisions stay
 * visible: the flower's size does not come from the stem's height, and the stem
 * and leaves are sized in points then converted back into viewBox units — a
 * stem four times taller must not be four times thicker.
 */
function plantGeometry(plant: Plant, sceneHeight: number) {
  const height = plant.height * sceneHeight;
  const width = (height * STEM_VIEWBOX.width) / STEM_VIEWBOX.height;
  const unitsPerPoint = STEM_VIEWBOX.width / width;

  return {
    width,
    height,
    headSize:
      HEAD_BASE[plant.depth]
      * sceneHeight
      * (HEAD_SIZE[plant.species] / 40)
      * plant.headScale,
    stemHalf: (0.7 + plant.height * 1.05) * unitsPerPoint,
    leafLength: (11 + plant.height * 22) * unitsPerPoint,
    tipX: ((30 + plant.bend) / STEM_VIEWBOX.width) * width,
    tipY: (17 / STEM_VIEWBOX.height) * height,
  };
}

type Props = {
  plant: Plant;
  /** The garden's single driver, 0 → 1. */
  bloom: SharedValue<number>;
  /**
   * Shared sway clock, or `null` to stand still.
   *
   * `null` rather than an amplitude of zero on purpose: a null is not a shared
   * value, so Reanimated never subscribes this style to it and the worklet
   * stops running every frame entirely.
   */
  clock: SharedValue<number> | null;
  palette: GardenPalette;
  sceneWidth: number;
  sceneHeight: number;
};

export const PlantView = React.memo(({
  plant,
  bloom,
  clock,
  palette,
  sceneWidth,
  sceneHeight,
}: Props) => {
  const box = plantGeometry(plant, sceneHeight);

  const colors = React.useMemo(
    () => plantColors(palette, plant),
    [plant, palette],
  );

  const stalkStyle = useAnimatedStyle(() => {
    const b = bloom.get();
    // The stem finishes rising a little before its flower opens. A bud sitting
    // on a half-grown stalk reads as broken rather than as early.
    const grow = 0.3 + 0.7 * smoothstep(0, plant.threshold + 0.06, b);
    const angle = clock
      ? Math.sin((clock.get() * plant.cycles + plant.phase) * TAU) * plant.swayAmp
      : 0;

    // Applied last-first: scale about the base, then lean about the same point.
    return {
      transform: [
        { rotate: `${angle}deg` },
        { scaleY: grow },
        { scaleX: 0.9 + 0.1 * grow },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: plant.x * sceneWidth - box.width / 2,
          bottom: BASELINE[plant.depth] * sceneHeight + plant.phase * 6,
          width: box.width,
          height: box.height,
          transformOrigin: '50% 100%',
          // A tall plant's head reaches past its own box; without this Android
          // clips it while iOS does not, and the two platforms disagree about
          // where the flowers are.
          overflow: 'visible',
        },
        stalkStyle,
      ]}
    >
      <Svg
        width={box.width}
        height={box.height}
        viewBox={`0 0 ${STEM_VIEWBOX.width} ${STEM_VIEWBOX.height}`}
      >
        <PlantStem
          bend={plant.bend}
          leaves={plant.leaves}
          seed={plant.seed}
          detail={plant.detail}
          stemHalf={box.stemHalf}
          leafLength={box.leafLength}
          stem={colors.stem}
          leaf={colors.leaf}
          leafGradientId={`lf${plant.id}`}
          bud={colors.bud}
          budTip={colors.petal}
        />
      </Svg>

      <OpeningHead
        plant={plant}
        bloom={bloom}
        colors={colors}
        size={box.headSize}
        left={box.tipX - HEAD_ANCHOR.x * box.headSize}
        top={box.tipY - HEAD_ANCHOR.y * box.headSize}
      />
    </Animated.View>
  );
});

function OpeningHead({
  plant,
  bloom,
  colors,
  size,
  left,
  top,
}: {
  plant: Plant;
  bloom: SharedValue<number>;
  colors: HueColors;
  size: number;
  left: number;
  top: number;
}) {
  const headStyle = useAnimatedStyle(() => {
    const t = smoothstep(plant.threshold, plant.threshold + 0.13, bloom.get());
    // 0.34, not the usual 0.95 floor for an entering UI element — this is a bud
    // unfurling into a flower, and the size change is the content of the
    // animation rather than an artefact of it.
    return {
      opacity: t,
      transform: [
        { rotate: `${(1 - t) * plant.openRotate}deg` },
        { scale: 0.34 + 0.66 * t },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
          // Numeric points, not percentages: RN's transform-origin parser
          // chokes on a fractional percentage ("50.0% 39.3%") while accepting
          // a whole one, and fails at runtime rather than at build time.
          transformOrigin: [HEAD_ANCHOR.x * size, HEAD_ANCHOR.y * size, 0],
        },
        headStyle,
      ]}
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${HEAD_VIEWBOX} ${HEAD_VIEWBOX}`}
      >
        <FlowerHead
          species={plant.species}
          colors={colors}
          seed={plant.seed}
          detail={plant.detail}
          satellites={plant.satellites}
          gradientId={`pt${plant.id}`}
        />
      </Svg>
    </Animated.View>
  );
}

/**
 * Abundance head size per depth layer. The front (depth 3) ones are the big
 * foreground blooms of the reference — larger than the base plants, since they
 * are the celebration of the top paliers, not filler.
 */
const ABUNDANCE_HEAD_BASE = [0.055, 0.08, 0.118, 0.162] as const;

/**
 * One already-open flower of the density regime.
 *
 * No stem, no unfurl, and no motion once it is out: it fades and scales in where
 * it stands as `abundance` crosses its threshold, then sits still. That is the
 * whole difference from a base plant — this flower was never a bud, it is the
 * meadow simply becoming thicker past the bloom palier. The opacity worklet runs
 * only while abundance is changing, so a filled meadow costs nothing to hold.
 */
export const AbundanceBloom = React.memo(({
  flower,
  abundance,
  palette,
  sceneWidth,
  sceneHeight,
}: {
  flower: AbundanceFlower;
  /** The density driver, 0 → 1. */
  abundance: SharedValue<number>;
  palette: GardenPalette;
  sceneWidth: number;
  sceneHeight: number;
}) => {
  const detail: Detail = flower.depth >= 2 ? 'full' : 'simple';
  const depth = flower.depth;

  const size
    = ABUNDANCE_HEAD_BASE[depth]
      * sceneHeight
      * (HEAD_SIZE[flower.species] / 40)
      * flower.headScale;

  const colors = React.useMemo(
    () => plantColors(palette, flower),
    [palette, flower],
  );

  const style = useAnimatedStyle(() => {
    const t = smoothstep(flower.threshold, flower.threshold + 0.12, abundance.get());
    return {
      opacity: t,
      // Settles down a few points as it appears — never scales from nothing, so
      // it reads as a flower resolving out of the green, not a pop.
      transform: [
        { translateY: (1 - t) * 5 },
        { scale: 0.6 + 0.4 * t },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: flower.x * sceneWidth - size / 2,
          bottom: flower.y * sceneHeight - size / 2,
          width: size,
          height: size,
          overflow: 'visible',
        },
        style,
      ]}
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${HEAD_VIEWBOX} ${HEAD_VIEWBOX}`}
      >
        <FlowerHead
          species={flower.species}
          colors={colors}
          seed={flower.seed}
          detail={detail}
          satellites={[]}
          gradientId={`ab${flower.id}`}
        />
      </Svg>
    </Animated.View>
  );
});
