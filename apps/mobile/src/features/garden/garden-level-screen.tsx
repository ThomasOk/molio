import type { SharedValue } from 'react-native-reanimated';
import type { GardenPalette } from './palette';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { toast } from 'sonner-native';

import { strideFonts } from '@/lib/theme';
import { clamp, formatSteps, MAX_LEVEL, MAX_STEPS, STEPS_PER_LEVEL } from './bloom';
import { FlowerAvatar } from './components/flower-avatar';
import { GlassToast } from './components/glass-toast';
import { getLastSeenSteps, setLastSeenSteps } from './level-progress';
import { GARDEN_PAPER, gardenPalettes } from './palette';
import { PROFILE } from './profile';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * How long the reveal takes, scaled by the size of the climb it has to make.
 * A handful of new steps fills in REVEAL_MIN; a full sweep earns REVEAL_MAX.
 */
const REVEAL_MIN_MS = 900;
const REVEAL_MAX_MS = 2600;
const AVATAR_SIZE = 132;

/** The bar decelerates into its final width — a fill that eases to rest. */
const EASE_FILL = Easing.out(Easing.cubic);

/**
 * "X / 1000" for a given filled value. A worklet so the animated bar can call it
 * every frame, and a plain function so the same text seeds the field's initial
 * value — without which a re-entry that doesn't animate would sit on a stale
 * default (the TextInput's native text only updates when the value changes).
 */
function fractionText(value: number): string {
  'worklet';
  const done = value >= MAX_STEPS;
  const within = done ? STEPS_PER_LEVEL : Math.floor(value % STEPS_PER_LEVEL);
  return `${within} / ${STEPS_PER_LEVEL}`;
}

function revealDuration(deltaSteps: number): number {
  const fraction = clamp(deltaSteps / MAX_STEPS, 0, 1);
  return Math.round(REVEAL_MIN_MS + fraction * (REVEAL_MAX_MS - REVEAL_MIN_MS));
}

/**
 * Level screen — the day's steps as an RPG-style character sheet.
 *
 * Portrait, name, level, XP bar. On entry the bar climbs from the count the user
 * last saw up to today's — so it animates once, then again only when a sync has
 * brought new steps in, ticking through and popping on each level it passes.
 * The steps arrive as a route param; the screen owns only this reveal.
 */
