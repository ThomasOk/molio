import type { GardenPalette } from '../palette';
import type { ExpandOrigin } from './expansion';
import { setStatusBarStyle } from 'expo-status-bar';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { strideFonts } from '@/lib/theme';
import { formatSteps } from '../bloom';
import { formatLongDate, MONTHS_LONG } from '../calendar';
import { inkOnTier } from '../palette';
import { ExpandingSurface } from './expanding-surface';
import { useExpansion } from './use-expansion';
import { PAGE_MS, usePageSlide } from './use-page-slide';
import { ZoomBackButton } from './zoom-back-button';

/**
 * One day, full screen, in its own colour.
 *
 * The second and last step of the zoom: the tapped cell unfolds into the whole
 * screen, keeping the tier colour it had in the grid, and says the only two
 * things that day is — its date, and its steps. Swipe sideways to walk to the
 * day before or after, as you do between months one level up. Back is a swipe
 * down (it contracts into the cell it came from) or the chevron.
 */
export function DayZoom({
  origin,
  day,
  palette,
  onClose,
  onPage,
}: {
  origin: ExpandOrigin;
  day: { date: Date; steps: number; tier: number };
  palette: GardenPalette;
  onClose: () => void;
  /** Walk `delta` days; returns whether there was a day to walk to. */
  onPage: (delta: number) => boolean;
}) {
  const insets = useSafeAreaInsets();
  const { progress, scale, fade, collapse, dismissGesture } = useExpansion(onClose);
  const { ink, soft } = inkOnTier(day.tier, palette);
  const color = useTierWash(palette.tiers[Math.max(0, Math.min(day.tier, palette.tiers.length - 1))]);
  const { slide, rPage } = usePageSlide();

  // The screen's whole background is the tier colour, so the status bar has to
  // follow it — dark glyphs vanish on the deep green and coral tiers.
  React.useEffect(() => {
    setStatusBarStyle(day.tier >= 3 ? 'light' : 'dark');
    return () => setStatusBarStyle('dark');
  }, [day.tier]);

  const page = (delta: number) => {
    if (onPage(delta))
      slide(delta);
  };

  // Same race as the month above: the dismiss pan bails out past 20 px of
  // sideways travel, which is what lets the flings through.
  const gesture = Gesture.Race(
    dismissGesture,
    Gesture.Fling().direction(Directions.LEFT).onEnd(() => scheduleOnRN(page, 1)),
    Gesture.Fling().direction(Directions.RIGHT).onEnd(() => scheduleOnRN(page, -1)),
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill}>
        <ExpandingSurface
          origin={origin}
          progress={progress}
          scale={scale}
          fade={fade}
          color={color}
        >
          {/* Chrome: it names the month, and it stays put while the days walk
              past under it. */}
          <ZoomBackButton
            label={MONTHS_LONG[day.date.getMonth()]}
            color={soft}
            top={insets.top + 12}
            onPress={collapse}
          />

          <Animated.View style={[styles.content, rPage]}>
            <Text style={[styles.date, { color: soft }]}>{formatLongDate(day.date)}</Text>
            {day.steps >= 1
              ? (
                  <>
                    <Text style={[styles.steps, { color: ink }]}>{formatSteps(day.steps)}</Text>
                    <Text style={[styles.unit, { color: soft }]}>pas</Text>
                  </>
                )
              : (
                  <Text style={[styles.empty, { color: ink }]}>Aucun pas</Text>
                )}
          </Animated.View>
        </ExpandingSurface>
      </View>
    </GestureDetector>
  );
}

// ---------------------------------------------------------------------------

/**
 * The paper's colour, washed from one tier to the next as you walk the days.
 *
 * It holds the outgoing colour itself rather than handing `withTiming` a colour
 * straight from the style: an animated colour needs somewhere to start from, and
 * on the very first frame the surface has no colour yet. Keeping both ends here
 * makes the first pass a no-op and every later one a real crossfade — on the
 * same 240 ms as the slide, so the paper and the words land together.
 */
function useTierWash(color: string) {
  const from = useSharedValue(color);
  const to = useSharedValue(color);
  const mix = useSharedValue(1);

  React.useEffect(() => {
    if (to.get() === color)
      return;
    from.set(to.get());
    to.set(color);
    mix.set(0);
    mix.set(withTiming(1, { duration: PAGE_MS }));
  }, [color, from, to, mix]);

  return useDerivedValue(() => interpolateColor(mix.get(), [0, 1], [from.get(), to.get()]));
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  date: {
    fontFamily: strideFonts.medium,
    fontSize: 17,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  steps: {
    fontFamily: strideFonts.black,
    fontSize: 56,
    lineHeight: 64,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: strideFonts.medium,
    fontSize: 17,
    lineHeight: 22,
    marginTop: 2,
  },
  empty: {
    fontFamily: strideFonts.bold,
    fontSize: 28,
    lineHeight: 34,
  },
});
