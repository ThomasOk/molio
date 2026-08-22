# Handoff: Stride design integration (molio mobile)

**Date:** 2026-08-22
**Repo:** `/Users/thomas/Documents/dev/molio` (pnpm monorepo; mobile app at `apps/mobile`)
**Branch:** `main` — **nothing has been committed**. All work below is uncommitted working-tree changes. No push, no branch created. Committing/branching is the user's call, not yet requested.

## Task

Integrate the approved Claude Design ("Stride" — a walking-habit app) into the
existing Obytes-template mobile app, per a long spec delivered as this
session's system prompt (not saved anywhere else — if the next agent needs
the full original spec, ask the user to re-paste it; the key constraints are
summarized below). Scope was explicitly limited to a first milestone:

> **Foundation + Home vertical slice** — design tokens, typography, the
> Refined Grid / Living Cells progress-visualization abstraction, the Home
> screen with three mocked states (low progress / almost complete / goal
> complete), mock data layer. Explicitly NOT in scope: real health
> integration, full onboarding, annual Progress screen, Stats, XP flow,
> sharing, Profile/settings.

The Claude Design project (source of visual truth) is at:
`https://claude.ai/design/p/e12df43b-23b2-4889-8455-0685d4bbc649?file=Stride+-+App.dc.html`
— files inspected via the `claude_design` MCP tool (`DesignSync`): `Stride -
App.dc.html`, `Stride - Design System.dc.html`, `support.js`. Two other
design files exist in that project but were **not** inspected this session:
`Progress Map - Exploration.dc.html`, `Stride - Polish Pass.dc.html` — worth
checking if a later milestone touches Progress/Stats screens.

## What's done

All under `apps/mobile/src/`. New files (none committed):

**Tokens / theme**
- `lib/theme/stride-tokens.ts` — colors (dark+light palettes, pre-converted
  from the design's OKLCH to hex since RN can't parse `oklch()`), spacing,
  radii, progress ramp (8-tier), glow specs, font family names, motion
  durations.
- `lib/theme/use-stride-theme.tsx` — resolves active palette from Uniwind's
  `useUniwind()` theme.
- `lib/theme/use-stride-fonts.tsx` — loads Manrope + JetBrains Mono via
  `@expo-google-fonts/*` (new deps, runtime-loaded, **not** wired through the
  `expo-font` config plugin like the template's Inter — no prebuild needed,
  but check whether that's desired long-term vs. matching the existing
  pattern).
- `global.css` — added `stride-*` CSS custom properties via `@theme` /
  `@variant dark` / `@variant light` blocks (Uniwind's theming mechanism,
  confirmed by reading `node_modules/uniwind/src/bundler/artifacts/css/themes.ts`).
  **Light mode was never visually verified this session** — only dark was
  rendered on device.

**UI primitives**
- `components/ui/stride-text.tsx` — the design's full type scale as `tv()`
  variants (hero/metric/h1../label/mono etc.), with `maxFontSizeMultiplier`
  caps per variant and `tabular-nums` on numeric variants.
- `components/ui/gradient-fill.tsx` — two-stop gradient via `react-native-svg`
  (chosen over `expo-linear-gradient` — already a dependency, RN's
  `experimental_backgroundImage` still experimental).
- `components/ui/stride-tab-bar.tsx` — custom bottom tab bar (neutral pill
  marker, not icon-based, per design's branding rule that nav must stay
  independent of the cell shape).

**Progress visualization abstraction** (`features/progress/`)
- `types.ts` — `DayProgress`, `ProgressSummary`, `ProgressVariant`
  (`'refined-grid' | 'living-cells'`), `createDayProgress()` helper.
- `tiers.ts` — 8-tier mapping from percentage (design's exact bands: 0, 1-25,
  25-50, 50-75, 75-99, 100-119, 120-179, 180+), `TIER_SCALE` per variant.
- `cell-visual.ts` — **pure function** `dayCellVisual()` returning RN
  `ViewStyle` for a day cell in either variant (today/no-data/filled
  branches). No React, fully unit-tested.
- `components/day-cell.tsx`, `components/progress-map.tsx`,
  `components/today-gauge.tsx` (`TodayCell` + `GoalGauge`).
- `mock-data.ts` — deterministic LCG-seeded mock data, 8 named scenarios
  (`new-user`, `low-progress`, `almost-complete`, `goal-complete`,
  `exceptional-day`, `long-streak`, `sparse-history`, `dense-history`).

**Home** (`features/home/`)
- `home-screen.tsx` — one screen, driven by `ProgressSummary`, no per-state
  duplication.
- `home-copy.ts` — copy logic (the "don't leave today empty" messaging rules).
- `use-home-scenario.tsx` — Zustand store (mirrors template's
  `createSelectors` pattern) driving a **dev-only** scenario/variant switcher
  UI at the bottom of Home (`components/scenario-switcher.tsx`, gated on
  `__DEV__`).
- `components/home-header.tsx`, `today-hero.tsx`, `home-stats-row.tsx`,
  `mini-progress-card.tsx`.

**Routing**
- `app/(app)/index.tsx` → now exports `HomeScreen` (was `FeedScreen`).
- `app/(app)/_layout.tsx` → rewritten: 4 tabs (Home/Progress/Stats/Profile)
  using `StrideTabBar`; old template screens (`settings`, `style`) kept
  routable via `href: null` but hidden from the bar. `feed`/`login` routes
  untouched.
- `app/(app)/progress.tsx`, `stats.tsx`, `profile.tsx` — new, all render
  `features/placeholder/coming-soon-screen.tsx`.
- `app/_layout.tsx` — now calls `useStrideFonts()` and holds the splash
  screen until fonts *and* layout are both ready.