export function GardenLevelScreen() {
  const palette = gardenPalettes.light;
  const reduced = useReducedMotion();

  const params = useLocalSearchParams<{ steps?: string }>();
  const steps = clamp(Math.round(Number(params.steps) || 0), 0, MAX_STEPS);
  const finalLevel = Math.floor(steps / STEPS_PER_LEVEL);
  const atMax = finalLevel >= MAX_LEVEL;

  // Where the reveal starts: what the user last saw, never above today's count
  // (a dev reset can leave it higher). Read once via a lazy initialiser; the
  // write-back happens in the effect, so render stays pure.
  const [from] = React.useState(() => clamp(getLastSeenSteps(), 0, steps));
  // Whether this reveal actually crosses into new levels — the toast and the
  // pulses only fire when it does.
  const gainedLevels = finalLevel > Math.floor(from / STEPS_PER_LEVEL);

  // The one animated value, seeded at `from` so the already-seen portion is not
  // replayed. Level and the bar fraction both derive from it.
  const filled = useSharedValue(from);
  // Level-up pulse, 0 → 1 → 0. Scales the badge and flashes the halo.
  const pop = useSharedValue(0);
  const [level, setLevel] = React.useState(Math.floor(from / STEPS_PER_LEVEL));

  const announceLevel = React.useCallback(() => {
    toast.custom(<GlassToast title={`Vous avez atteint le niveau ${finalLevel} !`} />);
  }, [finalLevel]);

  React.useEffect(() => {
    if (reduced) {
      filled.set(steps);
      if (gainedLevels)
        announceLevel();
    }
    else {
      // Announce from the timing callback so the toast lands exactly when the
      // bar settles, not on a duration guess.
      filled.set(
        withTiming(steps, { duration: revealDuration(steps - from), easing: EASE_FILL }, (finished) => {
          'worklet';
          if (finished && gainedLevels)
            scheduleOnRN(announceLevel);
        }),
      );
    }
    setLastSeenSteps(steps);
  }, [steps, from, reduced, filled, gainedLevels, announceLevel]);

  const fireLevelUp = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Watch the integer level cross on the UI thread; hop to React only when it
  // changes, and pulse + buzz only when it climbs. State is set from here, never
  // synchronously in the effect, so the effect never cascades renders.
  useAnimatedReaction(
    () => Math.floor(filled.get() / STEPS_PER_LEVEL),
    (next, prev) => {
      if (prev == null || next === prev)
        return;
      scheduleOnRN(setLevel, next);
      if (next > prev && !reduced) {
        pop.set(
          withSequence(
            withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 340, easing: Easing.inOut(Easing.quad) }),
          ),
        );
        scheduleOnRN(fireLevelUp);
      }
    },
  );

  return (
    <View style={{ flex: 1, backgroundColor: GARDEN_PAPER }}>
      <StatusBar style="dark" />
      <BackButton palette={palette} />

      <View style={styles.center}>
        <Portrait level={level} pop={pop} palette={palette} />

        <Text style={[styles.name, { color: palette.ink }]}>{PROFILE.name}</Text>

        <XpBar filled={filled} atMax={atMax} palette={palette} />

        <AnimatedFraction filled={filled} initial={from} color={palette.inkSoft} />

        <Text style={[styles.total, { color: palette.label }]}>
          {formatSteps(steps)}
          {' pas aujourd’hui'}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

/** Discreet way back — no header, so the paper stays edge to edge. */
function BackButton({ palette }: { palette: GardenPalette }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      hitSlop={16}
      onPress={() => router.back()}
      style={({ pressed }) => ({
        position: 'absolute',
        top: insets.top + 12,
        left: 20,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Text style={[styles.back, { color: palette.inkSoft }]}>‹ Retour</Text>
    </Pressable>
  );
}

/** The flower portrait with its level badge, both pulsing on each level-up. */
function Portrait({
  level,
  pop,
  palette,
}: {
  level: number;
  pop: SharedValue<number>;
  palette: GardenPalette;
}) {
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * pop.get(),
    transform: [{ scale: 1 + 0.35 * pop.get() }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.18 * pop.get() }],
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { width: AVATAR_SIZE, height: AVATAR_SIZE, backgroundColor: palette.ringDone }, haloStyle]}
      />
      <FlowerAvatar hue={PROFILE.flower} size={AVATAR_SIZE} palette={palette} />
      <Animated.View style={[styles.badge, { backgroundColor: palette.ring, borderColor: GARDEN_PAPER }, badgeStyle]}>
        <Text style={styles.badgeText}>{level}</Text>
      </Animated.View>
    </View>
  );
}

/**
 * The XP bar. Its fill is the fraction into the CURRENT level, so it resets to
 * empty as each level ticks past; at the very top it reads full, not empty.
 */
function XpBar({
  filled,
  atMax,
  palette,
}: {
  filled: SharedValue<number>;
  atMax: boolean;
  palette: GardenPalette;
}) {
  const barStyle = useAnimatedStyle(() => {
    const within = (filled.get() % STEPS_PER_LEVEL) / STEPS_PER_LEVEL;
    const done = filled.get() >= MAX_STEPS;
    return { width: `${(done ? 1 : within) * 100}%` };
  });

  return (
    <View style={[styles.track, { backgroundColor: palette.ringTrack }]}>
      <Animated.View
        style={[styles.fill, { backgroundColor: atMax ? palette.ringDone : palette.ring }, barStyle]}
      />
    </View>
  );
}

/**
 * "X / 1000" under the bar, counting up with the fill without a React render.
 * `initial` seeds the field so a re-entry that never animates still reads right.
 */
function AnimatedFraction({
  filled,
  initial,
  color,
}: {
  filled: SharedValue<number>;
  initial: number;
  color: string;
}) {
  const animatedProps = useAnimatedProps(() => ({ text: fractionText(filled.get()) }) as any);

  return (
    <AnimatedTextInput
      editable={false}
      allowFontScaling={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      accessible={false}
      defaultValue={fractionText(initial)}
      animatedProps={animatedProps}
      style={[styles.fraction, { color }]}
    />
  );
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  back: {
    fontFamily: strideFonts.medium,
    fontSize: 15,
    lineHeight: 20,
  },
  halo: {
    position: 'absolute',
    borderRadius: AVATAR_SIZE / 2,
  },
  badge: {
    position: 'absolute',
    bottom: -8,
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: strideFonts.black,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  name: {
    marginTop: 22,
    fontFamily: strideFonts.bold,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  track: {
    marginTop: 20,
    alignSelf: 'stretch',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  fraction: {
    marginTop: 8,
    padding: 0,
    height: 20,
    fontFamily: strideFonts.medium,
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center',
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
  total: {
    marginTop: 10,
    fontFamily: strideFonts.medium,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
