import type { Hue } from './palette';

/**
 * The plant catalogue.
 *
 * Generated once at module load from a seeded LCG, so the garden is identical
 * on every launch and in every screenshot — the only way to judge one design
 * pass against the previous one.
 *
 * Three properties fight the "geometric" look, and they all live here rather
 * than in the drawing code:
 *
 *   - every plant carries its own `seed`, which the head drawing uses to jitter
 *     petal angles, lengths and widths. Perfect radial symmetry is the single
 *     loudest tell that a flower was computed rather than drawn;
 *   - `hueShift` moves each flower a few percent off its species colour, so a
 *     patch of daisies is a patch of slightly different whites;
 *   - heights follow a power distribution, not a uniform one. Real meadows are
 *     dense and short at the bottom with a few tall stems breaking the line.
 */

export type SpeciesKey
  = | 'buttercup'
    | 'cornflower'
    | 'cosmos'
    | 'daisy'
    | 'poppy'
    | 'scabious';

/** Back to front. Drives size, colour fade, and how much detail is drawn. */
export type Depth = 0 | 1 | 2 | 3;

/**
 * Level of detail.
 *
 * The two back layers are faded 40-55 % toward the background and are mostly
 * occluded; drawing them with gradients, satellite blooms and six leaves would
 * double the node count of the scene for something nobody can resolve.
 */
export type Detail = 'full' | 'simple';

/** A secondary bloom or bud sharing the stem, in stem-viewBox units. */
export type Satellite = {
  dx: number;
  dy: number;
  scale: number;
  bud: boolean;
};

export type Plant = {
  id: string;
  depth: Depth;
  detail: Detail;
  species: SpeciesKey;
  hue: Hue;
  /** Drives all per-flower jitter in the drawing code. */
  seed: number;
  /** Shifts this flower off its species colour, -1 → darker, 1 → lighter. */
  hueShift: number;
  /** Horizontal position of the stem base, 0 → 1 across the scene. */
  x: number;
  /** Plant height as a fraction of the scene height. */
  height: number;
  /**
   * Flower size relative to its depth layer.
   *
   * Deliberately independent of `height`. A tall stem in a real meadow does
   * not carry a proportionally enormous flower, and tying the two together is
   * what forces every plant to be either small-and-low or big-and-high.
   */
  headScale: number;
  /** Bloom value at which this flower starts opening. */
  threshold: number;
  /** Stem lean, in stem-viewBox units. Also decides which side leaves sit. */
  bend: number;
  /** How many leaves ride the stem. */
  leaves: number;
  /** Extra blooms on the same stem. Empty for `simple` plants. */
  satellites: Satellite[];
  /** Sway: whole cycles per clock loop, phase 0 → 1, amplitude in degrees. */
  cycles: number;
  phase: number;
  swayAmp: number;
  /** Degrees the head unfurls through as it opens. */
  openRotate: number;
};

type Pool = { species: SpeciesKey[]; hues: Hue[] };

/** Small species open early, showy ones late — the band story from the design. */
const POOLS: [Pool, Pool, Pool] = [
  {
    species: ['buttercup', 'cornflower'],
    hues: ['yellow', 'blue', 'cream', 'white'],
  },
  {
    species: ['cornflower', 'cosmos', 'daisy', 'scabious'],
    hues: ['blue', 'pink', 'white', 'lilac', 'yellow'],
  },
  {
    species: ['daisy', 'poppy', 'cosmos', 'scabious'],
    hues: ['white', 'coral', 'red', 'pink', 'lilac'],
  },
];

