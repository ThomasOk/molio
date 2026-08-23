/**
 * The bloom model.
 *
 * One number — `progress`, 0 → 1 — describes the whole garden, and it is steps
 * divided by the top palier. Two continuous drivers derive from it, and every
 * plant then decides for itself what to do by comparing a driver against its own
 * threshold. Nothing anywhere stores "we are at palier 3"; the paliers are fixed
 * step counts the copy names, never render states.
 *
 * Two continuous drivers derive from progress, and the whole idea is that both
 * are front-loaded so the meadow is satisfying early and only keeps thickening:
 *
 *   - `bloom` (growth): stems rise, buds unfurl. It reaches 1 by BLOOM_STEPS —
 *     roughly a third of the way in — so the base meadow is fully in flower
 *     well before the goal, not held back for it.
 *   - `abundance` (density): already-open flowers fade in and the greenery
 *     thickens. It climbs across the WHOLE range, so a mid-day sync already
 *     reads as a full meadow and the top paliers pile on even more — the same
 *     density that used to arrive at MAX_STEPS now lands near the middle, and
 *     20 000 is denser still.
 *
 * That is what lets an arbitrary jump (1 254 → 17 800 steps) animate as a
 * cascade rather than a jump-cut: the two values land wherever they land, every
 * plant in between opens or fades in on the way through, in threshold order,
 * without a single hand-written stagger delay.
 */

/** The top palier. The garden is calibrated so this is its most complete frame. */
export const MAX_STEPS = 20000;

/**
 * The palier at which the base garden is fully in flower — deliberately early,
 * under a third of the way in, so the flowers show up quickly rather than being
 * rationed out toward the goal. Past it the base is done and only the density
 * keeps rising.
 */
export const BLOOM_STEPS = 6000;

/** BLOOM_STEPS as a fraction of the whole range — where `bloom` tops out. */
export const BLOOM_FRACTION = BLOOM_STEPS / MAX_STEPS;

/**
 * The fixed paliers, in steps. These drive the milestone chips and the copy.
 *
 * Finer through the bloom regime (every 2 000, so each early sync visibly moves
 * the garden), coarser through the abundance regime (each step there triggers a
 * wide wave of new flowers, which wants room to play out).
 */
export const MILESTONES = [
  0,
  2000,
  4000,
  6000,
  8000,
  10000,
  15000,
  20000,
] as const;

/**
 * The bands, expressed as fractions of MAX_STEPS.
 *
 * These exist for copy and for authoring (they tell you which slice of the
 * threshold range each plant belongs to). They are never used to pick a frame.
 */
export const BANDS = [
  { max: 0.04, label: 'Terre en éveil' },
  { max: 0.12, label: 'Premières fleurs' },
  { max: 0.25, label: 'Floraison' },
  { max: 0.4, label: 'Belle floraison' },
  { max: 0.55, label: 'Prairie fleurie' },
  { max: 0.8, label: 'Prairie foisonnante' },
  { max: Number.POSITIVE_INFINITY, label: 'Prairie en fête' },
] as const;

export function clamp(value: number, low: number, high: number): number {
  'worklet';
  return Math.min(Math.max(value, low), high);
}

/** Hermite fade between two edges — the S-curve every plant opens on. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  'worklet';
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function mix(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

/**
 * Steps → bloom, the growth driver.
 *
 * Reaches 1 at BLOOM_STEPS (≈ a third of the range) and stays there. Mildly
 * front-loaded (`** 0.85`) so the first few hundred steps produce visible
 * change on a slow morning.
 */
export function bloomFromProgress(progress: number): number {
  'worklet';
  return clamp(progress / BLOOM_FRACTION, 0, 1) ** 0.85;
}

/**
 * Steps → abundance, the density driver.
 *
 * Climbs across the whole range — it is just `progress`. The per-flower
 * thresholds (spread so most are out by the middle of the range) do the
 * staggering, which is what makes 10 000 already read as a full meadow while
 * 20 000 keeps piling flowers on top.
 */
export function abundanceFromProgress(progress: number): number {
  'worklet';
  return clamp(progress, 0, 1);
}

/**
 * Band index for the copy label. Explicit comparisons rather than a loop over
 * BANDS: this runs inside a worklet on the UI thread, and hardcoded numbers are
 * cheaper to capture than an array of objects (one of which holds Infinity).
 * Keep the edges in step with BANDS.
 */
export function bandIndexFor(progress: number): number {
  'worklet';
  if (progress <= 0.04)
    return 0;
  if (progress <= 0.12)
    return 1;
  if (progress <= 0.25)
    return 2;
  if (progress <= 0.4)
    return 3;
  if (progress <= 0.55)
    return 4;
  if (progress <= 0.8)
    return 5;
  return 6;
}

/**
 * Groups digits with a narrow no-break space, French style — and does it
 * without `Intl`, which is not available inside a worklet.
 */
export function formatSteps(value: number): string {
  'worklet';
  const digits = String(Math.max(0, Math.round(value)));
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    // U+202F narrow no-break space — French grouping, and it will not wrap.
    if (i > 0 && (digits.length - i) % 3 === 0)
      out += ' ';
    out += digits[i];
  }
  return out;
}

/**
 * How long the garden takes to catch up, by size of the sync.
 *
 * Deliberately slow: this animation is the whole value of the screen, and a
 * bloom you cannot watch is decoration. A full 0 → 10 000 sweep takes ~4 s, a
 * 0 → 20 000 one ~6.5 s. A zero delta returns 0 and the caller skips the
 * animation entirely — replaying a bloom when nothing changed is the single
 * easiest way to make this whole idea meaningless.
 */
export function bloomDuration(deltaSteps: number): number {
  const delta = Math.abs(deltaSteps);
  if (delta === 0)
    return 0;
  const fraction = Math.min(delta / MAX_STEPS, 1);
  return Math.round(Math.min(1000 + fraction * 6000, 6500));
}
