import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/** How far the incoming page travels, in px — a nudge, not a carousel. */
const PAGE_SHIFT = 28;
/** The dip the page fades from; it never blanks out completely. */
const PAGE_DIM = 0.2;
/**
 * How long the slide takes. Exported because the day zoom crossfades its colour
 * on the same clock, so the paper and the words arrive together.
 */
export const PAGE_MS = 240;

/**
 * The sideways walk, shared by the month zoom and the day zoom.
 *
 * Only ever one page is mounted: swapping the content and replaying a short
 * slide + fade reads as movement well enough, and it keeps the measuring honest
 * — one grid, one rect, always the one under the finger.
 *
 * `slide` is called AFTER the content has changed, and only if it actually
 * changed: a swipe into the edge of the window should feel like a wall, not
 * like a page that came back. Its `delta` is the direction you walked, so the
 * new page always enters from the side you came from.
 */
export function usePageSlide() {
  const shift = useSharedValue(0);
  const fade = useSharedValue(1);

  const slide = (delta: number) => {
    shift.set(delta * PAGE_SHIFT);
    shift.set(withTiming(0, { duration: PAGE_MS, easing: Easing.out(Easing.cubic) }));
    fade.set(PAGE_DIM);
    fade.set(withTiming(1, { duration: PAGE_MS }));
  };

  const rPage = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateX: shift.get() }],
  }));

  return { slide, rPage };
}