const LAYERS: {
  depth: Depth;
  detail: Detail;
  count: number;
  seed: number;
  height: [number, number];
  /** Exponent on the height sample. >1 biases short, filling the base. */
  heightBias: number;
  leaves: [number, number];
  sway: [number, number];
}[] = [
  {
    depth: 0,
    detail: 'simple',
    count: 42,
    seed: 20260823,
    height: [0.05, 0.3],
    heightBias: 1.45,
    leaves: [2, 3],
    sway: [0.3, 0.8],
  },
  {
    depth: 1,
    detail: 'simple',
    count: 36,
    seed: 913377,
    height: [0.07, 0.44],
    heightBias: 1.35,
    leaves: [3, 4],
    sway: [0.6, 1.3],
  },
  {
    depth: 2,
    detail: 'full',
    count: 30,
    seed: 424242,
    height: [0.1, 0.6],
    heightBias: 1.3,
    leaves: [4, 5],
    sway: [0.9, 1.8],
  },
  {
    depth: 3,
    detail: 'full',
    count: 24,
    seed: 77713,
    height: [0.14, 0.82],
    heightBias: 1.25,
    leaves: [4, 6],
    sway: [1.2, 2.4],
  },
];

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function poolFor(threshold: number): Pool {
  if (threshold < 0.34)
    return POOLS[0];
  if (threshold < 0.66)
    return POOLS[1];
  return POOLS[2];
}

/**
 * Extra blooms on the same stem.
 *
 * This is the cheapest density there is: satellites live inside the plant's
 * single head SVG, so three flowers cost the same number of animated views as
 * one. They also break the "one stem, one perfectly centred flower" rhythm that
 * makes a generated meadow look like a chart.
 */
function satellitesFor(
  random: () => number,
  species: SpeciesKey,
  max: number,
): Satellite[] {
  const roll = random();
  // Denser than the first pass: most full stems now carry a second or third
  // bloom. Extra flowers here are free — they live in the plant's one head SVG.
  const count = Math.min(
    roll < 0.18 ? 0 : roll < 0.56 ? 1 : roll < 0.84 ? 2 : 3,
    max,
  );
  const spread = species === 'poppy' ? 13 : 10;

  // An explicit loop, not `Array.from(…).fill(…)`: `fill` would put one shared
  // object in every slot and draw the randoms a single time, so both satellites
  // on a stem would land in exactly the same place.
  const satellites: Satellite[] = [];
  for (let i = 0; i < count; i += 1) {
    satellites.push({
      dx: (random() - 0.5) * 2 * spread,
      dy: 4 + random() * 11,
      scale: 0.4 + random() * 0.28,
      // Not every satellite is open. A bud beside a bloom is what a real stem
      // looks like mid-season, and it costs nothing.
      bud: random() < 0.42,
    });
  }

  return satellites;
}

function buildLayer(layer: (typeof LAYERS)[number]): Plant[] {
  const random = lcg(layer.seed);
  const plants: Plant[] = [];

  for (let i = 0; i < layer.count; i += 1) {
    // Stratified, but loosely: the jitter is wider than the slot so neighbours
    // can crowd and gap. Tight stratification reads as a picket fence.
    const x = (i + 0.5 + (random() - 0.5) * 2.4) / layer.count;
    // Capped at ~0.85 so that, once the +0.13 opening window is added, every
    // base plant is fully open by bloom = 1 — the meadow reads as completely in
    // flower at the bloom palier, which is the whole promise of "déjà fleuri".
    const threshold = 0.04 + ((i + random() * 0.9) / layer.count) * 0.81;
    const pool = poolFor(threshold);
    const species = pool.species[Math.floor(random() * pool.species.length)];
    const hue = pool.hues[Math.floor(random() * pool.hues.length)];
    const [minHeight, maxHeight] = layer.height;

    plants.push({
      id: `d${layer.depth}-${i}`,
      depth: layer.depth,
      detail: layer.detail,
      species,
      hue,
      seed: Math.floor(random() * 0xFFFFFF) + 1,
      hueShift: (random() - 0.5) * 2,
      x,
      height:
        minHeight + (maxHeight - minHeight) * random() ** layer.heightBias,
      headScale: 0.78 + random() * 0.5,
      threshold,
      bend: (random() - 0.5) * 20,
      leaves:
        layer.leaves[0]
        + Math.floor(random() * (layer.leaves[1] - layer.leaves[0] + 1)),
      // Full plants carry up to three extra blooms; the faded back layers get
      // at most one, enough to thicken the field without wasted petal nodes.
      satellites: satellitesFor(random, species, layer.detail === 'full' ? 3 : 1),
      cycles: 2 + Math.floor(random() * 3),
      phase: random(),
      swayAmp: layer.sway[0] + random() * (layer.sway[1] - layer.sway[0]),
      openRotate: (random() - 0.5) * 60,
    });
  }

  return plants;
}

