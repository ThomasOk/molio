import type { StrideScheme } from '@/lib/theme';

/**
 * The garden's own palette.
 *
 * Deliberately NOT the Stride tokens: this is a different art direction —
 * warm, light, botanical — and mixing the two would leave the codebase with a
 * palette that means nothing. If this DA is adopted, these values graduate into
 * `stride-tokens.ts` / `global.css` and this file disappears.
 *
 * Hex rather than OKLCH for the same reason as the Stride tokens: React
 * Native's colour parser does not understand `oklch()`.
 */

export type Hue
  = | 'blue'
    | 'coral'
    | 'cream'
    | 'lilac'
    | 'pink'
    | 'red'
    | 'white'
    | 'yellow';

export type HueColors = {
  /** Main petal fill. */
  petal: string;
  /** Petal outline — a half-pixel of it is what stops the flower reading flat. */
  edge: string;
  /** Disc floret / heart of the flower. */
  center: string;
  /** Darker core inside the disc. */
  core: string;
};

export type GardenPalette = {
  scheme: StrideScheme;
  bg: string;
  ink: string;
  inkSoft: string;
  label: string;
  card: string;
  cardBorder: string;
  chip: string;
  chipActive: string;
  /** The step ring while the goal is still open, and once it is met. */
  ring: string;
  ringTrack: string;
  ringDone: string;
  /**
   * The heatmap ramp, indexed by tier (see `tierForDay`): [empty, 1, 2, 3, 4].
   * Index 0 is an unlit cell on the paper; 1-3 climb through the garden greens,
   * each DARKER than the last so the scale reads by luminance alone (a heatmap's
   * whole job); only the top day (15 000+) BLOOMS into a deep coral — a warm peak
   * kept darker than the green below it, so the reward never breaks the order.
   * Green means "active", the coral crown rewards the biggest days. Shared by the
   * stats heatmap and the future leaderboard trend.
   */
  tiers: readonly [string, string, string, string, string];
  /**
   * The level screen's XP bar — a warm coral fill sunk into a recessed groove,
   * ringed by a crisp white bezel (variant "B"). Its own warm accent apart from
   * the green goal ring: progress on the character sheet reads as a bloom, tying
   * the bar to the profile flower and the heatmap's warm top tiers.
   *
   * `track` is the groove — a hair darker than the paper, so the empty part reads
   * as hollow; `groove` is the inset shadow that hollows it and `bezel` the white
   * ring around it. The fill rides flush in the groove with a three-stop
   * fillTop→fillMid→fillBottom coral gradient; `gloss` is the specular crest,
   * `glow` the soft coral halo bleeding past the fill.
   */
  xp: {
    track: string;
    bezel: string;
    groove: string;
    fillTop: string;
    fillMid: string;
    fillBottom: string;
    gloss: string;
    glow: string;
  };
  /**
   * The sync interaction's tint — pull-to-sync charge and the working sweep.
   *
   * The garden's own ink, never a foreign hue: the effect is glass, not colour.
   * step-ring shows it translucent and capped, so it reads as smoked glass
   * gathering over the paper rather than an opaque mark painted on it. On a light
   * ground only a dark translucency is visible — a white glint would vanish.
   */
  ringSync: string;
  /** Ground haze colour, painted as a bottom-up gradient. */
  haze: string;
  grassBack: string;
  grassFront: string;
  stem: string;
  leaf: string;
  bud: string;
  butterflyWarm: string;
  butterflyCool: string;
  hues: Record<Hue, HueColors>;
};

const LIGHT: GardenPalette = {
  scheme: 'light',
  bg: '#F7F4EC',
  ink: '#22402E',
  inkSoft: '#556A5C',
  label: '#8B9A8C',
  card: '#FFFFFF',
  cardBorder: '#E4DFD1',
  chip: '#EFEBE0',
  chipActive: '#DCE7CC',
  ring: '#3E6B47',
  ringTrack: '#E4DFD1',
  ringDone: '#7AB22C',
  tiers: ['#E7E1D2', '#CBE4A2', '#8FC24A', '#4F8E2E', '#C0492E'],
  xp: {
    track: '#E2D6BE',
    bezel: '#FFFFFF',
    groove: 'rgba(92, 68, 34, 0.24)',
    fillTop: '#F59B77',
    fillMid: '#EE7A46',
    fillBottom: '#E86A44',
    gloss: 'rgba(255, 255, 255, 0.55)',
    glow: 'rgba(232, 106, 68, 0.45)',
  },
  ringSync: '#9E5F46',
  haze: '#9DBE72',
  grassBack: '#A8C583',
  grassFront: '#6E9A4F',
  stem: '#6E9A4F',
  leaf: '#7FB05A',
  bud: '#8FBE68',
  butterflyWarm: '#F3D36B',
  butterflyCool: '#BDD9F2',
  hues: {
    white: { petal: '#FDFBF4', edge: '#DFDBCB', center: '#F2C54C', core: '#C9902A' },
    cream: { petal: '#F7ECC9', edge: '#DFCEA1', center: '#E8A62E', core: '#A9711A' },
    yellow: { petal: '#F6C948', edge: '#D6A02A', center: '#B9791C', core: '#8A5715' },
    coral: { petal: '#F08260', edge: '#D2593A', center: '#6E3524', core: '#4A2116' },
    red: { petal: '#D9503A', edge: '#B03626', center: '#58241A', core: '#3A1610' },
    blue: { petal: '#6C97DC', edge: '#4A72B8', center: '#2F4C86', core: '#22375F' },
    pink: { petal: '#F1A4B6', edge: '#D77E95', center: '#F2C54C', core: '#C08A2A' },
    lilac: { petal: '#B197D6', edge: '#8E73B4', center: '#F2C54C', core: '#C08A2A' },
  },
};

