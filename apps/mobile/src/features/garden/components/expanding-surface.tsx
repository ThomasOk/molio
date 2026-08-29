import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { ExpandOrigin } from './expansion';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { SCREEN_RADIUS } from './expansion';

/**
 * A full-screen surface that grows out of `origin` as `progress` runs 0 → 1.
 *
 * The animation is the iOS home-screen expansion: the touched rect widens,
 * heightens and unfolds its corner radius into the screen. `scale` (optional)
 * shrinks the open surface — that is the swipe-down-to-dismiss handle — and
 * `fade` (optional) dissolves it, so it can leave without landing.
 *
 * Its children are laid out ONCE at full screen size and counter-translated, so
 * they stay pinned to the screen while the surface opens over them like a
 * window. Nothing reflows mid-animation, which is what makes the whole thing
 * read as a single object rather than a screen being re-laid-out.
 */
export function ExpandingSurface({
  origin,
  progress,
  color,
  children,
  scale,
  fade,
}: {
  origin: ExpandOrigin;
  progress: SharedValue<number>;
  /**
   * The surface's own colour. A shared value when it has to change while the
   * surface is open — the day zoom walks from one tier to the next — a plain
   * string when it never does.
   */
  color: string | SharedValue<string>;
  children: ReactNode;
  scale?: SharedValue<number>;
  /**
   * The surface's own opacity — 1 while it is open, run down to 0 by the
   * collapse. See `useExpansion`: it is what stops the surface from *landing*
   * on the grid as an opaque plate whose colour is not the cell's.
   */
  fade?: SharedValue<number>;
}) {
  const { width, height } = useWindowDimensions();

  const rSurface = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      width: interpolate(p, [0, 1], [origin.width, width]),
      height: interpolate(p, [0, 1], [origin.height, height]),
      borderRadius: interpolate(p, [0, 1], [origin.radius, SCREEN_RADIUS]),
      backgroundColor: typeof color === 'string' ? color : color.get(),
      // Carries the drop shadow with it, so no dark halo survives the landing.
      opacity: fade ? fade.get() : 1,
      transform: [
        { translateX: interpolate(p, [0, 1], [origin.x, 0]) },
        { translateY: interpolate(p, [0, 1], [origin.y, 0]) },
        { scale: scale ? scale.get() : 1 },
      ],
    };
  });

  const rContent = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      // Held back until the surface is most of the way open: a full screen of
      // text inside a 40 px window would only read as noise.
      opacity: interpolate(p, [0.35, 0.8], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: -interpolate(p, [0, 1], [origin.x, 0]) },
        { translateY: -interpolate(p, [0, 1], [origin.y, 0]) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.surface, rSurface]}>
      <Animated.View style={[{ width, height }, rContent]}>{children}</Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  surface: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    borderCurve: 'continuous',
    boxShadow: '0px 0px 24px rgba(34, 64, 46, 0.18)',
  },
});
