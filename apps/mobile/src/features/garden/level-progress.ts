import { getItem, setItem } from '@/lib/storage';

/**
 * The last step count the level screen has already revealed.
 *
 * The XP reveal should play once, then again only when new steps come in — so
 * the screen animates from what the user last saw up to the current count. This
 * remembers that "last saw" across launches (MMKV). First visit ever defaults to
 * 0, which is exactly the full 0 → today reveal we want the first time.
 */
const LAST_SEEN_KEY = 'garden.level.lastSeenSteps';

export function getLastSeenSteps(): number {
  return getItem<number>(LAST_SEEN_KEY) ?? 0;
}

export function setLastSeenSteps(steps: number): void {
  setItem(LAST_SEEN_KEY, Math.round(steps));
}

/** Dev reset only — puts the reveal back to a clean 0 → today on next visit. */
export function clearLevelProgress(): void {
  setItem(LAST_SEEN_KEY, 0);
}
