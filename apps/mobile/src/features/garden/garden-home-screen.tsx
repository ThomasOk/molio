import type { TextStyle, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { GardenPalette } from './palette';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { strideFonts } from '@/lib/theme';
import { BANDS, clamp, formatSteps, MAX_STEPS } from './bloom';
import { AlertMark } from './components/alert-mark';
import { AnimatedSteps } from './components/animated-steps';
import { GardenFlipbook } from './components/garden-flipbook';
import { GlassToast } from './components/glass-toast';
import { ProfileFlower } from './components/profile-flower';
import { PullLoader } from './components/pull-loader';
import { StepRing } from './components/step-ring';
import { TierSquares } from './components/tier-squares';
import { clearLevelProgress } from './level-progress';
import { GARDEN_PAPER, gardenPalettes } from './palette';
import { useBloomLab } from './use-bloom-lab';
import { usePullToSync } from './use-pull-to-sync';
import { useUnseenLevelUp } from './use-unseen-level-up';

type SyncPhase = 'idle' | 'syncing' | 'uptodate';

/** How long "À jour" lingers after a sync that brought nothing back. */
const UPTODATE_MS = 1400;

/**
 * The sync hint's three states, and the toasts that ride the end of a sync.
 *
 * 'syncing' derives straight from the flag; 'uptodate' is the only feedback a
 * zero-delta sync gets — a real one is answered by the bloom itself — and it is a
 * brief, self-clearing flash. Announces the delta when the sync finishes.
 */
function useSyncPhase(refreshing: boolean, lastDelta: number | null): SyncPhase {
  const [uptodate, setUptodate] = React.useState(false);
  const wasRefreshingRef = React.useRef(false);
  // The id of the sync toast currently on screen, so we can dismiss it — and only
  // it, not the level screen's own toast — when the home loses focus.
  const toastIdRef = React.useRef<string | number | undefined>(undefined);

  React.useEffect(() => {
    const justFinished = wasRefreshingRef.current && !refreshing;
    wasRefreshingRef.current = refreshing;
    if (!justFinished)
      return;
    if (lastDelta && lastDelta > 0) {
      toastIdRef.current = toast.custom(
        <GlassToast title={`+${formatSteps(lastDelta)} pas synchronisés`} />,
        { position: 'center' },
      );
      return;
    }
    toastIdRef.current = toast.custom(<GlassToast title="Déjà à jour" />, { position: 'center' });
    // Set only from timers so the effect never triggers a synchronous render.
    const show = setTimeout(setUptodate, 0, true);
    const hide = setTimeout(setUptodate, UPTODATE_MS, false);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [refreshing, lastDelta]);

  // A center toast lingers ~4s on its own; if the user taps through to another
  // screen before then, dismiss it on blur so it never floats over that screen.
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (toastIdRef.current !== undefined) {
          toast.dismiss(toastIdRef.current);
          toastIdRef.current = undefined;
        }
      };
    }, []),
  );

  return refreshing ? 'syncing' : uptodate ? 'uptodate' : 'idle';
}

/**
 * Garden home — the minimalist screen the garden was always meant to become.
 *
 * The lab minus the instruments: no scrubber, no palier buttons, no header.
 * One thing to do here — pull down to sync your steps — and one thing to watch:
 * the garden grow. See use-pull-to-sync for why the refresh is hand-rolled.
 */
