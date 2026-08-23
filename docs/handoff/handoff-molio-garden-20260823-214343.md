# Handoff: botanical DA spike ("Bloom lab") — molio mobile

**Date:** 2026-08-23
**Repo:** `/Users/thomas/Documents/dev/molio` (pnpm monorepo, mobile app at `apps/mobile`)
**Branch:** `main` — **nothing committed.** Everything below is uncommitted working-tree
changes. Committing/branching is the user's call and has not been requested.

Previous handoff (the *other*, dark "Stride" art direction): `docs/handoff/handoff-molio-stride-20260822-234942.md`.

---

## What this session was

The user is exploring a **new art direction** for the app: an evolving wildflower
meadow that blooms as the daily step count rises, driven by a Health-app sync.
Reference is an AI-generated infographic the user supplied
(`~/Downloads/ChatGPT Image 23 août 2026, 14_26_31.png`) — a watercolour meadow
across five bands: 0-10 % buds, 10-30 % first small flowers, 30-60 % moderate,
60-90 % abundant, 90-100 % complete + butterflies.

Two phases:

1. **Feasibility analysis** — can SVG do this in React Native, and at what cost.
2. **A working spike** ("Bloom lab"), then a **visual fidelity pass** on it after
   the user judged the first render "too geometric" and "not occupying enough space".

Scope is Home only. No health integration, no backend.

### Decisions the user made (do not relitigate)

- **The sway (ambient wind motion) direction is abandoned.** After an audit of its
  cost (59 worklets/frame, permanently, on the most-opened screen; no focus pause;
  ProMotion pinned at 120 Hz) the user said the drawbacks outweigh it. **The code
  was deliberately left in place** for the lab — it is gated behind a `Sway on/off`
  chip and `useReducedMotion()`. Do not build on it; do not rip it out unasked.
- **The pull-to-refresh is only a trigger.** It does not scrub the garden. The user
  corrected an early assumption here: it fires a sync, and it is the *returned step
  delta* that drives the bloom + the counter. This is why plain `RefreshControl`
  is enough and no custom Android overscroll was ever needed.
- **What matters now** is the palier-to-palier transition and the beauty of the
  final frame — the user described the goal as "une sorte de jolie wallpaper".

---

## What exists

All new, all under `apps/mobile/src/`. ~2 700 lines in `features/garden/`.
**No new dependencies** — `react-native-svg` 15.12.1, Reanimated 4.1.7 +
worklets 0.7.4, and gesture-handler 2.28 were already present. **No native
rebuild is needed**; a Metro reload picks everything up.

```
features/garden/
  bloom.ts                     the bloom model, worklet helpers, band labels, MILESTONES
  palette.ts                   the garden's own light/dark palette + colour maths
  flora.ts                     the plant catalogue: 4 layers, 106 plants, seeded
  use-bloom-lab.ts             all lab state: progress/bloom/burst/clock, commit/sync/reset
  garden-lab-screen.tsx        the screen (hero + pinned control footer)
  components/
    species.tsx                every drawing: petals, heads, stems, ground cover  (664 lines)
    plant.tsx                  one plant = 2 animated views wrapping static SVG
    garden-scene.tsx           layer composition + ground passes
    particles.tsx              drifting petals + butterflies (clock-driven, off with sway)
    step-ring.tsx              goal ring (the only animated SVG prop in the app)
    animated-steps.tsx         UI-thread counter via the TextInput `text` trick
    bloom-scrubber.tsx         pan scrubber, writes `progress` directly
    garden-lab-link.tsx        dev-only entry point rendered on Home
app/garden.tsx                 route (top-level, outside the tab bar, no auth gate)
```

Modified: `app/_layout.tsx` (registers the `garden` screen),
`features/home/home-screen.tsx` (renders `<GardenLabLink />` under the scenario
switcher). `components/ui/stride-text.tsx` was already modified before this session.

**The code carries its own rationale.** Every non-obvious decision has a comment
explaining *why* at the point it matters. Read `species.tsx` and `plant.tsx`
before changing anything visual — this document deliberately does not repeat them.

---

## The three ideas the whole thing rests on

1. **`bloom` is one continuous number, 0 → 1.** Every plant compares it against
   its own threshold. There is no "tier 3" state anywhere. This is what makes an
   arbitrary jump (1 254 → 7 842 steps) animate as a cascade instead of a
   jump-cut, with zero hand-written stagger. The five bands from the reference
   are copy labels and authoring guidance, never render states.

2. **Nothing animates inside SVG.** Every plant is 2 `Animated.View`s wrapping
   static, memoised SVG. Motion is `transform` + `opacity` on the view layer.
   The one exception is the goal ring's `strokeDashoffset`, which no transform
   can fake — one node, worth it.

