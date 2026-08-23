import type { Detail, Satellite, SpeciesKey } from '../flora';
import type { HueColors } from '../palette';
import * as React from 'react';
import { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { mixHex, shiftHue } from '../palette';

/**
 * The drawings.
 *
 * Every shape here is static and memoised. Nothing animates, nothing reads a
 * shared value — motion happens one level up on the `Animated.View` wrapping
 * these, where it costs a layer transform instead of an SVG redraw.
 *
 * Three things separate this from the first pass, and they are all about
 * killing the "computed" look:
 *
 *   1. **Petals are jittered.** Angle, length and width all vary per petal,
 *      seeded off the plant. Exact radial symmetry is what made version one
 *      read as a chart of flowers rather than flowers.
 *   2. **Petals are painted with a radial gradient** anchored at the flower's
 *      heart — saturated at the base, pale at the tip. A flat fill is the other
 *      half of the "computed" tell, and gradients are the one painterly tool
 *      react-native-svg actually implements natively.
 *   3. **Shapes are grouped by paint.** A hundred grass blades that share a
 *      stroke are one `<Path>` with a hundred subpaths, not a hundred nodes.
 *
 * Two coordinate systems, and they never change:
 *   stem — 60 × 120, base at (30, 120), tip at (30 + bend, 18)
 *   head — 56 × 56, main flower centred on (28, 22)
 */

export const STEM_VIEWBOX = { width: 60, height: 120 } as const;
export const HEAD_VIEWBOX = 56;
/** Where the main bloom sits inside the head box, as a fraction of it. */
export const HEAD_ANCHOR = { x: 28 / 56, y: 22 / 56 } as const;

/** Head-box diameter in stem-viewBox units, so it scales with the plant. */
export const HEAD_SIZE: Record<SpeciesKey, number> = {
  buttercup: 34,
  cornflower: 40,
  scabious: 40,
  cosmos: 45,
  daisy: 47,
  poppy: 52,
};

const CX = 28;
const CY = 22;

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Petals
// ---------------------------------------------------------------------------

/**
 * A petal, drawn from its attachment point outward along -y.
 *
 * Narrow at the base, widest around a third of the way up, rounded at the tip —
 * the shape an ellipse cannot make, and the reason ellipse-petal flowers always
 * look like daisies from a clip-art set.
 */
function petalPath(width: number, length: number): string {
  const w = width.toFixed(2);
  const nw = (-width).toFixed(2);
  const nq = (-length * 0.26).toFixed(2);
  const h = (-length * 0.76).toFixed(2);
  const tip = (-length).toFixed(2);
  const inner = (width * 0.86).toFixed(2);
  const ninner = (-width * 0.86).toFixed(2);

  return (
    `M0 0 C${w} ${nq}, ${inner} ${h}, 0 ${tip} `
    + `C${ninner} ${h}, ${nw} ${nq}, 0 0 Z`
  );
}

type PetalSpec = { key: string; d: string; angle: number };

type PetalRing = {
  seed: number;
  count: number;
  length: number;
  width: number;
  /** 0 disables the irregularity entirely; 1 is the full treatment. */
  jitter?: number;
};

function makePetals({
  seed,
  count,
  length,
  width,
  jitter = 1,
}: PetalRing): PetalSpec[] {
  const random = lcg(seed);
  const step = 360 / count;

  return Array.from({ length: count }, (_, i) => {
    const angle = i * step + (random() - 0.5) * step * 0.52 * jitter;
    const petalLength = length * (1 + (random() - 0.5) * 0.34 * jitter);
    const petalWidth = width * (1 + (random() - 0.5) * 0.3 * jitter);
    return {
      key: `p${i}`,
      d: petalPath(petalWidth, petalLength),
      angle,
    };
  });
}

function Petals({
  petals,
  fill,
  stroke,
  cx = CX,
  cy = CY,
  scale = 1,
}: {
  petals: PetalSpec[];
  fill: string;
  stroke?: string;
  cx?: number;
  cy?: number;
  scale?: number;
}) {
  const base = `translate(${cx} ${cy})${scale === 1 ? '' : ` scale(${scale})`}`;
  return (
    <>
      {petals.map(petal => (
        <Path
          key={petal.key}
          d={petal.d}
          fill={fill}
          stroke={stroke}
          strokeWidth={stroke ? 0.4 : undefined}
          transform={`${base} rotate(${petal.angle.toFixed(1)})`}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Heads
// ---------------------------------------------------------------------------

type Recipe = {
  count: number;
  length: number;
  width: number;
  /** Optional inner ring of shorter petals — cornflowers, scabious. */
  inner?: { count: number; length: number; width: number };
  disc: number;
  core: number;
  /** Ring of stamen dots around the disc. */
  stamens?: number;
};

const RECIPES: Record<SpeciesKey, Recipe> = {
  daisy: { count: 13, length: 15, width: 2.6, disc: 4.6, core: 2.4 },
  cosmos: { count: 8, length: 15.5, width: 5, disc: 3.8, core: 1.9 },
  cornflower: {
    count: 9,
    length: 15,
    width: 2.2,
    inner: { count: 9, length: 8.5, width: 1.8 },
    disc: 2.6,
    core: 1.3,
  },
  scabious: {
    count: 12,
    length: 11.5,
    width: 3.4,
    inner: { count: 10, length: 6, width: 2.6 },
    disc: 4.2,
    core: 3,
    stamens: 11,
  },
  buttercup: { count: 5, length: 11, width: 6.4, disc: 2.9, core: 1.5 },
  poppy: {
    count: 5,
    length: 16.5,
    width: 8.6,
    disc: 3.4,
    core: 1.8,
    stamens: 9,
  },
};

export const FlowerHead = React.memo(({
  species,
  colors,
  seed,
  detail,
  satellites,
  gradientId,
}: {
  species: SpeciesKey;
  colors: HueColors;
  seed: number;
  detail: Detail;
  satellites: readonly Satellite[];
  gradientId: string;
}) => {
  const recipe = RECIPES[species];
  const simple = detail === 'simple';
  const fill = simple ? colors.petal : `url(#${gradientId})`;

  const petals = React.useMemo(
    () =>
      makePetals({
        seed,
        count: simple
          ? Math.max(5, Math.round(recipe.count * 0.65))
          : recipe.count,
        length: recipe.length,
        width: recipe.width,
        jitter: simple ? 0.7 : 1,
      }),
    [seed, simple, recipe],
  );

  const innerPetals = React.useMemo(
    () =>
      recipe.inner && !simple
        ? makePetals({ seed: seed ^ 0x5F3A, ...recipe.inner })
        : [],
    [seed, simple, recipe],
  );

  return (
    <>
      {simple
        ? null
        : (
            <Defs>
              {/* Anchored at (0,0) in each petal's own local space — which is
                  the flower's heart, since every petal is translated there
                  before it rotates. A radial gradient is rotation-invariant
                  about its centre, so all petals stay in register. */}
              <RadialGradient
                id={gradientId}
                cx="0"
                cy="0"
                r={String(recipe.length * 1.15)}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={mixHex(colors.petal, colors.center, 0.42)} />
                <Stop offset="0.4" stopColor={colors.petal} />
                <Stop offset="1" stopColor={shiftHue(colors.petal, 0.7)} />
              </RadialGradient>
            </Defs>
          )}

      {satellites.map((satellite, index) => (
        <SatelliteBloom
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          satellite={satellite}
          colors={colors}
          recipe={recipe}
          seed={seed + index * 7717}
          fill={fill}
        />
      ))}

      <Petals petals={petals} fill={fill} stroke={simple ? undefined : colors.edge} />
      {innerPetals.length > 0
        ? <Petals petals={innerPetals} fill={colors.edge} />
        : null}

      <Circle cx={CX} cy={CY} r={recipe.disc} fill={colors.center} />
      {recipe.stamens && !simple
        ? <Stamens count={recipe.stamens} radius={recipe.disc + 2.4} color={colors.core} />
        : null}
      <Circle cx={CX} cy={CY} r={recipe.core} fill={colors.core} />
    </>
  );
});

function Stamens({
  count,
  radius,
  color,
}: {
  count: number;
  radius: number;
  color: string;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = ((i * 360) / count) * (Math.PI / 180);
        return (
          <Circle
            key={i}
            cx={CX + Math.sin(angle) * radius}
            cy={CY - Math.cos(angle) * radius}
            r={0.85}
            fill={color}
          />
        );
      })}
    </>
  );
}

/**
 * A second bloom on the same stem.
 *
 * Lives inside the plant's one head SVG, so three flowers cost the same number
 * of animated views as one.
 */
function SatelliteBloom({
  satellite,
  colors,
  recipe,
  seed,
  fill,
}: {
  satellite: Satellite;
  colors: HueColors;
  recipe: Recipe;
  seed: number;
  fill: string;
}) {
  const cx = CX + satellite.dx;
  const cy = CY + satellite.dy;

  const petals = React.useMemo(
    () =>
      makePetals({
        seed,
        count: recipe.count,
        length: recipe.length,
        width: recipe.width,
      }),
    [seed, recipe],
  );

  if (satellite.bud) {
    return (
      <Path
        d={BUD_BODY}
        fill={mixHex(colors.petal, colors.center, 0.3)}
        transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${(
          satellite.scale * 1.5
        ).toFixed(2)})`}
      />
    );
  }

  return (
    <>
      <Petals
        petals={petals}
        fill={fill}
        cx={cx}
        cy={cy}
        scale={satellite.scale}
      />
      <Circle
        cx={cx}
        cy={cy}
        r={recipe.disc * satellite.scale}
        fill={colors.center}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Stem
// ---------------------------------------------------------------------------

const BUD_BODY = 'M0 4 C -3 1.6, -3 -4.4, 0 -7.4 C 3 -4.4, 3 1.6, 0 4 Z';
const BUD_TIP = 'M0 -7.4 C 1.8 -5, 2.1 -2, 1.4 -0.2 C 0.5 -2.6, 0 -5.2, 0 -7.4 Z';

/**
 * A leaf, drawn from its attachment point outward along +x.
 *
 * Emitted as a raw subpath string rather than a component so a whole plant's
 * leaves — or a whole ground layer's — can share one `<Path>` node.
 */
type LeafSpec = {
  x: number;
  y: number;
  degrees: number;
  length: number;
  width: number;
};

function leafSub({ x, y, degrees, length, width }: LeafSpec): string {
  const a = (degrees * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const at = (lx: number, ly: number) =>
    `${(x + lx * cos - ly * sin).toFixed(1)} ${(y + lx * sin + ly * cos).toFixed(1)}`;

  return (
    `M${at(0, 0)} C${at(length * 0.24, -width)} ${at(length * 0.68, -width * 0.92)} `
    + `${at(length, 0)} C${at(length * 0.68, width * 0.92)} `
    + `${at(length * 0.24, width)} ${at(0, 0)} Z`
  );
}

/**
 * Tapered stem as a filled shape — a stroke cannot narrow toward the tip.
 *
 * `half` arrives in viewBox units already corrected for the plant's rendered
 * size, so a stem that is four times taller is not four times thicker.
 */
function stemShape(bend: number, half: number): string {
  const tip = 30 + bend;
  const c1 = 30 + bend * 0.04;
  const c2 = 30 + bend * 0.72;
  const base = half;
  const mid = half * 0.92;
  const upper = half * 0.65;
  const point = half * 0.36;
  return (
    `M${(30 - base).toFixed(2)} 121 `
    + `C${(c1 - mid).toFixed(2)} 92, ${(c2 - upper).toFixed(2)} 58, ${(tip - point).toFixed(2)} 17 `
    + `L${(tip + point).toFixed(2)} 17 `
    + `C${(c2 + upper).toFixed(2)} 58, ${(c1 + mid).toFixed(2)} 92, ${(30 + base).toFixed(2)} 121 Z`
  );
}

export const PlantStem = React.memo(({
  bend,
  leaves,
  seed,
  detail,
  stemHalf,
  leafLength,
  stem,
  leaf,
  leafGradientId,
  bud,
  budTip,
}: {
  bend: number;
  leaves: number;
  seed: number;
  detail: Detail;
  /** Stem half-width, in viewBox units, pre-corrected for rendered size. */
  stemHalf: number;
  /** Leaf length, in viewBox units, likewise. */
  leafLength: number;
  stem: string;
  leaf: string;
  leafGradientId: string;
  bud: string;
  budTip: string;
}) => {
  const simple = detail === 'simple';
  const tipX = 30 + bend;
  // A small calyx, capped so a tall plant does not sprout a giant green teardrop
  // that outweighs its own flower and shows through the petals once it opens.
  // The flower head is drawn on top and covers it at full bloom.
  const budScale = Math.min(leafLength, 11) / 17;

  const foliage = React.useMemo(() => {
    const random = lcg(seed ^ 0x2C41);
    const subpaths: string[] = [];

    for (let i = 0; i < leaves; i += 1) {
      // Walk up the stem, alternating sides, shrinking toward the tip.
      const t = 0.08 + (i / Math.max(leaves - 1, 1)) * 0.66;
      const y = 118 - t * 82;
      const x = 30 + bend * (t * 0.75);
      const side = i % 2 === 0 ? 1 : -1;
      const droop = 12 + random() * 26;
      const size = (1 - t * 0.55) * (0.85 + random() * 0.35);
      subpaths.push(
        leafSub({
          x,
          y,
          degrees: side > 0 ? droop : 180 - droop,
          length: leafLength * size,
          width: leafLength * 0.3 * size,
        }),
      );
    }

    return subpaths.join(' ');
  }, [bend, leaves, seed, leafLength]);

  return (
    <>
      {simple
        ? null
        : (
            <Defs>
              <RadialGradient
                id={leafGradientId}
                cx="30"
                cy="120"
                r="110"
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={mixHex(leaf, '#000000', 0.16)} />
                <Stop offset="1" stopColor={shiftHue(leaf, 0.55)} />
              </RadialGradient>
            </Defs>
          )}

      <Path d={stemShape(bend, stemHalf)} fill={stem} />
      <Path d={foliage} fill={simple ? leaf : `url(#${leafGradientId})`} />
      <Path
        d={BUD_BODY}
        fill={bud}
        transform={`translate(${tipX.toFixed(1)} 15) scale(${budScale.toFixed(2)})`}
      />
      <Path
        d={BUD_TIP}
        fill={budTip}
        opacity={0.9}
        transform={`translate(${tipX.toFixed(1)} 15) scale(${budScale.toFixed(2)})`}
      />
    </>
  );
});

// ---------------------------------------------------------------------------
// Ground cover
// ---------------------------------------------------------------------------

/**
 * The permanent foliage — and the reason the meadow reads as full.
 *
 * None of this animates, so all of it can be static SVG, and every shape that
 * shares a paint is folded into one `<Path>` with many subpaths. Several
 * hundred blades, leaves and sprigs cost six nodes.
 *
 * `density` scales how much is emitted, so the lush pass can be generated with
 * the same code as the sparse one and simply cross-faded on top.
 */
export type GroundLayer = {
  key: string;
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};

export function buildGroundCover({
  width,
  height,
  seed,
  density,
  grassBack,
  grassMid,
  grassFront,
  leafBack,
  leafFront,
}: {
  width: number;
  height: number;
  seed: number;
  density: number;
  grassBack: string;
  grassMid: string;
  grassFront: string;
  leafBack: string;
  leafFront: string;
}): GroundLayer[] {
  const random = lcg(seed);

  const blades: [string[], string[], string[]] = [[], [], []];
  const bladeCount = Math.round((width / 1.9) * density);

  for (let i = 0; i < bladeCount; i += 1) {
    const x = random() * width;
    const tier = random();
    const band = tier < 0.4 ? 0 : tier < 0.72 ? 1 : 2;
    // Back blades start higher up the band and are shorter; front blades are
    // rooted at the very bottom and overlap the plants.
    const root = height - random() * height * (band === 0 ? 0.34 : 0.14);
    const tall = (band === 0 ? 16 : band === 1 ? 26 : 34) * (0.5 + random());
    const lean = (random() - 0.5) * tall * 0.85;

    blades[band].push(
      `M${x.toFixed(1)} ${root.toFixed(1)} `
      + `Q${(x + lean * 0.35).toFixed(1)} ${(root - tall * 0.62).toFixed(1)}, `
      + `${(x + lean).toFixed(1)} ${(root - tall).toFixed(1)}`,
    );
  }

  const clumps: [string[], string[]] = [[], []];
  const clumpCount = Math.round((width / 11) * density);

  for (let i = 0; i < clumpCount; i += 1) {
    const x = random() * width;
    const front = random() < 0.45;
    const y = height - random() * height * (front ? 0.16 : 0.3);
    const size = (front ? 1.15 : 0.85) * (0.7 + random() * 0.7);
    const fan = 3 + Math.floor(random() * 3);

    for (let k = 0; k < fan; k += 1) {
      const spread = -155 + (k / Math.max(fan - 1, 1)) * 130 + (random() - 0.5) * 26;
      clumps[front ? 1 : 0].push(
        leafSub({
          x,
          y,
          degrees: spread,
          length: 7.5 * size,
          width: 2.6 * size,
        }),
      );
    }
  }

  return [
    { key: 'grass-back', d: blades[0].join(' '), stroke: grassBack, strokeWidth: 1.2 },
    { key: 'leaf-back', d: clumps[0].join(' '), fill: leafBack },
    { key: 'grass-mid', d: blades[1].join(' '), stroke: grassMid, strokeWidth: 1.5 },
    { key: 'leaf-front', d: clumps[1].join(' '), fill: leafFront },
    { key: 'grass-front', d: blades[2].join(' '), stroke: grassFront, strokeWidth: 1.9 },
  ].filter(layer => layer.d.length > 0);
}

/**
 * The mossy lip at the very bottom of the scene.
 *
 * One node, and it does more for "this is ground" than any amount of extra
 * grass: without a soft horizon the stems read as floating on the background.
 */
export function mossBand(width: number, height: number, seed: number): string {
  const random = lcg(seed);
  const top = height - 16;
  const steps = Math.max(4, Math.round(width / 46));
  let d = `M0 ${height.toFixed(1)} L0 ${top.toFixed(1)}`;

  for (let i = 1; i <= steps; i += 1) {
    const x = (i / steps) * width;
    const y = top - random() * 11;
    d
      += ` Q${(x - width / steps / 2).toFixed(1)} ${(y - 7).toFixed(1)}, `
        + `${x.toFixed(1)} ${y.toFixed(1)}`;
  }

  return `${d} L${width.toFixed(1)} ${height.toFixed(1)} Z`;
}

/**
 * A bank of broad leaves — the density regime's greenery.
 *
 * Not a filled band: the reference meadow is layered foliage with the paper
 * showing through, never a flat green wall. This scatters broad pointed leaves
 * across the bottom `coverage` of the scene in three greens, weighted low and
 * shrinking toward the top, so as `abundance` fades it in the field thickens
 * into a leafy bed the flowers sit in — cream still visible between every leaf.
 *
 * Grouped by shade into three `<Path>` nodes; hundreds of leaves, three nodes.
 */
export function buildMeadowFoliage({
  width,
  height,
  seed,
  density,
  coverage,
  leafBack,
  leafMid,
  leafFront,
}: {
  width: number;
  height: number;
  seed: number;
  density: number;
  coverage: number;
  leafBack: string;
  leafMid: string;
  leafFront: string;
}): GroundLayer[] {
  const random = lcg(seed);
  const shades: [string[], string[], string[]] = [[], [], []];
  const count = Math.round((width / 5.5) * density);
  const bandTop = height - coverage * height;

  for (let i = 0; i < count; i += 1) {
    const x = random() * width;
    // Bottom-weighted: most leaves sit low, a few reach up the band. `t` is 0
    // at the floor, 1 at the top of the band.
    const y = height - random() ** 1.7 * (height - bandTop);
    const t = (height - y) / Math.max(height - bandTop, 1);
    const shade = random() < 0.42 ? 0 : random() < 0.72 ? 1 : 2;
    // Leaves higher up read as further away: smaller.
    const size = (0.75 + random() * 0.7) * (1 - t * 0.4);
    const degrees = -150 + random() * 300;
    shades[shade].push(
      leafSub({ x, y, degrees, length: 13 * size, width: 4.6 * size }),
    );
  }

  return [
    { key: 'mf-back', d: shades[0].join(' '), fill: leafBack },
    { key: 'mf-mid', d: shades[1].join(' '), fill: leafMid },
    { key: 'mf-front', d: shades[2].join(' '), fill: leafFront },
  ].filter(layer => layer.d.length > 0);
}

export function GroundPaths({ layers }: { layers: GroundLayer[] }) {
  return (
    <>
      {layers.map(layer => (
        <Path
          key={layer.key}
          d={layer.d}
          fill={layer.fill ?? 'none'}
          stroke={layer.stroke}
          strokeWidth={layer.strokeWidth}
          strokeLinecap="round"
        />
      ))}
    </>
  );
}
