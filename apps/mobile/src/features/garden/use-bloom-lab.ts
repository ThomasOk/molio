import type { SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as React from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  abundanceFromProgress,
  bandIndexFor,
  bloomFromProgress,
  clamp,
  counterDuration,
  gardenDuration,
  MAX_STEPS,
} from './bloom';
import { SWAY_LOOP_MS } from './flora';
import { getTodaySteps, recordDaySteps } from './use-day-history';

/**
 * The bloom curve. Gentle at both ends (`inOut`) so a long sync reads as a slow
 * swell that settles onto its final frame, rather than a snap — the evolution
 * is the content here, not an artefact to get past.
 */
const EASE_BLOOM = Easing.inOut(Easing.cubic);
/** Quicker curve for folding the garden back to zero on reset. */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Send one clock to a fraction of the range over `duration`, on the bloom curve. */
function bloomTo(
  clock: SharedValue<number>,
  fraction: number,
  duration: number,
) {
  clock.set(withTiming(fraction, { duration, easing: EASE_BLOOM }));
}

/**
 * One linear 0 → 1 clock, looping forever.
 *
 * Every plant derives its own sway phase and frequency from this single value,
 * so dozens of stems drift out of step without dozens of separate repeating
 * animations — and, because each frequency is a whole number of cycles per
 * loop, without ever jolting where the clock wraps back to 0.
 *
 * Only the sway uses it, and sway is off by default: nothing here animates every
 * frame unless the user turns it on. The petals and butterflies are static.
 */
function useLoopClock(enabled: boolean, loopMs: number) {
  const clock = useSharedValue(0);

  React.useEffect(() => {
    if (!enabled) {
      cancelAnimation(clock);
      clock.set(0);
      return;
    }

    clock.set(0);
    clock.set(
      withRepeat(
        withTiming(1, { duration: loopMs, easing: Easing.linear }),
        -1,
        false,
      ),
    );

    return () => cancelAnimation(clock);
  }, [enabled, loopMs, clock]);

  return clock;
}

/**
 * How many haptic pulses one count-up delivers — fixed, not one per N steps.
 *
 * The counter's own duration is deliberately delta-independent (see
 * `counterDuration`): a 400-step sync and a 3200-step one both take exactly
 * COUNTER_MS, so a fixed number of pulses per sync keeps the haptic rhythm
 * that same kind of constant — every sync feels like the same reel spinning
 * up and settling, only covering a different distance. Spaced by FRACTION of
 * the leg rather than by raw step count, the pulses ride `EASE_BLOOM` for
 * free: sparse at the start and the settle, dense through the middle, exactly
 * where the digits are visibly moving fastest.
 */
const COUNTER_TICKS = 16;

/**
 * A light tick for every notch the counter passes as it counts up — the
 * pull-to-sync animation asks to be felt, not just watched.
 *
 * `arm` marks where the current leg starts and how far it runs; call it right
 * before sending `counter` to its new target. The reaction below turns the
 * counter's raw value back into "how far through THIS leg" and fires once per
 * notch. Because the notch index only ever counts up when `counter` is rising,
 * `reset()`'s count-DOWN passes back through the same notches without a single
 * pulse — nothing here has to know it is a reset, the direction alone excludes
 * it.
 */
function useCounterTicks(counter: SharedValue<number>) {
  const from = useSharedValue(0);
  const span = useSharedValue(0);

  const arm = React.useCallback(
    (target: number) => {
      from.set(counter.get());
      span.set(target - counter.get());
    },
    [counter, from, span],
  );

  useAnimatedReaction(
    () => {
      const s = span.get();
      if (s === 0)
        return -1;
      return Math.floor(clamp((counter.get() - from.get()) / s, 0, 1) * COUNTER_TICKS);
    },
    (next, previous) => {
      if (previous !== null && next > previous)
        scheduleOnRN(Haptics.selectionAsync);
    },
  );

  return arm;
}

/** How long the fake Health sync spins before it returns a delta. */
const SYNC_MS = 1000;

/**
 * The fake Health delta. A real sync sometimes brings back nothing — one case in
 * five here, so the "no delta, no bloom" path is actually visible while testing.
 */
function nextFakeDelta(): number {
  return Math.random() < 0.2 ? 0 : 400 + Math.round(Math.random() * 2800);
}

