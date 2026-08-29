/**
 * The shape and the physics of the zoom — kept apart from the component that
 * draws it so both the surface and the gesture hook can read them.
 */

/**
 * The rect an expansion grows out of — the tapped element, in PAGE coordinates
 * (what `measure()` returns as `pageX`/`pageY`). `radius` is the element's own
 * corner radius, so the surface starts as a copy of what was touched.
 */
export type ExpandOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

/**
 * The opening spring — damping ratio well past 1, so the surface never
 * overshoots: it *glides* open and settles in roughly 420 ms. That is the iOS
 * home-screen feel, and it honours the standing "no bounce" rule of the
 * garden's animations.
 *
 * ⚠️ Reanimated has no overdamped solution: once the ratio reaches 1 it falls
 * back to the critically damped one, where the speed is set by `stiffness/mass`
 * ALONE. Raising `damping` further changes nothing — to make the opening
 * quicker or slower, move `stiffness`.
 */
export const EXPAND_SPRING = { mass: 0.1, damping: 24, stiffness: 25 } as const;

/**
 * The closing spring — just under critical (ratio ≈ 0.98) and much stiffer, so
 * the collapse is quicker than the opening (it lands in about 220 ms). Going
 * back should feel like letting go, not like a second ceremony.
 */
export const COLLAPSE_SPRING = { mass: 0.1, damping: 4, stiffness: 42 } as const;

/**
 * The corner radius the surface reaches at full screen. Matches a modern
 * phone's display radius closely enough that the open surface reads as the
 * screen itself, with the blurred screen behind peeking at the corners.
 */
export const SCREEN_RADIUS = 44;
