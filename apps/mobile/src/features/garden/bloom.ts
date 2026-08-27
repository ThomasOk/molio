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
 * Steps that earn one level. The day's level is an ABSOLUTE scale — steps ÷
 * 1 000 — quite apart from the goal ring, which fills against the user's own
 * variable target. Level 10 is the 10 000-step mark, level 20 the full garden.
 *
 * Shared by the level screen today, and by the stats heatmap and the leaderboard
 * trend once those land: all three read the same day → tier mapping.
 */
export const STEPS_PER_LEVEL = 1000;

/** The day's top level, since the garden tops out at MAX_STEPS. */
export const MAX_LEVEL = MAX_STEPS / STEPS_PER_LEVEL;

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
 * The two clocks a sync runs on, in ms.
 *
 * The counter and the garden are decoupled: one committed step target, two
 * animations racing to it at different speeds. The counter is the instrument —
 * the digits and their ring — and wants to be quick and legible. The garden is
 * the reward, and a bloom you can watch settle is the whole point, so it runs
 * slower. Neither is a second source of truth: the committed step count is the
 * only state, these are just how fast each view catches up to it.
 *
 * The counter is fixed: a number that always takes the same time to read is
 * calmer than one whose pace you have to relearn each sync. The garden scales
 * with the delta instead — a bigger leap earns a longer bloom — ramping from
 * GARDEN_MIN_MS for the smallest sync to GARDEN_MAX_MS for a full-range sweep.
 */
export const COUNTER_MS = 2000;
export const GARDEN_MIN_MS = 2500;
export const GARDEN_MAX_MS = 5500;

/**
 * How long the digits and their ring take to reach the new count.
 *
 * A zero delta returns 0 and the caller skips the animation entirely — replaying
 * a bloom when nothing changed is the single easiest way to make this whole idea
 * meaningless.
 */
export function counterDuration(deltaSteps: number): number {
  if (deltaSteps === 0)
    return 0;
  return COUNTER_MS;
}

/**
 * How long the garden takes to catch up, scaled by the size of the sync. Same
 * zero-delta rule as the counter.
 *
 * Linear in the fraction of the whole range the delta covers, so a 400-step
 * sync settles near GARDEN_MIN_MS and only a 0 → 20 000 sweep reaches
 * GARDEN_MAX_MS. The magnitude is what earns the time, so it reads the absolute
 * delta — folding back to zero on reset has its own, quicker curve.
 */
export function gardenDuration(deltaSteps: number): number {
  if (deltaSteps === 0)
    return 0;
  const fraction = Math.min(Math.abs(deltaSteps) / MAX_STEPS, 1);
  return Math.round(GARDEN_MIN_MS + fraction * (GARDEN_MAX_MS - GARDEN_MIN_MS));
}
