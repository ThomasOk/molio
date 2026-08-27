import type { Hue } from './palette';

/**
 * The player's profile.
 *
 * Predefined for now — one name, one flower — and read from this single place by
 * both the home portrait and the level screen so they never drift. This is the
 * seed of a real profile store (chosen flower, editable name, later a synced
 * account for the leaderboard); until then, edit it here.
 */
export type Profile = {
  name: string;
  flower: Hue;
};

export const PROFILE: Profile = {
  name: 'Thomas',
  flower: 'coral',
};
