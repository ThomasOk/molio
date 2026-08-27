import { BlurView } from 'expo-blur';
import * as React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { strideFonts } from '@/lib/theme';

type Props = {
  title: string;
};

/**
 * A "liquid glass" toast card.
 *
 * The frost is a real `BlurView`, so the scene behind it bleeds through blurred
 * rather than being hidden by a solid panel. On top of it sit the pieces that
 * sell glass: a milky white wash for legibility and body, and a bright hairline
 * along the edge for the lit rim. The blur intensity is never animated — only
 * the whole card transforms, which sonner does — so it stays cheap on Android.
 *
 * Two nested views on purpose: the outer one carries the drop shadow, the inner
 * one clips the blur to the corner radius. A single view cannot do both — a clip
 * (`overflow: 'hidden'`) eats the shadow.
 */
export function GlassToast({ title }: Props) {
  return (
    <View style={styles.shadow}>
      <View style={styles.card}>
        <BlurView
          intensity={58}
          tint="light"
          // Opt Android into a real blur; iOS blurs natively either way.
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.wash} />

        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>

        <View pointerEvents="none" style={styles.rim} />
      </View>
    </View>
  );
}

const RADIUS = 13;

const styles = StyleSheet.create({
  shadow: {
    alignSelf: 'stretch',
    marginHorizontal: 12,
    borderRadius: RADIUS,
    ...Platform.select({
      ios: {
        shadowColor: '#1A2A1F',
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
    }),
  },
  card: {
    width: '100%',
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  // Milky wash over the blur: gives the glass body and keeps dark text legible
  // whatever passes behind. Kept light so the frost stays see-through.
  wash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  // The lit edge that reads as a pane of glass rather than a flat rectangle.
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 13,
    paddingHorizontal: 17,
  },
  title: {
    flexShrink: 1,
    fontFamily: strideFonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: '#1E2A22',
  },
});
