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

import { clamp, smoothstep } from '../bloom';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** How much of the ring the sync sweep covers, as a fraction of the circle. */
const SWEEP_FRACTION = 0.22;

/**
 * Opacity ceilings for the sync marks. At 1 the ringSync colour shows at full
 * strength; drop toward ~0.5 to turn either mark back into translucent glass —
 * worth doing only with a colour whose lightness already contrasts the paper,
 * since opacity cannot buy contrast a small L gap doesn't have.
 */
const CHARGE_MAX_OPACITY = 1;
const SWEEP_MAX_OPACITY = 1;

type Props = {
  /** Steps ÷ goal. May exceed 1; the arc clamps, the garden does not. */
  progress: SharedValue<number>;
  palette: GardenPalette;
  size?: number;
  stroke?: number;
  /**
   * Pull-to-sync charge, 0 → 1. When supplied, a brighter arc draws over the
   * track as the gesture arms, so the ring the user is already looking at is
   * the affordance — no extra chrome, nothing translates.
   */
  pull?: SharedValue<number>;
  /**
   * Whether a sync is in flight. When true, a short arc sweeps around the ring
   * as an indeterminate "working" cue; the bloom that follows is the payoff.
   */
  syncing?: boolean;
  children?: React.ReactNode;
};

/**
 * The goal ring.
 *
 * This is the one place in the screen that animates an SVG property rather than
 * a view transform — `strokeDashoffset`, which no transform can fake without
 * distorting the stroke. It is a single node, which is exactly the budget that
 * path is worth: 27 of these would be a different story.
 *
 * The completed-goal colour is *not* animated as a prop. A second arc in the
 * brighter colour sits in its own `Animated.View` and crossfades, so the colour
 * change is a layer opacity rather than a per-frame SVG repaint.
 *
 * Two optional overlays turn the ring into the pull-to-sync instrument: a charge
 * arc driven by `pull`, and a sweeping arc shown while `syncing`. Both are inert
 * — zero opacity, no running animation — when their input is idle, so the ring
 * still renders no frames at rest.
 */
export function StepRing({
  progress,
  palette,
  size = 196,
  stroke = 7,
  pull,
  syncing,
  children,
}: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const spin = `rotate(-90 ${center} ${center})`;

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - clamp(progress.get(), 0, 1)),
  }));

  const doneStyle = useAnimatedStyle(() => ({
    opacity: smoothstep(0.88, 1, progress.get()),
  }));

  const { chargeProps, chargeStyle } = useChargeArc(circumference, pull);
  const sweepStyle = useSyncSweep(syncing);

  const common = {
    cx: center,
    cy: center,
    r: radius,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    fill: 'none',
    transform: spin,
  };

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle {...common} stroke={palette.ringTrack} />
        <AnimatedCircle
          {...common}
          stroke={palette.ring}
          strokeDasharray={circumference}
          animatedProps={arcProps}
        />
      </Svg>

      <Animated.View style={[StyleSheet.absoluteFill, doneStyle]}>
        <Svg width={size} height={size}>
          <AnimatedCircle
            {...common}
            stroke={palette.ringDone}
            strokeDasharray={circumference}
            animatedProps={arcProps}
          />
        </Svg>
      </Animated.View>

      {pull != null && (
        <Animated.View style={[StyleSheet.absoluteFill, chargeStyle]}>
          <Svg width={size} height={size}>
            <AnimatedCircle
              {...common}
              stroke={palette.ringSync}
              strokeDasharray={circumference}
              animatedProps={chargeProps}
            />
          </Svg>
        </Animated.View>
      )}

      {syncing != null && (
        <Animated.View style={[StyleSheet.absoluteFill, sweepStyle]}>
          <Svg width={size} height={size}>
            <Circle
              {...common}
              stroke={palette.ringSync}
              strokeDasharray={`${circumference * SWEEP_FRACTION} ${circumference}`}
            />
          </Svg>
        </Animated.View>
      )}

      {children}
    </View>
  );
}

/**
 * Charge arc — draws from nothing to a full ring as the pull arms, and fades in
 * with it so it is invisible at rest. `pull` is optional; when absent the arc
 * stays empty and transparent and the caller renders nothing.
 */
function useChargeArc(circumference: number, pull?: SharedValue<number>) {
  const chargeProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - clamp(pull?.get() ?? 0, 0, 1)),
  }));
  const chargeStyle = useAnimatedStyle(() => ({
    opacity: clamp(pull?.get() ?? 0, 0, 1) * CHARGE_MAX_OPACITY,
  }));
  return { chargeProps, chargeStyle };
}

/**
 * Sweep — a short arc that rotates while a sync is in flight. Reduced motion
 * drops the rotation and breathes the opacity instead, which still reads as
 * "busy". Idle, nothing runs, so the ring renders no frames at rest.
 */
function useSyncSweep(syncing?: boolean) {
  const reduced = useReducedMotion();
  const spin = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (syncing) {
      if (reduced) {
        opacity.set(0.2);
        opacity.set(
          withRepeat(
            withTiming(SWEEP_MAX_OPACITY, { duration: 700 }),
            -1,
            true,
          ),
        );
      }
      else {
        opacity.set(withTiming(SWEEP_MAX_OPACITY, { duration: 200 }));
        spin.set(
          withRepeat(
            withTiming(1, { duration: 1000, easing: Easing.linear }),
            -1,
            false,
          ),
        );
      }
    }
    else {
      cancelAnimation(spin);
      spin.set(0);
      opacity.set(withTiming(0, { duration: 300 }));
    }
    return () => cancelAnimation(spin);
  }, [syncing, reduced, spin, opacity]);

  return useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ rotate: `${spin.get() * 360}deg` }],
  }));
}
