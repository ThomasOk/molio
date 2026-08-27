import type { SharedValue } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as React from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { clamp } from '../bloom';

/**
 * The garden, as seventeen painted frames that hold still and cross-fade only
 * when a frame is actually crossed.
 *
 * The engine is deliberately not Skia. See ADR 0001, amendment 2026-08-25: the
 * one canvas / zero native views argument was the answer to the SVG spike and
 * its hundreds of views; a flipbook shows two images, so all that is left is a
 * plain opacity cross-fade that `<Image>` and Reanimated already do.
 *
 * Two images are mounted at a time and never more, whatever the frame count.
 * Seventeen full-frame layers would decode to ~100 MB, and the performance
 * contract caps the whole garden at 25 MB resident.
 */

/**
 * The seventeen render frames, bare ground through full bloom.
 *
 * Only eight of these are painted — they are the milestones. The nine others
 * are baked offline by `bake-frames.sh`, dissolving one painting into the next
 * through a blurred noise threshold, so that every frame is a whole watercolour
 * rather than a blend of two: at any threshold each pixel comes from one
 * painting or the other, never from an average of both.
 *
 * That is the whole reason there are seventeen. With a plain opacity fade, an
 * image that changes continuously with the step count is a blurred image at
 * rest — the fluidity and the blur are the same thing, and you cannot keep one
 * without the other. Baking the dissolve buys the continuity back: the motion
 * is quantised to sixteen crossings instead of being infinitely smooth, and
 * every point it can stop on is sharp.
 */
const FRAMES = [
  require('../assets/frame-00.jpg'),
  require('../assets/frame-01.jpg'),
  require('../assets/frame-02.jpg'),
  require('../assets/frame-03.jpg'),
  require('../assets/frame-04.jpg'),
  require('../assets/frame-05.jpg'),
  require('../assets/frame-06.jpg'),
  require('../assets/frame-07.jpg'),
  require('../assets/frame-08.jpg'),
  require('../assets/frame-09.jpg'),
  require('../assets/frame-10.jpg'),
  require('../assets/frame-11.jpg'),
  require('../assets/frame-12.jpg'),
  require('../assets/frame-13.jpg'),
  require('../assets/frame-14.jpg'),
  require('../assets/frame-15.jpg'),
  require('../assets/frame-16.jpg'),
] as const;

/**
 * The frames are evenly spaced in steps — one every 1 250 — and deliberately
 * not aligned on MILESTONES.
 *
 * MILESTONES is copy: five paliers every 2 000 steps, then jumps of 5 000. Key
 * the rendering to it and the garden inherits that unevenness as rhythm. Over a
 * full sweep the crossings would land 1 901, 494, 347, 276, 233, 670 and
 * 2 580 ms apart — the middle a blur, the ends a stall. Evenly spaced in steps
 * they land 1 625, 422, 296, 236, 199, 174, 156, 141, 141, 156, 174, 199, 236,
 * 296, 422, 1 625 ms apart: symmetric, median 236 ms, and the two long ones are
 * just the ease-in and ease-out of the step animation, where a pause belongs.
 *
 * This is also what bloom.ts already says the model is: the paliers are labels,
 * never render states.
 */
const LAST_FRAME = FRAMES.length - 1;
const LAST_PAIR = LAST_FRAME - 1;

/** Aspect of the source paintings, 1024 × 1536. */
const FRAME_ASPECT = 1536 / 1024;

/**
 * How much the painting grows across the whole range, anchored at the bottom.
 *
 * The ADR asks for this so a delta that crosses no frame at all still shows
 * something. It rides total progress rather than the position between two
 * frames: per-frame it would snap back to 1 at every crossing, which is the one
 * thing a continuous feedback must not do.
 */
const SCALE_SPAN = 0.05;