export function GardenHomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const palette = gardenPalettes.light;
  const lab = useBloomLab();

  const { gesture, pull } = usePullToSync({
    enabled: !lab.refreshing,
    onSync: lab.sync,
  });

  // Lights a dot on the portrait when a sync has earned levels the user has not
  // opened the level screen to see yet. Clears on return from that screen.
  const hasUnseenLevelUp = useUnseenLevelUp(lab.committedSteps);

  const phase = useSyncPhase(lab.refreshing, lab.lastDelta);

  return (
    <View style={{ flex: 1, backgroundColor: GARDEN_PAPER }}>
      <StatusBar style="dark" />

      {/* Painted first so the counter reads on top of it. */}
      <GardenFlipbook progress={lab.progress} width={width} offsetBottom={0} />

      {/* A transparent full-screen layer over the garden (which is
          pointer-transparent), so a pull from anywhere charges the ring. */}
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1, paddingTop: insets.top + 64 }}>
          <View style={{ alignItems: 'center' }}>
            <StepRing
              progress={lab.counter}
              palette={palette}
              size={208}
              stroke={7}
            >
              <AnimatedSteps progress={lab.counter} color={palette.ink} />
              <GardenText palette={palette} variant="caption" style={CAPTION}>
                pas aujourd'hui
              </GardenText>
            </StepRing>

            <GardenText palette={palette} variant="band" style={BAND}>
              {BANDS[lab.bandIndex].label}
            </GardenText>

            <SyncHint phase={phase} pull={pull} palette={palette} />
          </View>
        </View>
      </GestureDetector>

      <PullLoader pull={pull} syncing={lab.refreshing} palette={palette} topInset={insets.top} />

      {/* The profile flower — tap your portrait to open your character sheet,
          the way an RPG opens on its avatar. Reads the committed steps at press
          time and hands them to the level screen. */}
      <ProfileButton
        palette={palette}
        top={insets.top + 8}
        showBadge={hasUnseenLevelUp}
        onPress={() =>
          router.push({
            pathname: '/garden-level',
            params: { steps: String(Math.round(lab.counter.get() * MAX_STEPS)) },
          })}
      />

      {/* A miniature heatmap, top-right — the way into the activity calendar. */}
      <StatsButton
        palette={palette}
        top={insets.top + 8}
        onPress={() => router.push('/garden-stats')}
      />

      <AddStepsButton
        palette={palette}
        bottom={insets.bottom + 12}
        disabled={lab.refreshing}
        onPress={() => lab.sync(ADD_STEPS_AMOUNT)}
      />

      <ResetButton
        palette={palette}
        bottom={insets.bottom + 12}
        onPress={() => {
          lab.reset();
          clearLevelProgress();
        }}
      />
    </View>
  );
}

/** How many steps the dev "grab steps" button adds — enough to vault several levels. */
const ADD_STEPS_AMOUNT = 10000;