/** Back to front — document order is the only z-index in the scene. */
export const GARDEN_LAYERS: readonly (readonly Plant[])[] = LAYERS.map(buildLayer);

export const PLANT_COUNT = GARDEN_LAYERS.reduce(
  (total, layer) => total + layer.length,
  0,
);

// ---------------------------------------------------------------------------
// Abundance — the density regime
// ---------------------------------------------------------------------------

/**
 * A flower that belongs to the second regime, past the bloom palier.
 *
 * These never grow: there is no stem to rise, no bud to unfurl. Each one fades
 * in already open as `abundance` crosses its threshold, sitting in the lush
 * even greenery. They are what "past 10 000 steps it only gets denser" means,
 * and they are placed to fill the sides the base meadow leaves bare.
 */
export type AbundanceFlower = {
  id: string;
  depth: Depth;
  species: SpeciesKey;
  hue: Hue;
  seed: number;
  hueShift: number;
  /** Head centre, 0 → 1 across the scene. Weighted toward the empty edges. */
  x: number;
  /** Head centre height, 0 → 1 up from the scene floor. */
  y: number;
  /** Head size relative to its depth layer. */
  headScale: number;
  /** Abundance value at which this flower begins to appear. */
  threshold: number;
};

const ABUNDANCE_COUNT = 92;
const ABUNDANCE_SEED = 606011;

/** Showy species only — the abundance flowers are the celebration of the top paliers. */
const ABUNDANCE_POOL: Pool = {
  species: ['daisy', 'poppy', 'cosmos', 'scabious', 'cornflower', 'buttercup'],
  hues: ['white', 'coral', 'red', 'pink', 'lilac', 'yellow', 'blue', 'cream'],
};

function buildAbundance(): AbundanceFlower[] {
  const random = lcg(ABUNDANCE_SEED);
  const flowers: AbundanceFlower[] = [];

  for (let i = 0; i < ABUNDANCE_COUNT; i += 1) {
    // Better than half are pushed into the two side bands, which is where the
    // base meadow reads as empty; the rest fill gaps across the whole width.
    const edge = random();
    const x
      = edge < 0.32
        ? random() * 0.22
        : edge < 0.62
          ? 0.78 + random() * 0.22
          : random();

    // Bottom-weighted but spread up the band so a big population layers into a
    // deep bed rather than a single crushed row: the abundance flowers are the
    // big blooms of the front, filling the field as the paliers climb.
    const y = 0.01 + random() ** 1.8 * 0.42;

    // The reference's size hierarchy: big flowers low in front, smaller and
    // paler ones set back and higher. Depth follows height in the band, and
    // depth drives both size and how far the colour fades toward the ground.
    const depth: Depth = y < 0.1 ? 3 : y < 0.22 ? 2 : 1;

    flowers.push({
      id: `ab-${i}`,
      depth,
      species:
        ABUNDANCE_POOL.species[
          Math.floor(random() * ABUNDANCE_POOL.species.length)
        ],
      hue: ABUNDANCE_POOL.hues[
        Math.floor(random() * ABUNDANCE_POOL.hues.length)
      ],
      seed: Math.floor(random() * 0xFFFFFF) + 1,
      hueShift: (random() - 0.5) * 2,
      x,
      y,
      headScale: 0.85 + random() * 0.6,
      // Spread [0.05, 0.85] over `progress` so about half are out by the middle
      // of the range — 10 000 already reads as a full meadow — and the rest come
      // in through the top paliers, which keeps 20 000 visibly denser still.
      threshold: 0.05 + ((i + random() * 0.8) / ABUNDANCE_COUNT) * 0.8,
    });
  }

  return flowers;
}

/** The already-open flowers of the density regime, sorted back to front. */
export const ABUNDANCE_FLOWERS: readonly AbundanceFlower[] = buildAbundance()
  .slice()
  .sort((a, b) => a.depth - b.depth);

/** One loop of the shared sway clock. Every period is a divisor of it. */
export const SWAY_LOOP_MS = 12000;
