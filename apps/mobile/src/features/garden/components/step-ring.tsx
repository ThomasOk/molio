import type { SharedValue } from 'react-native-reanimated';
import type { GardenPalette } from '../palette';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { clamp, smoothstep } from '../bloom';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** Steps ÷ goal. May exceed 1; the arc clamps, the garden does not. */
  progress: SharedValue<number>;
  palette: GardenPalette;
  size?: number;
  stroke?: number;
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
 */
export function StepRing({
  progress,
  palette,
  size = 196,
  stroke = 7,
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

      {children}
    </View>
  );
}
