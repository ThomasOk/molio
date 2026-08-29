import { BlurView } from 'expo-blur';
import * as React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { strideFonts } from '@/lib/theme';

type Props = {
  title: string;
};

/**
 * A "liquid glass" toast card — real glass on iOS, painted glass on Android.
 *
 * On iOS the frost is a `BlurView`, so the scene behind it bleeds through
 * blurred rather than being hidden by a solid panel. On top of it sit the
 * pieces that sell glass: a milky white wash for legibility and body, and a
 * bright hairline along the edge for the lit rim.
 *
 * Two nested views on purpose: the outer one carries the drop shadow, the inner
 * one clips the blur to the corner radius. A single view cannot do both — a clip
 * (`overflow: 'hidden'`) eats the shadow.
 *
 * ⚠️ Android gets NONE of that — no BlurView, no stacked layers. Two reasons,
 * and they compound:
 *
 * 1. `expo-blur` is opt-in on Android for a reason: its own docs call that path
 *    experimental and warn it "may cause performance and graphical issues". It
 *    recaptures and reblurs the hierarchy behind it on EVERY frame, for as long
 *    as the card is mounted — four seconds over an animating garden — and the
 *    cost lands on whatever else needs those frames. That is what made a screen
 *    transition judder and washed the incoming screen dark.
 * 2. With the blur gone, the layers it justified became scaffolding holding
 *    nothing up. Sonner exits a toast on a single opacity, and Android
 *    propagates that alpha to each child separately rather than flattening the
 *    group first: stacked translucent layers then fade out of step with each
 *    other, and the text reads as leaving before the card it sits on.
 *
 * So on Android the card is exactly one opaque view and its text. Nothing to
 * desynchronise. If the blur is ever reinstated, the prop was
 * `experimentalBlurMethod="dimezisBlurView"` — and these layers come back with
 * it, along with the reason they were a problem.
 */
export function GlassToast({ title }: Props) {
  return (
    <View style={styles.shadow}>
      <View style={styles.card}>
        {Platform.OS === 'ios' && (
          <>
            <BlurView intensity={58} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.wash} />
            <View pointerEvents="none" style={styles.rim} />
          </>
        )}

        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
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
    // No Android `elevation` on purpose: its shadow is drawn by the system from
    // the view's outline, outside the alpha the exit animation is running, so
    // it is the one layer that cannot fade in step with the rest. The card's
    // hairline border does the separating instead.
    ...Platform.select({
      ios: {
        shadowColor: '#1A2A1F',
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
    }),
  },
  card: {
    width: '100%',
    borderRadius: RADIUS,
    overflow: 'hidden',
    // On Android the card IS this view: one opaque surface and its text, no
    // stack of translucent layers to fade out of step. Warm near-white rather
    // than pure white, so it reads as a leaf of the garden's own paper lifted
    // off the page, not as a system dialog.
    ...Platform.select({
      android: {
        backgroundColor: '#FCF9F2',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(30, 42, 34, 0.12)',
      },
    }),
  },
  // Milky wash over the blur: gives the glass body and keeps dark text legible
  // whatever passes behind. Kept light so the frost stays see-through. iOS only.
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