/**
 * Everything the garden runs on.
 *
 * Exactly one shared value is written from the outside — `progress`, steps ÷
 * goal. `bloom` derives from it, and every plant, petal and butterfly reads
 * `bloom`. Adding a second source of truth here is the thing that would break
 * the whole model.
 */
export function useBloomLab() {
  const systemReduced = useReducedMotion();

  const [motion, setMotion] = React.useState(!systemReduced);
  const [bandIndex, setBandIndex] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastDelta, setLastDelta] = React.useState<number | null>(null);
  // Restore today's committed total (persisted) so a restart keeps the count — and the badge.
  const [initialSteps] = React.useState(getTodaySteps);
  const [committedSteps, setCommittedSteps] = React.useState(initialSteps);
  const committedStepsRef = React.useRef(initialSteps);
  const syncTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // The garden clock. Drives flipbook/bloom/abundance; seeded at today's fraction.
  const progress = useSharedValue(initialSteps / MAX_STEPS);
  // The instrument clock, decoupled from the garden so the digits and their
  // ring can settle quickly while the garden takes its time. Same destination,
  // different speed — see bloom.ts.
  const counter = useSharedValue(initialSteps / MAX_STEPS);
  const bloom = useDerivedValue(() => bloomFromProgress(progress.get()));
  const abundance = useDerivedValue(() => abundanceFromProgress(progress.get()));
  const clock = useLoopClock(motion, SWAY_LOOP_MS);
  const armCounterTicks = useCounterTicks(counter);

  React.useEffect(() => () => {
    if (syncTimerRef.current)
      clearTimeout(syncTimerRef.current);
  }, []);

  // The band label changes six times across the whole range, not 120 times a
  // second. The comparison runs on the UI thread every frame; the hop back to
  // React happens only when the answer actually changes. It rides the counter,
  // not the garden, so the label always matches the number on screen.
  useAnimatedReaction(
    () => bandIndexFor(counter.get()),
    (next, previous) => {
      if (next !== previous)
        scheduleOnRN(setBandIndex, next);
    },
  );

  const commit = React.useCallback(
    (nextSteps: number) => {
      const target = Math.round(clamp(nextSteps, 0, MAX_STEPS));
      const delta = target - committedStepsRef.current;

      committedStepsRef.current = target;
      setCommittedSteps(target);
      setLastDelta(delta);
      // Mirror today's total into the durable day-history store the stats heatmap
      // reads — even a zero-delta sync, which confirms the count without a bloom.
      recordDaySteps(target);

      // A sync that brought nothing back does not replay the bloom. This is the
      // rule that keeps the animation a signal instead of a loading skin.
      if (delta === 0)
        return;

      const fraction = target / MAX_STEPS;
      armCounterTicks(fraction);
      bloomTo(counter, fraction, counterDuration(delta));
      bloomTo(progress, fraction, gardenDuration(delta));
    },
    [counter, progress, armCounterTicks],
  );

  // Dev scrubber only — note where it left, no day-history write (not real steps).
  const adopt = React.useCallback((steps: number) => {
    committedStepsRef.current = Math.round(steps);
    setCommittedSteps(Math.round(steps));
    setLastDelta(null);
  }, []);

  const reset = React.useCallback(() => {
    committedStepsRef.current = 0;
    setCommittedSteps(0);
    setLastDelta(null);
    recordDaySteps(0);
    counter.set(withTiming(0, { duration: 700, easing: EASE_OUT }));
    progress.set(withTiming(0, { duration: 700, easing: EASE_OUT }));
  }, [counter, progress]);

  const sync = React.useCallback((delta = nextFakeDelta()) => { // fixed delta = dev "grab steps" button; else a random Health delta — same flow either way
    setRefreshing(true);
    syncTimerRef.current = setTimeout(() => {
      setRefreshing(false);
      commit(committedStepsRef.current + delta);
    }, SYNC_MS);
  }, [commit]);

  return {
    progress,
    counter,
    bloom,
    abundance,
    clock,
    motion,
    setMotion,
    systemReduced,
    bandIndex,
    lastDelta,
    committedSteps,
    refreshing,
    commit,
    adopt,
    reset,
    sync,
  };
}