/** The profile portrait, top-left — the way into the level / character screen. */
function ProfileButton({
  palette,
  onPress,
  top,
  showBadge,
}: {
  palette: GardenPalette;
  onPress: () => void;
  top: number;
  showBadge: boolean;
}) {
  const reduced = useReducedMotion();
  const wiggle = useSharedValue(0);

  // A quick shake the moment the unseen-level-up badge appears — a jolt that pulls
  // the eye to the corner, then settles. Degrees, decaying -8 → 6 → -4 → 2 → 0.
  React.useEffect(() => {
    if (showBadge && !reduced) {
      wiggle.set(
        withSequence(
          withTiming(-8, { duration: 80 }),
          withTiming(6, { duration: 80 }),
          withTiming(-4, { duration: 80 }),
          withTiming(2, { duration: 80 }),
          withTiming(0, { duration: 80 }),
        ),
      );
    }
  }, [showBadge, reduced, wiggle]);

  const wiggleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wiggle.get()}deg` }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={showBadge ? 'Voir mon niveau, nouveau palier' : 'Voir mon niveau'}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        top,
        left: 18,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {/* Avatar and badge share one wrapper so the whole portrait shakes as a unit. */}
      <Animated.View style={wiggleStyle}>
        <ProfileFlower size={40} palette={palette} />
        {showBadge && <LevelUpBadge palette={palette} />}
      </Animated.View>
    </Pressable>
  );
}

/**
 * The unseen-level-up badge's entrance: a gentle scale-in — it inflates from 0.8
 * to full size with a fade, eased out with no bounce, growing from the corner
 * nearest the portrait so it reads as emerging from it rather than popping out of
 * nothing. Under reduced motion it is simply present, no animation.
 */
function LevelUpBadge({ palette }: { palette: GardenPalette }) {
  const reduced = useReducedMotion();
  const appear = useSharedValue(reduced ? 1 : 0);

  React.useEffect(() => {
    if (!reduced)
      appear.set(withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
  }, [reduced, appear]);

  const style = useAnimatedStyle(() => ({
    opacity: appear.get(),
    transform: [{ scale: 0.8 + 0.2 * appear.get() }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[BADGE, { backgroundColor: palette.hues.red.petal, borderColor: GARDEN_PAPER, transformOrigin: 'left bottom' }, style]}
    >
      <AlertMark size={11} />
    </Animated.View>
  );
}

/**
 * The way into the activity calendar — a 2×2 heatmap glyph, the screen it opens
 * in miniature, rather than a foreign icon.
 */
function StatsButton({
  palette,
  onPress,
  top,
}: {
  palette: GardenPalette;
  onPress: () => void;
  top: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Voir mon activité"
      hitSlop={14}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        top,
        right: 18,
        padding: 4,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <TierSquares
        tiers={[1, 3, 4, 2]}
        columns={2}
        rows={2}
        size={7}
        gap={2}
        radius={2}
        palette={palette}
      />
    </Pressable>
  );
}

/**
 * Dev-only: grab 10 000 steps in one tap — enough to vault several levels at once
 * — so the bloom, the level-ups and the badge can be exercised without pulling to
 * sync over and over. Fires the whole sync flow (spinner, toast, badge, bloom),
 * exactly like a real pull-to-sync but with a fixed delta. Goes away with the mock.
 */
function AddStepsButton({
  palette,
  onPress,
  bottom,
  disabled,
}: {
  palette: GardenPalette;
  onPress: () => void;
  bottom: number;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Récupérer 10 000 pas"
      hitSlop={12}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        bottom,
        left: 20,
        opacity: disabled ? 0.35 : pressed ? 0.5 : 1,
      })}
    >
      <GardenText palette={palette} variant="caption">
        +10 000 pas
      </GardenText>
    </Pressable>
  );
}

/**
 * A quiet way back to zero. Dev-facing while the screen runs on the mocked sync
 * — a real home would not let you erase your own steps.
 */
function ResetButton({
  palette,
  onPress,
  bottom,
}: {
  palette: GardenPalette;
  onPress: () => void;
  bottom: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Réinitialiser les pas"
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        bottom,
        right: 20,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <GardenText palette={palette} variant="caption">
        Réinitialiser
      </GardenText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------

const CAPTION: TextStyle = { marginTop: 2, width: 192, textAlign: 'center' };
const BAND: TextStyle = { marginTop: 16, alignSelf: 'stretch', textAlign: 'center' };
const HINT: TextStyle = { marginTop: 22, alignSelf: 'stretch', textAlign: 'center' };

/**
 * The unseen-level-up badge, biting into the portrait's top-right. It overlaps the
 * avatar (not floated off its corner) and its thick paper-coloured ring punches a
 * notch out of the flower where the two meet — the way an iOS badge crops its host
 * — so the "!" reads as pinned onto the portrait, not hovering beside it.
 */
const BADGE: ViewStyle = {
  position: 'absolute',
  top: 0,
  right: 0,
  width: 18,
  height: 18,
  borderRadius: 9,
  borderWidth: 2.5,
  alignItems: 'center',
  justifyContent: 'center',
};

/**
 * The pull affordance.
 *
 * Idle: a faint line that breathes, and fades out as the pull charges so the
 * ring's filling arc takes over the storytelling. Syncing: gone — the sweep is
 * the cue. Uptodate: a brief, steady "À jour".
 */
function SyncHint({
  phase,
  pull,
  palette,
}: {
  phase: SyncPhase;
  pull: SharedValue<number>;
  palette: GardenPalette;
}) {
  const reduced = useReducedMotion();
  const breathe = useSharedValue(0);

  React.useEffect(() => {
    if (reduced) {
      breathe.set(0.5);
      return;
    }
    breathe.set(
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(breathe);
  }, [reduced, breathe]);

  const style = useAnimatedStyle(() => ({
    // 0.35 → 0.6 breath, wiped out as the pull arms.
    opacity: (0.35 + 0.25 * breathe.get()) * (1 - clamp(pull.get(), 0, 1)),
  }));

  if (phase === 'syncing')
    return <View style={{ height: 18, marginTop: 22 }} />;

  if (phase === 'uptodate') {
    return (
      <GardenText palette={palette} variant="caption" style={HINT}>
        À jour
      </GardenText>
    );
  }

  return (
    <Animated.View style={style}>
      <GardenText palette={palette} variant="caption" style={HINT}>
        ↓  Tirez pour synchroniser
      </GardenText>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------

type GVariant = 'band' | 'caption';

const G_STYLES: Record<GVariant, TextStyle> = {
  band: { fontFamily: strideFonts.bold, fontSize: 17, lineHeight: 22 },
  caption: { fontFamily: strideFonts.medium, fontSize: 13, lineHeight: 18 },
};

/** The garden keeps its type on its own palette, apart from the Stride tokens. */
function GardenText({
  palette,
  variant,
  style,
  children,
}: {
  palette: GardenPalette;
  variant: GVariant;
  style?: TextStyle;
  children: React.ReactNode;
}) {
  const color = variant === 'caption' ? palette.inkSoft : palette.ink;
  return <Text style={[G_STYLES[variant], { color }, style]}>{children}</Text>;
}
