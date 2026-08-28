import type { SharedValue } from 'react-native-reanimated';
import type { GardenPalette } from './palette';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
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
import Svg, { Defs, RadialGradient, Rect, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { toast } from 'sonner-native';

import { strideFonts } from '@/lib/theme';
import { clamp, formatSteps, MAX_LEVEL, MAX_STEPS, STEPS_PER_LEVEL } from './bloom';
import { GlassToast } from './components/glass-toast';
import { ProfileFlower } from './components/profile-flower';
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
/** The level-up glow reaches well past the portrait so it reads as light, not a disc. */
const HALO_SIZE = Math.round(AVATAR_SIZE * 1.7);

/** The XP bar's height, and the horizontal padding of the sheet it stretches in. */
const BAR_HEIGHT = 14;
const SHEET_PADDING = 40;

/** Strong ease-out (from animations.dev) — the built-in curves lack the punch a pop needs. */
const EASE_POP = Easing.bezier(0.22, 1, 0.32, 1);

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
        // Snap up fast (strong ease-out), then ease back down — a clean pulse with
        // no bounce. A mid-settle level cross retargets the timing smoothly rather
        // than restarting hard, so a multi-level reveal builds instead of stuttering.
        pop.set(
          withSequence(
            withTiming(1, { duration: 130, easing: EASE_POP }),
            withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }),
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
  const haloStyle = useAnimatedStyle(() => {
    const p = pop.get();
    return {
      opacity: p,
      transform: [{ scale: 0.92 + 0.16 * p }],
    };
  });
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.22 * pop.get() }],
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[styles.halo, { width: HALO_SIZE, height: HALO_SIZE }, haloStyle]}>
        <Svg width={HALO_SIZE} height={HALO_SIZE}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={palette.ringDone} stopOpacity={0.5} />
              <Stop offset="0.6" stopColor={palette.ringDone} stopOpacity={0.16} />
              <Stop offset="1" stopColor={palette.ringDone} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={HALO_SIZE} height={HALO_SIZE} fill="url(#halo)" />
        </Svg>
      </Animated.View>
      <ProfileFlower size={AVATAR_SIZE} palette={palette} />
      <Animated.View style={[styles.badge, { backgroundColor: palette.ring, borderColor: GARDEN_PAPER }, badgeStyle]}>
        <Text style={styles.badgeText}>{level}</Text>
      </Animated.View>
    </View>
  );
}

/**
 * The XP bar — a warm coral fill sunk into a recessed groove, ringed by a crisp
 * white bezel (variant "B"; see `palette.xp`).
 *
 * The fill is the fraction into the CURRENT level, so it empties as each level
 * ticks past; at the top it reads full, its gradient crowned gold to echo the
 * heatmap's bloom. The groove (track colour + inset shadow) reads hollow where
 * empty; the fill rides flush inside it — a three-stop coral gradient (via
 * react-native-svg, no extra dependency) with a white specular crest and a coral
 * glow that bleeds past the pill, since the groove is left unclipped. The white
 * bezel is an outer ring (a box-shadow spread, not a padded frame) so the fill
 * can reach the very edge.
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
  const { xp } = palette;
  // The gradient is painted onto a fixed-width SVG canvas (the widest the fill can
  // ever be) and clipped to the current fill by the parent's overflow. react-native-svg
  // does NOT track an animated parent width — an absoluteFill Svg collapses to a
  // default size, painting only a stub — so the canvas must be sized in pixels.
  const { width: windowWidth } = useWindowDimensions();
  const trackWidth = Math.max(0, windowWidth - SHEET_PADDING * 2);
  const barStyle = useAnimatedStyle(() => {
    const within = (filled.get() % STEPS_PER_LEVEL) / STEPS_PER_LEVEL;
    const done = filled.get() >= MAX_STEPS;
    return { width: `${(done ? 1 : within) * 100}%` };
  });

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: xp.track,
          boxShadow: `inset 0px 1.5px 3px ${xp.groove}, 0px 0px 0px 2px ${xp.bezel}`,
        },
      ]}
    >
      <Animated.View style={[styles.fill, { boxShadow: `0px 0px 10px ${xp.glow}` }, barStyle]}>
        <Svg width={trackWidth} height={BAR_HEIGHT} style={styles.fillGradient}>
          <Defs>
            <SvgLinearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={atMax ? palette.tiers[3] : xp.fillTop} />
              <Stop offset="0.55" stopColor={xp.fillMid} />
              <Stop offset="1" stopColor={xp.fillBottom} />
            </SvgLinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#xpFill)" />
        </Svg>
        <View pointerEvents="none" style={[styles.gloss, { backgroundColor: xp.gloss }]} />
      </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -8,
    // Fixed square + half-width radius so the badge stays a perfect circle
    // whatever the digit count (levels run 1–20, so "20" is the widest it holds).
    width: 34,
    height: 34,
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
    height: BAR_HEIGHT,
    borderRadius: 999,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fillGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gloss: {
    position: 'absolute',
    top: 1.5,
    left: 2,
    right: 2,
    height: '40%',
    borderRadius: 999,
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