3. **Static foliage grouped by paint is free density.** ~360 grass blades and
   ~250 leaves live in about ten `<Path>` nodes with many subpaths, across three
   passes and three views. This is where the meadow's fullness comes from, not
   from the flower count.

---

## How to actually see it (read this before iterating)

### The normal path

Home → scroll to the bottom → **`Dev · Bloom lab →`** (`__DEV__` only).
Three ways to drive it: milestone chips, the scrubber, and pull-to-refresh
(simulated sync, random delta, **and one time in five it returns zero** so the
"no delta, no bloom" path is visible).

### The screenshot loop (this is how the whole fidelity pass was done)

`xcrun simctl openurl <dev> "molio://garden"` raises an iOS confirmation dialog
that **cannot be dismissed programmatically** on this machine — `osascript`
`click at` fails with -25204, and neither `cliclick` nor Python `Quartz` is
installed. The workaround, used throughout, is a temporary harness:

1. Back up `src/app/(app)/index.tsx`, then replace with
   `export { GardenLabScreen as default } from '@/features/garden';`
2. In `use-bloom-lab.ts`: add `const DEBUG_PROGRESS = <0..1>;` and change
   `useSharedValue(0)` → `useSharedValue(DEBUG_PROGRESS)`
3. In `garden-lab-screen.tsx`: force `const palette = gardenPalettes.light;`
   (the app runs in dark mode; the DA is the light one)
4. `xcrun simctl terminate <dev> com.molio.development`, `launch`, **wait ~16 s**
   (Metro rebundle), then `xcrun simctl io <dev> screenshot`
5. **Revert all three.** Verify with
   `grep -rn "DEBUG_PROGRESS\|TEMP\|gardenPalettes.light" src/`

Simulator used: iPhone 16 Pro, `7F41F9D3-5A47-4013-B860-3F4DA7323614` (booted;
belongs to the user's own `expo run:ios` on port 8081 — that process was left
running and must not be killed).

Two things the harness distorts, both expected, neither a bug: the counter shows
`0` and the band label stays on the first band, because `useAnimatedProps` and
`useAnimatedReaction` only fire when the value *changes*, and the debug value is
static. In real use `progress` starts at 0 and animates.

To capture a mid-transition frame, temporarily add to `GardenLabScreen`:
```tsx
const commit = lab.commit;
React.useEffect(() => {
  const id = setTimeout(() => commit(9200), 16000);
  return () => clearTimeout(id);
}, [commit]);
```
then screenshot at ~16.5 s and ~18 s after launch.

`magick montage … -tile Nx1 -geometry +12+12 -background '#F7F4EC'` was used to
build the comparison strips. ImageMagick is installed.

---

## Where the tuning knobs are

Iterating on the look means touching these, roughly in order of leverage:

| Knob | File | Current |
| --- | --- | --- |
| Scene height (fraction of screen) | `garden-lab-screen.tsx` | `height * 0.5` |
| Per-layer count, height range, bias, leaf count | `flora.ts` → `LAYERS` | 34 / 30 / 24 / 18 = 106 plants |
| Which layers get full detail | `flora.ts` → `LAYERS[].detail` | back two `simple`, front two `full` |
| Flower size per layer | `plant.tsx` → `HEAD_BASE` | `[0.052, 0.068, 0.086, 0.108]` × sceneHeight |
| Where each layer's feet sit | `plant.tsx` → `BASELINE` | `[0.09, 0.055, 0.025, 0]` |
| Stem thickness / leaf length | `plant.tsx` → `plantGeometry` | points, then converted to viewBox units |
| Petal count / length / width per species | `species.tsx` → `RECIPES` | six species |
| Petal irregularity | `species.tsx` → `makePetals` | `jitter` 1 (full) / 0.7 (simple) |
| Ground density, sparse vs lush | `garden-scene.tsx` → `useGardenGround` | base 0.42, lush 1.3 |
| Atmospheric fade per layer | `palette.ts` → `DEPTH_FADE` | `[0.56, 0.36, 0.16, 0]` |
| Steps → bloom curve | `bloom.ts` → `bloomFromProgress` | `p ** 0.8` (front-loaded) |
| Transition duration by delta | `bloom.ts` → `bloomDuration` | 0 / 600 / 950 / 1400 ms |

**Two invariants worth protecting:**

- Flower size must stay **independent of stem height** (`headScale`, `HEAD_BASE`).
  Coupling them was what put every bloom on one altitude and made the meadow read
  as a stripe. This was the single fix that unlocked the current look.
- Stem and leaf dimensions must stay expressed in **points**, converted back to
  viewBox units. Otherwise a tall stem becomes a thick trunk.

---

## Bugs found on device (all fixed, all worth remembering)

