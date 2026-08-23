import type { SharedValue } from 'react-native-reanimated';
import type { GardenPalette } from '../palette';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { smoothstep } from '../bloom';
import { ABUNDANCE_FLOWERS, GARDEN_LAYERS } from '../flora';
import { mixHex } from '../palette';
import { Particles } from './particles';
import { AbundanceBloom, PlantView } from './plant';
import {
  buildGroundCover,
  buildMeadowFoliage,
  GroundPaths,
  mossBand,
} from './species';

type Props = {
  /** The growth driver, 0 → 1. Full at the bloom palier. */
  bloom: SharedValue<number>;
  /** The density driver, 0 → 1. Non-zero only past the bloom palier. */
  abundance: SharedValue<number>;
  /** Shared sway clock, or `null` for a still garden. */
  clock: SharedValue<number> | null;
  palette: GardenPalette;
  width: number;
  height: number;
  /** Lifts the whole scene off the bottom edge, e.g. above a pinned footer. */
  offsetBottom?: number;
};

const BACK_KEYS = new Set(['grass-back', 'leaf-back']);

/** How far up the scene the density-regime leaf bed reaches, fraction of height. */
const FOLIAGE_COVERAGE = 0.42;

/**
 * The garden.
 *
 * Two regimes, stacked back to front:
 *
 *   - the bloom regime — four depth layers of flowering plants that grow and
 *     open, sandwiched between passes of static ground cover;
 *   - the density regime — a bank of broad leaves that fills in behind a
 *     population of already-open flowers, both riding `abundance`. Not a green
 *     fill: layered foliage with the paper showing through, flowers over it.
 *
 * Document order is the only z-index in here. The ground cover is where the
 * base density comes from and it is nearly free: none of it animates, so every
 * shape sharing a paint is folded into a single `<Path>`.
 */
export function GardenScene({
  bloom,
  abundance,
  clock,
  palette,
  width,
  height,
  offsetBottom = 0,
}: Props) {
  const ground = useGardenGround(width, height, palette);

  // One animated view for several hundred extra leaves and blades.
  const lushStyle = useAnimatedStyle(() => ({
    opacity: smoothstep(0.08, 0.62, bloom.get()),
  }));

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        bottom: offsetBottom,
        width,
        height,
      }}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="gardenHaze" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={palette.haze} stopOpacity={0.4} />
            <Stop offset="0.34" stopColor={palette.haze} stopOpacity={0.11} />
            <Stop offset="0.78" stopColor={palette.haze} stopOpacity={0.03} />
            <Stop offset="1" stopColor={palette.haze} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#gardenHaze)" />
        <GroundPaths layers={ground.back} />
      </Svg>

      {/* Undergrowth, behind the flowers. It used to be drawn last and buried
          them — in the reference the foliage is what the blooms sit in front
          of, not what covers them. */}
      <Animated.View style={[StyleSheet.absoluteFill, lushStyle]}>
        <Svg width={width} height={height}>
          <GroundPaths layers={ground.lush} />
        </Svg>
      </Animated.View>

      {GARDEN_LAYERS.map((layer, depth) => (
        // eslint-disable-next-line react/no-array-index-key
        <React.Fragment key={depth}>
          {layer.map(plant => (
            <PlantView
              key={plant.id}
              plant={plant}
              bloom={bloom}
              clock={clock}
              palette={palette}
              sceneWidth={width}
              sceneHeight={height}
            />
          ))}
        </React.Fragment>
      ))}

      {/* Only the very bottom of the band: enough grass crossing the stems to
          root them, never enough to hide a flower. */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={ground.moss} fill={palette.grassFront} opacity={0.38} />
        <GroundPaths layers={ground.front} />
      </Svg>

      <MeadowFoliage
        abundance={abundance}
        width={width}
        height={height}
        layers={ground.foliage}
      />

      <AbundanceField
        abundance={abundance}
        palette={palette}
        width={width}
        height={height}
      />

      <Particles
        bloom={bloom}
        abundance={abundance}
        palette={palette}
        width={width}
        height={height}
      />
    </View>
  );
}

/**
 * The density regime's greenery — a bank of broad leaves.
 *
 * Fades in with abundance as a leafy bed for the abundance flowers to sit in.
 * It is discrete leaves, not a fill, so the cream shows through the gaps at
 * every opacity; the fade only runs while abundance is changing.
 */
function MeadowFoliage({
  abundance,
  width,
  height,
  layers,
}: {
  abundance: SharedValue<number>;
  width: number;
  height: number;
  layers: ReturnType<typeof buildMeadowFoliage>;
}) {
  const style = useAnimatedStyle(() => ({
    // Full by the middle of the range, so 10 000 already has its whole leaf bed
    // and the top paliers only add more flowers on top.
    opacity: smoothstep(0.03, 0.5, abundance.get()),
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={width} height={height}>
        <GroundPaths layers={layers} />
      </Svg>
    </Animated.View>
  );
}

/** The already-open flowers of the density regime, over the leaf bed. */
function AbundanceField({
  abundance,
  palette,
  width,
  height,
}: {
  abundance: SharedValue<number>;
  palette: GardenPalette;
  width: number;
  height: number;
}) {
  return (
    <>
      {ABUNDANCE_FLOWERS.map(flower => (
        <AbundanceBloom
          key={flower.id}
          flower={flower}
          abundance={abundance}
          palette={palette}
          sceneWidth={width}
          sceneHeight={height}
        />
      ))}
    </>
  );
}

/**
 * Builds every static ground path once per theme and size.
 *
 * Split out of the scene purely so each piece stays readable; the work is the
 * same and still happens exactly once.
 */
function useGardenGround(
  width: number,
  height: number,
  palette: GardenPalette,
) {
  return React.useMemo(() => {
    const base = buildGroundCover({
      width,
      height,
      // Sparse on purpose. At 300 steps the ground has to read as a few
      // delicate shoots on near-bare ground, not as a lawn.
      seed: 99173,
      density: 0.42,
      grassBack: palette.grassBack,
      grassMid: mixHex(palette.grassBack, palette.grassFront, 0.55),
      grassFront: palette.grassFront,
      leafBack: mixHex(palette.grassBack, palette.bg, 0.25),
      leafFront: palette.grassFront,
    });

    return {
      back: base.filter(layer => BACK_KEYS.has(layer.key)),
      front: base.filter(layer => !BACK_KEYS.has(layer.key)),
      // Same generator, different seed: the lush pass is extra undergrowth
      // that arrives with the flowers rather than a different kind of plant.
      lush: buildGroundCover({
        width,
        height,
        seed: 41207,
        density: 1.3,
        grassBack: mixHex(palette.grassBack, palette.grassFront, 0.4),
        grassMid: palette.grassFront,
        grassFront: mixHex(palette.grassFront, '#000000', 0.12),
        leafBack: palette.grassFront,
        leafFront: mixHex(palette.grassFront, '#000000', 0.1),
      }),
      moss: mossBand(width, height, 5521),
      // The density-regime leaf bed: broad leaves in three greens, cream
      // showing through, flowers on top. Faded in by abundance.
      foliage: buildMeadowFoliage({
        width,
        height,
        seed: 8821,
        density: 2,
        coverage: FOLIAGE_COVERAGE,
        leafBack: mixHex(palette.grassBack, palette.bg, 0.12),
        leafMid: palette.grassFront,
        leafFront: mixHex(palette.grassFront, '#000000', 0.18),
      }),
    };
  }, [width, height, palette]);
}
