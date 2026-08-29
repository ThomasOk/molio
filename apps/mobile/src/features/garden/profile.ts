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
  /**
   * The hand-painted portrait — a watercolour flower matching the garden's
   * frames. When set, it replaces the vector flower on the home portrait and
   * the level screen. Leave `null` to fall back to the recolourable
   * `FlowerAvatar`. One painting for now; more are coming, at which point this
   * becomes a choice of several rather than a single asset, with a picker to
   * choose among them.
   */
  avatar: number | null;
};

export const PROFILE: Profile = {
  name: 'Thomas',
  flower: 'coral',
  avatar: require('./assets/profile-poppy.png'),
};
