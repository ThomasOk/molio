import * as Haptics from 'expo-haptics';
import * as React from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { clamp } from './bloom';

/** How far, in points, the finger travels down to arm a sync. */
const PULL_THRESHOLD = 96;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Pull down anywhere to sync — hand-rolled because it is the home screen's
 * signature interaction, and the native RefreshControl's one non-negotiable is
 * that it shoves the content down. Here the content never translates: the drag
 * only charges `pull`, which a small loader at the top renders as it drops in.
 *
 * The commit is distance-based, not velocity-based: this is a deliberate
 * "sync now", not a flick, so arming asks for a real pull past the threshold.
 */
export function usePullToSync({
  enabled,
  onSync,
}: {
  enabled: boolean;
  onSync: () => void;
}) {
  // 0 → 1 charge, read by the top loader. Never translates the content.
  const pull = useSharedValue(0);
  // Latches once per drag so the arm haptic fires exactly once at the threshold.
  const armed = useSharedValue(false);

  const gesture = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        // Only a downward drag is ours; an upward one fails immediately so it
        // never swallows other gestures.
        .activeOffsetY(14)
        .failOffsetY(-14)
        .onUpdate((event) => {
          if (event.translationY <= 0) {
            pull.set(0);
            return;
          }
          const charge = clamp(event.translationY / PULL_THRESHOLD, 0, 1);
          pull.set(charge);

          // Arm the moment the arc fills, disarm if the finger backs off — the
          // haptic marks the point where a release would actually sync.
          if (!armed.get() && charge >= 1) {
            armed.set(true);
            scheduleOnRN(Haptics.selectionAsync);
          }
          else if (armed.get() && charge < 1) {
            armed.set(false);
          }
        })
        .onEnd(() => {
          const fire = armed.get();
          armed.set(false);
          pull.set(withTiming(0, { duration: 320, easing: EASE_OUT }));
          if (fire)
            scheduleOnRN(onSync);
        }),
    [enabled, onSync, pull, armed],
  );

  return { gesture, pull };
}
