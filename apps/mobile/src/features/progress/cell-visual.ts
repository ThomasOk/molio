import type { BoxShadowValue, ViewStyle } from 'react-native';
import type { ProgressTier } from './tiers';
import type { ProgressVariant } from './types';
import type { StrideTheme } from '@/lib/theme';

import { strideGlow } from '@/lib/theme';
import { GLOW_FROM_TIER, TIER_SCALE } from './tiers';

/**
 * Geometry and paint for a single day cell, for either visualisation variant.
 *
 * Kept as a pure function rather than inline styles so the two variants can be
 * compared, snapshot-tested and tuned without touching a component tree. Values
 * mirror `cell()` in the Claude Design source.
 */

/**
 * Living Cells lifts a measured-but-empty day slightly off the Refined Grid's
 * inactive colour, so a zero-step day still reads as a cell and not a hole.
 */
const ZERO_TIER_FILL: Record<'dark' | 'light', string> = {
  dark: '#202723',
  light: '#DDE3D9',
};

export type DayCellVisual = {
  /** Fixed-size box that keeps cells on a grid regardless of inner scale. */
  box: ViewStyle;
  /** The shape itself. */
  inner: ViewStyle;
  /** Fill colour for today's bottom-up progress fill, or null when not today. */
  todayFillColor: string | null;
  /** Height of that fill, 0-1 of the cell. */
  todayFillRatio: number;
  /** Living Cells' specular core, present on the top tiers only. */
  coreHighlight: ViewStyle | null;
};

type Params = {
  variant: ProgressVariant;
  tier: ProgressTier;
  size: number;
  theme: StrideTheme;
  isToday?: boolean;
  isSelected?: boolean;
  /** Today's progress, used for the bottom-up fill. Uncapped values clamp. */
  percentage?: number;
};

function cornerRadius(variant: ProgressVariant, diameter: number): number {
  return variant === 'living-cells'
    ? diameter / 2
    : Math.max(1.2, diameter * 0.22);
}

function boxFor(size: number): ViewStyle {
  return {
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

/** Today is a partially-filled cell with a ring — never just another colour. */
function todayVisual({ variant, size, theme, percentage = 0 }: Params): DayCellVisual {
  const { colors, isDark } = theme;
  const diameter = variant === 'living-cells' ? size * 0.96 : size;

  return {
    box: boxFor(size),
    coreHighlight: null,
    todayFillColor: colors.accent,
    todayFillRatio: Math.min(1, Math.max(0, percentage / 100)),
    inner: {
      width: diameter,
      height: diameter,
      borderRadius: cornerRadius(variant, diameter),
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(10,20,14,0.06)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(10,20,14,0.35)',
      overflow: 'hidden',
      justifyContent: 'flex-end',
      ...(isDark && {
        boxShadow: [
          { offsetX: 0, offsetY: 0, blurRadius: size * 1.1, color: 'rgba(183,240,90,0.42)' },
        ],
      }),
    },
  };
}

/** No measurement: an outline in Refined Grid, a bare dot in Living Cells. */
function noDataVisual({ variant, size, theme }: Params): DayCellVisual {
  const base = {
    box: boxFor(size),
    todayFillColor: null,
    todayFillRatio: 0,
    coreHighlight: null,
  };

  if (variant === 'living-cells') {
    const dot = Math.max(1.6, size * 0.2);

    return {
      ...base,
      inner: {
        width: dot,
        height: dot,
        borderRadius: dot / 2,
        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(10,20,14,0.10)',
      },
    };
  }

  return {
    ...base,
    inner: {
      width: size,
      height: size,
      borderRadius: cornerRadius(variant, size),
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.ring,
    },
  };
}

function shadowsFor({
  variant,
  tier,
  size,
  isDark,
}: {
  variant: ProgressVariant;
  tier: ProgressTier;
  size: number;
  isDark: boolean;
}): BoxShadowValue[] {
  const glowing = isDark && tier >= GLOW_FROM_TIER;
  const shadows: BoxShadowValue[] = [];

  // Refined Grid's depth cue: a half-pixel highlight along the top edge.
  if (variant === 'refined-grid' && isDark) {
    shadows.push({
      offsetX: 0,
      offsetY: 0.5,
      blurRadius: 0,
      inset: true,
      color: glowing ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.10)',
    });
  }

  if (glowing) {
    const glow = strideGlow[variant][tier - GLOW_FROM_TIER];
    shadows.push({
      offsetX: 0,
      offsetY: 0,
      blurRadius: size * glow.blur,
      color: glow.color,
    });
  }

  return shadows;
}

function filledVisual({
  variant,
  tier,
  size,
  theme,
  isSelected = false,
}: Params): DayCellVisual {
  const { colors, ramp, isDark, scheme } = theme;
  const diameter = size * (TIER_SCALE[variant][tier] ?? 1);
  const isLivingCells = variant === 'living-cells';

  const inner: ViewStyle = {
    width: diameter,
    height: diameter,
    borderRadius: cornerRadius(variant, diameter),
    backgroundColor: isLivingCells && tier === 0 ? ZERO_TIER_FILL[scheme] : ramp[tier],
    overflow: 'hidden',
  };

  const shadows = shadowsFor({ variant, tier, size, isDark });
  if (shadows.length > 0)
    inner.boxShadow = shadows;

  if (isSelected) {
    inner.borderWidth = 1.5;
    inner.borderColor = colors.focusRing;
    inner.boxShadow = [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: size * 1.3,
        color: isDark ? 'rgba(255,255,255,0.26)' : 'rgba(10,20,14,0.18)',
      },
    ];
  }

  return {
    box: boxFor(size),
    inner,
    todayFillColor: null,
    todayFillRatio: 0,
    coreHighlight:
      isLivingCells && tier >= GLOW_FROM_TIER
        ? {
            position: 'absolute',
            width: diameter * 0.62,
            height: diameter * 0.62,
            borderRadius: diameter * 0.31,
            left: diameter * 0.05,
            top: -diameter * 0.01,
            backgroundColor: 'rgba(255,255,255,0.22)',
          }
        : null,
  };
}

/**
 * Resolves a day to its drawing instructions. The three branches are the three
 * genuinely different states: in progress, unmeasured, and finished.
 */
export function dayCellVisual(params: Params): DayCellVisual {
  if (params.isToday)
    return todayVisual(params);

  if (params.tier < 0)
    return noDataVisual(params);

  return filledVisual(params);
}
