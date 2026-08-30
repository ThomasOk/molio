import type { TextStyle } from 'react-native';
import type { GardenPalette } from '../palette';
import * as React from 'react';
import { Text } from 'react-native';

import { strideFonts } from '@/lib/theme';

/**
 * The garden's type scale.
 *
 * Reuses Stride's font files (Manrope / JetBrains Mono) rather than inventing a
 * second typeface — the two systems disagree on colour and surface, not on
 * letterforms. `title`/`label`/`body` mirror Stride's `h1`/`label`/`body` sizes
 * so a screen moving from one system to the other keeps its rhythm; `band` and
 * `caption` are the garden's own (the day's step band, the small captions under
 * the ring).
 */
export type GardenTextVariant = 'band' | 'body' | 'caption' | 'label' | 'title';

const G_STYLES: Record<GardenTextVariant, TextStyle> = {
  label: {
    fontFamily: strideFonts.mono,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: { fontFamily: strideFonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.56 },
  band: { fontFamily: strideFonts.bold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: strideFonts.medium, fontSize: 15, lineHeight: 23 },
  caption: { fontFamily: strideFonts.medium, fontSize: 13, lineHeight: 18 },
};

/** Ink colour by variant — `title`/`band` read full ink, the rest read softer. */
function inkFor(palette: GardenPalette, variant: GardenTextVariant): string {
  switch (variant) {
    case 'label':
      return palette.label;
    case 'caption':
    case 'body':
      return palette.inkSoft;
    case 'title':
    case 'band':
      return palette.ink;
  }
}

/**
 * Text coloured from a `GardenPalette` instead of the Stride tokens.
 *
 * Extracted from the home screen so the tab bar and the still-placeholder
 * Progress/Stats/Profile screens can read as the same system as Home now that
 * Home is the garden — see the 2026-08-30 navigation handoff. Pass `style` to
 * override size or colour for a one-off use (the tab bar's tiny tracked label,
 * for instance) without adding a variant just for it.
 */
export function GardenText({
  palette,
  variant,
  style,
  children,
}: {
  palette: GardenPalette;
  variant: GardenTextVariant;
  style?: TextStyle;
  children: React.ReactNode;
}) {
  return (
    <Text style={[G_STYLES[variant], { color: inkFor(palette, variant) }, style]}>
      {children}
    </Text>
  );
}