**Tests** (Jest, co-located): `tiers.test.ts`, `cell-visual.test.ts`,
`home-copy.test.ts`, `home-screen.test.tsx`. Also modified
`lib/test-utils.tsx` to wrap renders in `SafeAreaProvider` with a fixed
notched-phone `initialMetrics` (was missing before; needed once screens read
safe-area insets).

**New deps** (`apps/mobile/package.json` + root lockfile):
`@expo-google-fonts/manrope`, `@expo-google-fonts/jetbrains-mono`.

## Validation performed

- `pnpm type-check`, `pnpm lint` (0 errors, 6 pre-existing-pattern warnings
  about `react-refresh/only-export-components` — same warning class already
  present on `checkbox.tsx` before this work), `pnpm test` (74 tests / 9
  suites green), all via `pnpm run check-all` from `apps/mobile`.
- **Rendered on iOS Simulator**, not just checked on web. Important lesson
  learned mid-session (user caught this): `expo start --web` uses
  react-native-web, which is NOT representative for `boxShadow` arrays,
  `overflow: hidden` + `borderRadius` clipping, safe-area insets, or Yoga
  flex resolution — all had to be re-verified on-device.
- Built and ran via `npx expo run:ios --device "iPhone 16 Pro"`. Measured
  rendered geometry **from raw screenshot pixels** (custom pure-JS PNG
  decoder + luminance-threshold column/row scanning — see
  transcript if this technique needs to be reused) rather than eyeballing:
  gutter, gauge segment size/gaps, mini-map cell size/gaps, TodayCell size
  all matched the design spec (`Stride - App.dc.html`'s embedded logic)
  to sub-pixel precision.

### Bug found and fixed: RN/Yoga `flexBasis: 0`

The stats row (`home-stats-row.tsx`) and tab bar
(`stride-tab-bar.tsx`) needed a `flex: 1 : flex: 1.5` split /
even split. Two real, confirmed findings:

1. **`flexBasis: 0` (the JS number) is silently dropped** somewhere before
   reaching Yoga and the item falls back to `auto`. Fix: use the **string**
   `'0%'` instead. Confirmed by direct on-device A/B measurement (a
   `flexBasis: 200` probe was honored exactly; `flexBasis: 0` was not).
2. **Yoga resolves `flexBasis` against the content-box**, unlike the design's
   CSS (`box-sizing: border-box`), so padding placed directly on a
   flex-basis item skews the ratio. Fix: keep `flexBasis: '0%'` on the outer
   (unpadded) flex item, move padding to an inner `View`.

Final measured result: 141.3pt / 210.7pt (design target: 140.8pt / 211.2pt,
ratio 1.5) — this is now believed correct but **the tab bar's own even-split
was never re-measured after the fix** (dev-menu overlay kept covering it on
the last few screenshots). Low risk (no padding on those flex items) but
unconfirmed.

## Open items / not done

1. **Tab bar even-split not re-verified on device** after the `flexBasis`
   fix (see above) — quick thing to re-check first.
2. **Light mode never rendered/verified.**
3. Two font/i18n design decisions made without asking the user, worth a
   sanity check:
   - Fonts loaded at runtime via `useFonts()` rather than through the
     `expo-font` config plugin (like the template's Inter). Works, but is a
     different pattern than the rest of the app.
   - Home's copy lives in `features/home/home-copy.ts`, not in
     `translations/en.json`/`ar.json` — deliberately not localized yet
     (didn't want to invent Arabic strings). Should move into the i18n
     catalogue before this ships for real.
4. Per spec, **not implemented** (by design, this milestone): real Apple
   Health/Health Connect, onboarding, annual Progress screen, Stats, XP flow,
   sharing/export, Profile/settings content (only placeholders exist).
5. Two design files in the Claude Design project were not inspected:
   `Progress Map - Exploration.dc.html`, `Stride - Polish Pass.dc.html`.
6. `feed/`-related screens (`feed/[id].tsx`, `feed/add-post.tsx`,
   `login-screen.tsx` etc.) are now orphaned from the tab bar but still exist
   in the codebase, untouched — fine to ignore or clean up later.
7. Nothing has been committed. The user will want to review the diff and
   decide on commit/branch strategy themselves.

## Environment state

- No stray processes or simulators left running — a Metro instance on port
  8082 and an iPhone 16 Pro simulator that were spun up for on-device
  verification were torn down at the user's request.
- The user's own **pre-existing** `expo run:ios` process (port 8081, iPhone
  17 Pro) was left alone but **its Metro has a stale bundle cache** (watchman
  watch had been dropped — visible as a warning during this session's
  build). The user will need to restart that Metro process themselves to see
  these changes reflected on their own device.
- Unrelated untracked directories present in the repo root
  (`.agents/`, `.claude/`, `docs/`, `skills-lock.json`, `CLAUDE.md`) —
  these look like tooling/skill scaffolding, not part of this task; left
  untouched, flagging only so the next agent doesn't assume they're part of
  the Stride work.

## Suggested skills for the next session

- **`code-review`** — run before anything is committed, to review the
  Foundation + Home slice as a unit (there's no PR yet, so use it against
  `main`'s merge-base once a branch exists, or just ask it to review the
  working tree).
- **`codebase-design`** — if extending the `ProgressMap`/`DayCell`
  abstraction to the Progress/Stats screens next, this skill's vocabulary
  for deep modules is directly relevant to keeping the
  Refined-Grid/Living-Cells seam clean as more screens consume it.
- **`domain-modeling`** — worth invoking if/when `DayProgress` needs to grow
  to accommodate real HealthKit/Health Connect data (the spec explicitly
  wants a service layer boundary here).
- **`tdd`** — the existing test coverage (tiers, cell-visual, home-copy,
  home-screen) sets a red-green-refactor precedent worth continuing for the
  next screens (Progress, Stats).