/**
 * Night garden. Same hues, pulled down in lightness and slightly in chroma —
 * the flowers stay recognisable, the scene stops glowing.
 *
 * This variant is the argument for keeping the illustration vectorial: a raster
 * watercolour garden has exactly one palette, forever.
 */
const DARK: GardenPalette = {
  scheme: 'dark',
  bg: '#0B120E',
  ink: '#E6EFE6',
  inkSoft: '#9BAB9F',
  label: '#6E7F74',
  card: '#131C17',
  cardBorder: '#22302A',
  chip: '#18231D',
  chipActive: '#26382B',
  ring: '#4E8A5A',
  ringTrack: '#1C2620',
  ringDone: '#9BD24E',
  tiers: ['#26302A', '#33552B', '#4F8A2C', '#77BE3C', '#DE6B48'],
  xp: {
    track: '#1A120D',
    bezel: '#3A241B',
    groove: 'rgba(0, 0, 0, 0.4)',
    fillTop: '#E88A63',
    fillMid: '#D2704E',
    fillBottom: '#C96A4C',
    gloss: 'rgba(255, 255, 255, 0.38)',
    glow: 'rgba(201, 106, 76, 0.5)',
  },
  ringSync: '#BD7D64',
  haze: '#24402C',
  grassBack: '#223A29',
  grassFront: '#3A6040',
  stem: '#4E7A45',
  leaf: '#5A8A4E',
  bud: '#5E8F55',
  butterflyWarm: '#D8B84E',
  butterflyCool: '#8FB2D4',
  hues: {
    white: { petal: '#E4E0D2', edge: '#A8A497', center: '#D9AE41', core: '#9A7420' },
    cream: { petal: '#D8C89F', edge: '#A4967A', center: '#C08A24', core: '#7E5514' },
    yellow: { petal: '#D6A93A', edge: '#A87F22', center: '#8A5A15', core: '#5F3D0F' },
    coral: { petal: '#C96A4C', edge: '#A0492E', center: '#54281B', core: '#361810' },
    red: { petal: '#B0402E', edge: '#8A2C1E', center: '#421B13', core: '#2A100B' },
    blue: { petal: '#5578B4', edge: '#3B5A8E', center: '#25396A', core: '#1A2949' },
    pink: { petal: '#C28393', edge: '#9C6374', center: '#C09A3C', core: '#8A6A1F' },
    lilac: { petal: '#8B78AC', edge: '#6C5A8C', center: '#C09A3C', core: '#8A6A1F' },
  },
};

export const gardenPalettes: Record<StrideScheme, GardenPalette> = {
  light: LIGHT,
  dark: DARK,
};

const HEX = /^#([0-9a-f]{6})$/i;

/**
 * Blends two hex colours.
 *
 * Used once per theme to bake atmospheric perspective into the back layers,
 * instead of wrapping them in a parent `opacity` — a translucent parent forces
 * an offscreen composite on Android, and there would be one per depth layer.
 */
export function mixHex(from: string, to: string, t: number): string {
  const a = HEX.exec(from);
  const b = HEX.exec(to);
  if (!a || !b)
    return from;

  const av = Number.parseInt(a[1], 16);
  const bv = Number.parseInt(b[1], 16);
  const channel = (shift: number) => {
    const value
      = ((av >> shift) & 0xFF) * (1 - t) + ((bv >> shift) & 0xFF) * t;
    return Math.round(value);
  };

  const packed
    = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${packed.toString(16).padStart(6, '0')}`;
}

/**
 * How far each of the four depth layers fades toward the background.
 *
 * Atmospheric perspective, baked into the colours at theme time rather than
 * applied as a parent `opacity` — a translucent parent forces an offscreen
 * composite on Android, and there would be one per layer.
 */
export const DEPTH_FADE = [0.56, 0.36, 0.16, 0] as const;

export function fadeForDepth(
  color: string,
  depth: number,
  palette: GardenPalette,
): string {
  return mixHex(color, palette.bg, DEPTH_FADE[depth] ?? 0);
}

const WHITE = '#FFFFFF';
const BLACK = '#000000';

/**
 * Nudges a colour lighter or darker.
 *
 * `amount` runs -1 → 1. Used to give every flower its own slightly different
 * take on its species colour: a patch of daisies that are all exactly
 * `#FDFBF4` reads as a repeated sprite, which is what it is.
 */
export function shiftHue(color: string, amount: number): string {
  const strength = Math.abs(amount) * 0.16;
  return mixHex(color, amount >= 0 ? WHITE : BLACK, strength);
}

/**
 * The cream the paintings are on, measured off the normalised set and identical
 * across all eight. Give the screen behind them this exact value and the
 * painting stops being a rectangle: paper and background are one surface, which
 * is what removed the alpha fade the ADR originally called for.
 *
 * The flip side is that this screen has no dark mode until the artwork is
 * repainted. ADR 0001, amendment 2026-08-25.
 */
export const GARDEN_PAPER = '#FAF4E8';

/**
 * Text that has to sit ON a tier colour — the day detail, whose whole
 * background is the cell's own tier.
 *
 * The ramp climbs in darkness by design, so there is a clean split: the top two
 * tiers (deep green, deep coral) carry the paper's cream, everything below
 * keeps the garden's ink.
 */
export function inkOnTier(
  tier: number,
  palette: GardenPalette,
): { ink: string; soft: string } {
  if (tier >= 3)
    return { ink: GARDEN_PAPER, soft: 'rgba(250, 244, 232, 0.75)' };
  return { ink: palette.ink, soft: palette.inkSoft };
}
