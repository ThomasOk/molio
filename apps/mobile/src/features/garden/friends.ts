import type { Hue } from './palette';

/**
 * The people you walk against.
 *
 * A mock, exactly like `PROFILE` and the seeded day history — there is no
 * account system and no server, so the leaderboard would otherwise be a list of
 * one. Delete this file the day real friends arrive; `buildStandings` is written
 * so that only its source changes, not its shape.
 *
 * There are more walkers than the palette has hues, so a couple of flowers
 * repeat. That is the honest state of a garden, and the rank + name carry the
 * identity anyway — the hue only has to make a row findable at a glance.
 */
export type Friend = {
  id: string;
  name: string;
  flower: Hue;
  /**
   * Steps for the last `TREND_DAYS` days, OLDEST FIRST — the final entry is
   * TODAY. One field rather than a separate "steps today", so the number the row
   * ranks on and the last square of its trend can never disagree.
   */
  days: number[];
};

/** `PROFILE.flower` is coral, so no friend takes that hue — my row stays mine. */
export const FRIENDS: Friend[] = [
  { id: 'camille', name: 'Camille', flower: 'lilac', days: [12400, 9800, 15600, 8200, 11900, 13050, 14820] },
  { id: 'naila', name: 'Naïla', flower: 'yellow', days: [4200, 7600, 0, 9100, 6300, 10400, 11305] },
  { id: 'hugo', name: 'Hugo', flower: 'blue', days: [16200, 11800, 7400, 6900, 0, 5200, 9940] },
  { id: 'lea', name: 'Léa', flower: 'pink', days: [7800, 8100, 7950, 4600, 8300, 9200, 8615] },
  { id: 'sofiane', name: 'Sofiane', flower: 'red', days: [0, 3400, 9600, 5100, 2800, 0, 7250] },
  { id: 'margaux', name: 'Margaux', flower: 'white', days: [5900, 6200, 4800, 5300, 6100, 4400, 5480] },
  { id: 'emile', name: 'Émile', flower: 'cream', days: [9100, 0, 3200, 4700, 0, 6800, 4130] },
  { id: 'anouk', name: 'Anouk', flower: 'lilac', days: [2400, 5600, 6900, 3100, 4200, 2900, 3610] },
  { id: 'baptiste', name: 'Baptiste', flower: 'blue', days: [8700, 4100, 0, 0, 3800, 1900, 2060] },
  { id: 'yasmine', name: 'Yasmine', flower: 'pink', days: [3300, 2100, 4400, 1800, 0, 2500, 980] },
  { id: 'theo', name: 'Théo', flower: 'yellow', days: [6400, 5100, 5800, 0, 4900, 3700, 0] },
];
