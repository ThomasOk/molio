/**
 * Stride design tokens, in a form the JS layer can consume.
 *
 * Source of truth: the Claude Design project (`Stride - Design System.dc.html`).
 * Keep this file in sync with the `@theme` / `@variant` blocks in
 * `src/global.css` — the CSS drives `className` styling for the product UI,
 * this module drives the progress-visualisation layer, whose colours are
 * derived from data (a day's tier) and therefore cannot be static classes.
 *
 * All OKLCH values from the design are pre-converted to sRGB hex: React
 * Native's colour parser does not understand `oklch()`.
 */

export type StrideScheme = 'dark' | 'light';

/** Base-4 spacing scale. Screen gutter 20, inter-block 24, section 40. */
export const strideSpacing = {
  'xs': 4,
  'sm': 8,
  'md': 12,
  'lg': 16,
  'gutter': 20,
  'xl': 24,
  '2xl': 32,
  '3xl': 40,
} as const;

/**
 * Radii. `cell` belongs to the Refined Grid cell only — product containers must
 * never inherit it, which is what lets the app swap in Living Cells without
 * looking inconsistent.
 */
export const strideRadius = {
  'cell': 3,
  'sm': 8,
  'md': 12,
  'lg': 16,
  'xl': 20,
  '2xl': 24,
  'pill': 999,
} as const;

export type StridePalette = {
  bg: string;
  elevated: string;
  surface: string;
  raised: string;
  border: string;
  hairline: string;
  ring: string;
  primary: string;
  primaryDim: string;
  accent: string;
  accentRing: string;
  xp: string;
  xpDim: string;
  text: string;
  textSecondary: string;
  /** Body copy — a step softer than `text`, per the design's Body token. */
  textBody: string;
  /** Tertiary mono labels ("DAY STREAK", "SAT 22 AUG"). */
  label: string;
  muted: string;
  inactive: string;
  danger: string;
  onAccent: string;
  /** Ring drawn around today's cell and the selected cell. */
  focusRing: string;
  /** Fill of a gauge segment once the goal is met. */
  goalFill: string;
  /** Today's gauge fill, bottom-to-top, while the goal is still open. */
  gaugeFrom: string;
  gaugeTo: string;
  /** Today's gauge fill once the goal is met — it warms towards the accent. */
  gaugeDoneFrom: string;
  gaugeDoneTo: string;
};

export const stridePalettes: Record<StrideScheme, StridePalette> = {
  dark: {
    bg: '#0A0D0B',
    elevated: '#0E1310',
    surface: '#111614',
    raised: '#181F1B',
    border: '#1F2622',
    hairline: 'rgba(255,255,255,0.06)',
    ring: 'rgba(255,255,255,0.07)',
    primary: '#54C66C',
    primaryDim: '#3C8D57',
    accent: '#C0F35D',
    accentRing: 'rgba(192,243,93,0.20)',
    xp: '#E6B55D',
    xpDim: '#A67F38',
    text: '#E8EFE9',
    textSecondary: '#8C9A90',
    textBody: '#C9D5CD',
    label: '#6E7C74',
    muted: '#5E6B63',
    inactive: '#1B221E',
    danger: '#BF6C58',
    onAccent: '#06120B',
    focusRing: '#FFFFFF',
    goalFill: '#B0EE65',
    gaugeFrom: '#3C8D57',
    gaugeTo: '#54C66C',
    gaugeDoneFrom: '#54C66C',
    gaugeDoneTo: '#C0F35D',
  },
  light: {
    bg: '#F3F5F0',
    elevated: '#FFFFFF',
    surface: '#EAEEE7',
    raised: '#E1E7DC',
    border: '#D6DED1',
    hairline: 'rgba(10,20,14,0.08)',
    ring: 'rgba(10,20,14,0.07)',
    primary: '#2A904B',
    primaryDim: '#73B785',
    accent: '#7AB22C',
    accentRing: 'rgba(122,178,44,0.25)',
    xp: '#B07A20',
    xpDim: '#C9A05A',
    text: '#0F1512',
    textSecondary: '#5A665E',
    textBody: '#2E3A33',
    label: '#7A867E',
    muted: '#8A968D',
    inactive: '#DDE3D9',
    danger: '#B05139',
    onAccent: '#F3F5F0',
    focusRing: '#0F1512',
    goalFill: '#1B7E2A',
    gaugeFrom: '#2A904B',
    gaugeTo: '#4EA954',
    gaugeDoneFrom: '#1B7E2A',
    gaugeDoneTo: '#499537',
  },
};

/**
 * Eight-step progress ramp. The index is the progress tier (see
 * `@/features/progress/tiers`), so `ramp[tier(percentage)]` is the fill.
 */
export const strideProgressRamp: Record<StrideScheme, readonly string[]> = {
  dark: [
    '#1B221E', // 0 — inactive
    '#2C513C', // 1 — 1-25%
    '#336F4B', // 2 — 25-50%
    '#3C8D57', // 3 — 50-75%
    '#47AA62', // 4 — 75-99%
    '#54C66C', // 5 — 100-119%
    '#88DE68', // 6 — 120-179%
    '#C0F35D', // 7 — 180%+
  ],
  light: ['#DDE3D9', '#B5DDBE', '#94CF9F', '#6DB979', '#4CA65A', '#2A904B', '#1B7E2A', '#1B6A00'],
};

/**
 * Glow applied to the top three tiers only, keyed by `tier - 5`.
 * `blur` is a multiplier of the cell size; dark mode only — the design drops
 * glow entirely on light backgrounds.
 */
export const strideGlow = {
  'refined-grid': [
    { color: 'rgba(80,220,140,0.22)', blur: 0.55 },
    { color: 'rgba(150,235,110,0.28)', blur: 0.8 },
    { color: 'rgba(183,240,90,0.38)', blur: 1.05 },
  ],
  'living-cells': [
    { color: 'rgba(80,220,140,0.30)', blur: 0.75 },
    { color: 'rgba(150,235,110,0.38)', blur: 1 },
    { color: 'rgba(183,240,90,0.50)', blur: 1.35 },
  ],
} as const;

/** Font families, one per weight — RN does not synthesise custom-font weights. */
export const strideFonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  black: 'Manrope_800ExtraBold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

/** Motion durations from the design's animation table. */
export const strideMotion = {
  stepCounter: 600,
  cellFill: 220,
  goalReached: 420,
  xpBar: 500,
  xpBarDelay: 120,
  sheetOpen: 320,
} as const;
