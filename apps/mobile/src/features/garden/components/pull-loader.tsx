import type { SharedValue } from 'react-native-reanimated';
import type { GardenPalette } from '../palette';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { clamp, mix } from '../bloom';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING = 26;
const STROKE = 3;
/** Arc length of the spinning segment, as a fraction of the circle. */
const SPINNER_FRACTION = 0.28;

type Props = {
  /** The pull-to-sync charge, 0 → 1. Drives the descent and the filling arc. */
  pull: SharedValue<number>;
  /** Whether a sync is in flight — holds the loader open and spinning. */
  syncing: boolean;
  palette: GardenPalette;
  topInset: number;
};

/**
 * The pull-to-sync loader.
 *
 * A small arc that drops from above the top edge as the finger pulls, filling
 * with the charge; when the sync fires it stays put and the arc spins; when it
 * is done it retracts back up. No disc, no background — the bare arc on the
 * paper. Nothing else on the screen moves, and it rests clear of the goal ring.
 */
export function PullLoader({ pull, syncing, palette, topInset }: Props) {
  const reduced = useReducedMotion();
  const radius = (RING - STROKE) / 2;
  const circ = 2 * Math.PI * radius;
  const center = RING / 2;
  const upright = `rotate(-90 ${center} ${center})`;

  // Rests high in the top band so its lowest edge stays above the ring below.
  const restY = topInset + 6;
  const hiddenY = restY - (RING + 24);

  // Holds the loader open + spinning while syncing, and eases the retract after.
  const hold = useSharedValue(0);
  const spin = useSharedValue(0);

  React.useEffect(() => {
    if (syncing) {
      hold.set(withTiming(1, { duration: 200 }));
      if (!reduced)
        spin.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false));
    }
    else {
      hold.set(withTiming(0, { duration: 300 }));
      cancelAnimation(spin);
      spin.set(0);
    }
    return () => cancelAnimation(spin);
  }, [syncing, reduced, hold, spin]);

  // Presence = how far the loader has dropped in: the pull, or the sync hold,
  // whichever is greater. Retract follows once both fall back to 0.
  const containerStyle = useAnimatedStyle(() => {
    const presence = Math.max(clamp(pull.get(), 0, 1), hold.get());
    return {
      opacity: presence,
      transform: [{ translateY: mix(hiddenY, restY, presence) }],
    };
  });

  const chargeProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - clamp(pull.get(), 0, 1)),
  }));
  const chargeStyle = useAnimatedStyle(() => ({ opacity: 1 - hold.get() }));

  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: hold.get(),
    transform: [{ rotate: `${spin.get() * 360}deg` }],
  }));

  const common = {
    cx: center,
    cy: center,
    r: radius,
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    fill: 'none',
    transform: upright,
  };

  return (
    <Animated.View pointerEvents="none" style={[styles.container, containerStyle]}>
      <View style={styles.ringBox}>
        {/* Charge arc — fills as the pull arms. */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, chargeStyle]}>
          <Svg width={RING} height={RING}>
            <Circle {...common} stroke={palette.ringTrack} />
            <AnimatedCircle {...common} stroke={palette.ring} strokeDasharray={circ} animatedProps={chargeProps} />
          </Svg>
        </Animated.View>

        {/* Spinner arc — rotates while syncing (a full steady ring under reduced motion). */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, spinnerStyle]}>
          <Svg width={RING} height={RING}>
            <Circle
              {...common}
              stroke={palette.ring}
              strokeDasharray={reduced ? `${circ}` : `${circ * SPINNER_FRACTION} ${circ}`}
            />
          </Svg>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  ringBox: {
    width: RING,
    height: RING,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
