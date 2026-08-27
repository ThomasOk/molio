import type { SharedValue } from 'react-native-reanimated';
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
import { recordDaySteps } from './use-day-history';

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
  const [committedSteps, setCommittedSteps] = React.useState(0);

  /** Steps as last committed. Each animation runs from here to the new value. */
  const committedStepsRef = React.useRef(0);
  const syncTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // The garden clock. Drives the flipbook, the bloom and the abundance.
  const progress = useSharedValue(0);
  // The instrument clock, decoupled from the garden so the digits and their
  // ring can settle quickly while the garden takes its time. Same destination,
  // different speed — see bloom.ts.
  const counter = useSharedValue(0);
  const bloom = useDerivedValue(() => bloomFromProgress(progress.get()));
  const abundance = useDerivedValue(() => abundanceFromProgress(progress.get()));
  const clock = useLoopClock(motion, SWAY_LOOP_MS);

  React.useEffect(
    () => () => {
      if (syncTimerRef.current)
        clearTimeout(syncTimerRef.current);
    },
    [],
  );

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
      bloomTo(counter, fraction, counterDuration(delta));
      bloomTo(progress, fraction, gardenDuration(delta));
    },
    [counter, progress],
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

  const sync = React.useCallback(() => {
    setRefreshing(true);
    syncTimerRef.current = setTimeout(() => {
      setRefreshing(false);
      commit(committedStepsRef.current + nextFakeDelta());
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
