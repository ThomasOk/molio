import * as Haptics from 'expo-haptics';
import * as React from 'react';
import { BackHandler } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { Easing, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { COLLAPSE_SPRING, EXPAND_SPRING } from './expansion';

/** How far down you have to drag before letting go dismisses, in px. */
const DISMISS_DISTANCE = 150;
/** …or how fast, so a quick flick works without travelling that far. */
const DISMISS_VELOCITY = 900;
/** The smallest the surface shrinks to while you drag it — it never vanishes. */
const MIN_DRAG_SCALE = 0.7;
/** How long the surface takes to become solid as it leaves its cell, in ms. */
const OPEN_FADE_MS = 110;
/**
 * …and how long it takes to dissolve on the way back — deliberately much
 * shorter than the collapse spring (which settles around 220 ms).
 *
 * The surface is a whole screen of paper contracting onto a handful of coloured
 * heatmap cells: if it stayed opaque it would *land* on them as a pale plate
 * before vanishing, which is the one thing that gave the return away as an
 * animation rather than a movement. Fading it out over the flight means it is
 * already gone by the time it is small, so what you see is the month receding
 * into the grid, and the grid coming back through it.
 */
const CLOSE_FADE_MS = 150;

/**
 * Drives one level of the expansion: opens on mount, and hands back everything
 * needed to close it — a swipe-down gesture with rubber-band resistance, the
 * Android hardware back button, and a `collapse` for an explicit back control.
 *
 * `onClose` is called only once the collapse animation has actually landed, so
 * the caller unmounts the overlay after it has shrunk back into its cell, never
 * during.
 */
export function useExpansion(onClose: () => void) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const fade = useSharedValue(0);

  React.useEffect(() => {
    progress.set(withSpring(1, EXPAND_SPRING));
    fade.set(withTiming(1, { duration: OPEN_FADE_MS, easing: Easing.out(Easing.quad) }));
  }, [progress, fade]);

  const collapse = React.useCallback(() => {
    Haptics.selectionAsync();
    // Undo any drag first, so the surface lands exactly on its origin rect.
    scale.set(withTiming(1, { duration: 180 }));
    fade.set(withTiming(0, { duration: CLOSE_FADE_MS, easing: Easing.out(Easing.quad) }));
    progress.set(
      withSpring(0, COLLAPSE_SPRING, (finished) => {
        'worklet';
        if (finished)
          scheduleOnRN(onClose);
      }),
    );
  }, [onClose, progress, scale, fade]);

  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      collapse();
      return true;
    });
    return () => sub.remove();
  }, [collapse]);

  // Drag down to dismiss: the surface shrinks with friction (a third of the
  // finger's travel) and, past the threshold, contracts back into its cell.
  const dismissGesture = Gesture.Pan()
    .activeOffsetY(20)
    .failOffsetX([-20, 20])
    .onChange((event) => {
      const pulled = Math.max(0, event.translationY) * 0.3;
      scale.set(
        Math.max(MIN_DRAG_SCALE, Math.min(1, 1 - (pulled / 400) ** 1.2)),
      );
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(collapse);
        return;
      }
      scale.set(withSpring(1, { mass: 0.3, damping: 14, stiffness: 120 }));
    });

  return { progress, scale, fade, collapse, dismissGesture };
}
