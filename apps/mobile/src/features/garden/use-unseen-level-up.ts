import { useFocusEffect } from 'expo-router';
import * as React from 'react';

import { STEPS_PER_LEVEL } from './bloom';
import { getLastSeenSteps } from './level-progress';

/**
 * True when the day's level sits above the last level the user saw on the level
 * screen — i.e. a sync has earned levels they haven't looked at yet.
 *
 * The "last seen" comes from the same MMKV value the level screen writes on
 * entry, so opening that screen clears this on the way back: `useFocusEffect`
 * re-reads it whenever the home regains focus. A new sync raises `committedSteps`
 * and lights it straight away.
 */
export function useUnseenLevelUp(committedSteps: number): boolean {
  const [lastSeen, setLastSeen] = React.useState(getLastSeenSteps);

  useFocusEffect(
    React.useCallback(() => {
      setLastSeen(getLastSeenSteps());
    }, []),
  );

  return (
    Math.floor(committedSteps / STEPS_PER_LEVEL)
    > Math.floor(lastSeen / STEPS_PER_LEVEL)
  );
}
