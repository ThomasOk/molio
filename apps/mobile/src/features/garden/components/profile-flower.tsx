import type { GardenPalette } from '../palette';
import { Image } from 'expo-image';
import * as React from 'react';
import { View } from 'react-native';

import { PROFILE } from '../profile';
import { FlowerAvatar } from './flower-avatar';

type Props = {
  size: number;
  palette: GardenPalette;
};

/**
 * The player's portrait.
 *
 * Prefers the hand-painted watercolour flower (a raster matching the garden's
 * frames) when one is set on the profile; otherwise falls back to the
 * recolourable vector `FlowerAvatar` — the same primitive the leaderboard rows
 * use. Both wear the identical frame (white ground, hairline ring) so swapping
 * one for the other never shifts the layout, from the 40 px home portrait to the
 * big level-screen one.
 */
export function ProfileFlower({ size, palette }: Props) {
  if (PROFILE.avatar == null)
    return <FlowerAvatar hue={PROFILE.flower} size={size} palette={palette} />;

  // Matches FlowerAvatar's hairline frame so the two are interchangeable.
  const frame = Math.max(1.5, size * 0.04);

  // Framing tuned to `profile-poppy.png`: the square painting sits the bloom in
  // its upper two-thirds over a long stem. We zoom in a touch and bias upward so
  // the corolla fills the round portrait and the stem drops out of frame — a
  // poppy face, not a small flower on a stalk. Retune ZOOM/RISE for a new asset.
  const ZOOM = 1.25;
  const RISE = 0.06;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: frame,
        borderColor: palette.cardBorder,
        backgroundColor: palette.card,
        overflow: 'hidden',
      }}
    >
      <Image
        source={PROFILE.avatar}
        style={{
          width: size * ZOOM,
          height: size * ZOOM,
          marginLeft: (-size * (ZOOM - 1)) / 2,
          marginTop: -size * RISE,
        }}
        contentFit="cover"
      />
    </View>
  );
}