/**
 * How long one frame takes to fade into the next.
 *
 * Set against the rate frames are crossed, not against how a single fade feels:
 * a fade shorter than the gap between two crossings leaves the garden still in
 * between, and the bloom reads as a series of jumps rather than one movement.
 * The median gap is 236 ms and the middle of the sweep runs at 141 ms, so at
 * 400 ms each fade is still going when the next frame lands — `withTiming`
 * re-targets from wherever it had got to and the garden never stops moving.
 *
 * It still settles on a whole number, and therefore on a whole watercolour,
 * once the steps stop.
 */
const FRAME_FADE_MS = 400;

/**
 * Linear, and deliberately so.
 *
 * Opacity is the one property an ease-in-out hurts: the eye reads a dissolve by
 * its brightness, which tracks the value directly, so easing the value makes
 * the fade hang at both ends and rush through the middle. The bloom curve in
 * use-bloom-lab is eased because it drives the step count, which is a distance.
 */
const EASE_FADE = Easing.linear;

/**
 * The highest frame `progress` has actually reached.
 *
 * Reached, not nearest: rounding up would paint a meadow that has not been
 * walked for yet.
 */
function frameFor(progress: number): number {
  'worklet';
  return clamp(Math.floor(progress * LAST_FRAME), 0, LAST_FRAME);
}

type Props = {
  /** Steps ÷ goal, 0 → 1. The only input. */
  progress: SharedValue<number>;
  width: number;
  /** Lifts the painting off the bottom edge, e.g. above a pinned footer. */
  offsetBottom?: number;
};

export function GardenFlipbook({ progress, width, offsetBottom = 0 }: Props) {
  /**
   * Which frame is on screen, as a continuous position along the seventeen —
   * and the whole reason the garden is ever sharp.
   *
   * At rest this is always a whole number, so exactly one frame is visible at
   * full opacity. It leaves a whole number only while a frame is being crossed.
   */
  const shown = useSharedValue(frameFor(progress.get()));

  // Which two frames are mounted. React state, because the sources are a render
  // concern; the cross-fade between them stays on the UI thread.
  const [pair, setPair] = React.useState(() =>
    Math.min(frameFor(progress.get()), LAST_PAIR),
  );

  // A frame was crossed. Nothing else starts an animation: a sync too small to
  // reach the next frame leaves the painting exactly as it was.
  useAnimatedReaction(
    () => frameFor(progress.get()),
    (next, previous) => {
      if (previous === null || next === previous)
        return;
      shown.set(
        withTiming(next, { duration: FRAME_FADE_MS, easing: EASE_FADE }),
      );
    },
  );

  useAnimatedReaction(
    () => Math.min(Math.floor(shown.get()), LAST_PAIR),
    (next, previous) => {
      if (next !== previous)
        scheduleOnRN(setPair, next);
    },
  );

  /**
   * The fade must be measured against the pair React actually mounted.
   *
   * `pair` is read straight out of the render closure rather than through a
   * shared value written in an effect: React installs the new image sources and
   * this worklet in the same commit, so the two can never disagree. Going
   * through an effect leaves the worklet a frame behind the sources, and that
   * frame renders the wrong painting at full opacity — a flash of the frame one
   * beyond the one being reached, at the end of every single transition.
   */
  const topStyle = useAnimatedStyle(
    () => ({ opacity: clamp(shown.get() - pair, 0, 1) }),
    [pair],
  );

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + SCALE_SPAN * clamp(progress.get(), 0, 1) }],
  }));

  const height = Math.round(width * FRAME_ASPECT);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        bottom: offsetBottom,
        width,
        height,
      }}
    >
      <Animated.View
        style={[{ width, height, transformOrigin: 'bottom' }, scaleStyle]}
      >
        <Image
          source={FRAMES[pair]}
          style={{ width, height }}
          contentFit="cover"
          // expo-image fades a changing source on its own. Ours is the fade.
          transition={0}
          cachePolicy="memory-disk"
        />
        <Animated.View
          style={[
            { position: 'absolute', left: 0, top: 0, width, height },
            topStyle,
          ]}
        >
          <Image
            source={FRAMES[pair + 1]}
            style={{ width, height }}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