1. **`transformOrigin` breaks on fractional percentages.** `'50% 100%'` parses;
   `'50.0% 39.3%'` throws `Transform origin z-position must be a number` at
   runtime. Fixed by using the numeric array form. Affects any future use.
2. **`eslint --fix` introduced a real bug.** It rewrote
   `Array.from({length: n}, () => ({…}))` into `Array.from({length: n}).fill({…})`,
   which puts one shared object in every slot and draws the randoms once — both
   satellites on a stem would have landed in the same place. Now an explicit loop
   in `flora.ts` with a comment. **Re-read autofixed diffs.**
3. **Auto-width `Text` silently drops its last glyph** with a runtime-loaded font
   ("bourgeons" → "bourgeon", "10 000 pas" → "10 00"). Fixed in the lab by giving
   centred text an explicit width. **This is not garden-specific — the same trap
   exists anywhere in the app that centres auto-width text in Manrope.**

---

## Validation performed

- `pnpm run check-all` from `apps/mobile`: 0 lint errors (12 warnings, all the
  pre-existing `react-refresh/only-export-components` class), type-check clean,
  74 tests / 9 suites green.
- Rendered on the iOS Simulator at five bloom levels and mid-transition. The
  earlier, sparser version was also captured mid-flight showing the counter at
  "2 710" and the ring at 27 % — proving the counter genuinely animates on the UI
  thread via the `TextInput` `text` prop, and the cascade works end to end.
- Home was re-checked after every revert and is unchanged.

**Never measured:** anything on a real device, in a release build, or on Android.
Simulator numbers would be meaningless (rendering goes through the Mac GPU).

---

## Open items, in the order they matter

1. **Mount cost.** 106 plants × 2 = **212 animated views**, plus roughly 2 000
   static SVG nodes. Without sway these only run during a ~1.4 s transition, so
   the risk is not the animation — it is how long the garden takes to appear when
   Home opens. **This is the number to measure first**, in a release build on the
   slowest supported Android.
2. **The lever if it is too slow, already scoped:** the 64 plants in the two back
   layers are `simple` and faded 36-56 %. Bake them into ~6 static SVGs grouped by
   threshold band and cross-fade each band as one view — 128 animated views → 6.
   The cascade gets coarser at the back, which at that fade is invisible.
3. **Watercolour texture is out of reach in SVG.** Verified from source: only 7
   filter primitives are implemented natively in `react-native-svg` (FeBlend,
   FeColorMatrix, FeComposite, FeFlood, FeGaussianBlur, FeMerge, FeOffset).
   `FeTurbulence` and `FeDisplacementMap` exist in the TypeScript surface but have
   no native counterpart — they are no-ops on device. Getting real grain means
   Skia (runtime shaders) or raster sprites. Current look is refined gradient
   botanical, not watercolour.
4. **Dark palette never rendered.** `gardenPalettes.dark` is written and typed but
   was only ever seen in the very first, pre-fidelity version. Needs a look.
5. **Android never run at all**, this session or the previous one.
6. The lab's own layout is provisional — a hero, a garden band, and a pinned
   control footer. It is an instrument, not a product screen. The real Home
   integration (replacing or coexisting with the Stride grid) has not been designed.
7. **Haptics deliberately skipped** — `expo-haptics` would need a prebuild. A
   `Haptics.impactAsync(Light)` on crossing a band is the obvious next addition.
8. **The designed sync loader** from the reference (the ring of dots, frame 3) is
   not built; the native `RefreshControl` spinner is used instead. Appearance
   decision, not a mechanical one.
9. The garden is entirely self-contained: its own palette, its own text component.
   Nothing about it is entangled with the Stride tokens, so dropping this DA costs
   only the deletion of `features/garden/` plus three small reverts.

---

## Suggested skills for the next session

- **`animate-expo`** — was loaded this session and shaped every motion decision
  (which thread, transform-only, timing vs spring, the `useAnimatedReaction`
  threshold pattern). Load it again before touching motion; its `RECIPES.md` has
  the threshold and scroll recipes already used here.
- **`design-foundations`** or **`ui-review`** — for the next fidelity pass. The
  remaining gaps are compositional (colour balance, value range, where the eye
  lands), which is a design critique rather than an engineering problem.
- **`performance`** — before acting on open item 1. The question is mount cost and
  view count, which is exactly its subject.
- **`code-review`** — nothing has been committed. Worth running over the whole
  `features/garden/` slice as a unit before any commit.
- **`domain-modeling`** — only if the bloom model has to meet real HealthKit data;
  `bloom.ts` currently owns the steps → bloom mapping in isolation.

Do **not** reach for `improve-animations` or `find-animation-opportunities` here —
the motion inventory is small, deliberate, and already audited.
