import type { SharedValue } from 'react-native-reanimated';
import type { GardenPalette } from '../palette';
import * as React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { clamp, MAX_STEPS } from '../bloom';

const TRACK_HEIGHT = 6;
const THUMB = 26;

type Props = {
  progress: SharedValue<number>;
  palette: GardenPalette;
  /** Called once, on release — never per frame. */
  onCommit: (steps: number) => void;
};

/**
 * Drag the garden through its whole range.
 *
 * This is the lab's real instrument: buttons show you six frames, the scrubber
 * shows you the continuum between them, which is the thing that either feels
 * organic or does not. It writes `progress` directly on the UI thread — no
 * timing curve, no spring, the finger *is* the animation.
 */
export function BloomScrubber({ progress, palette, onCommit }: Props) {
  const trackWidth = useSharedValue(1);

  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        // Let a vertical drag through to the ScrollView underneath.
        .activeOffsetX([-8, 8])
        .failOffsetY([-12, 12])
        .onStart((event) => {
          progress.set(clamp(event.x / trackWidth.get(), 0, 1));
        })
        .onUpdate((event) => {
          progress.set(clamp(event.x / trackWidth.get(), 0, 1));
        })
        // The only hop back to the RN runtime, and it happens once per drag.
        // The same call in `onUpdate` would fire 120 times a second.
        .onEnd(() => {
          scheduleOnRN(onCommit, progress.get() * MAX_STEPS);
        }),
    [onCommit, progress, trackWidth],
  );

  // An absolutely positioned, childless element is the one case where animating
  // `width` beats `scaleX`: nothing re-lays-out, and the rounded cap keeps its
  // shape instead of being smeared by the scale.
  const fillStyle = useAnimatedStyle(() => ({
    width: clamp(progress.get(), 0, 1) * trackWidth.get(),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: clamp(progress.get(), 0, 1) * trackWidth.get() - THUMB / 2,
      },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View
        // Generous vertical padding: the visible track is 6pt tall, the touch
        // target has to be 44.
        style={{ paddingVertical: 19, justifyContent: 'center' }}
        onLayout={(event) => {
          trackWidth.set(Math.max(event.nativeEvent.layout.width, 1));
        }}
      >
        <View
          style={{
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT,
            backgroundColor: palette.ringTrack,
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              height: TRACK_HEIGHT,
              borderRadius: TRACK_HEIGHT,
              backgroundColor: palette.ringDone,
            },
            fillStyle,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB,
              borderWidth: 3,
              borderColor: palette.ringDone,
              backgroundColor: palette.card,
            },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}
