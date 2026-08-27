import type { GardenPalette } from './palette';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strideFonts } from '@/lib/theme';
import { formatSteps, tierForDay } from './bloom';
import { TierSquares } from './components/tier-squares';
import { GARDEN_PAPER, gardenPalettes } from './palette';
import { dayKey, useDayHistory } from './use-day-history';

/** The heatmap window: 16 week-columns, 7 day-rows, weeks starting Monday (FR). */
const WEEKS = 16;
const ROWS = 7;
const CELL_GAP = 4;
const CELL_MAX = 18;
const CELL_MIN = 10;
/** Left gutter for the weekday letters, sized to the single-letter labels. */
const GUTTER = 16;
/** Horizontal breathing room the card takes out of the screen before the grid. */
const CARD_PADDING = 16;
const SCREEN_PADDING = 20;

const MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
/** Row order is Monday → Sunday; label Mon/Wed/Fri, blank the rest (GitHub-style). */
const WEEKDAYS = [
  { id: 'mon', letter: 'L' },
  { id: 'tue', letter: '' },
  { id: 'wed', letter: 'M' },
  { id: 'thu', letter: '' },
  { id: 'fri', letter: 'V' },
  { id: 'sat', letter: '' },
  { id: 'sun', letter: '' },
];

function clampNum(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/** A date `days` before `from`, at local midnight arithmetic. */
function shiftDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

/** The Monday on or before `date` (getDay: 0=Sun…6=Sat). */
function mondayOf(date: Date): Date {
  const since = (date.getDay() + 6) % 7;
  const m = shiftDays(date, -since);
  m.setHours(0, 0, 0, 0);
  return m;
}

type Grid = {
  /** Tier per cell, COLUMN-MAJOR (index c*ROWS + r) — TierSquares' order. */
  tiers: number[];
  /** Month labels to place above the grid: the column and its name. */
  monthLabels: { column: number; label: string; key: string }[];
};

type Stats = {
  streak: number;
  best: number;
  average: number;
};

/** Build the 16×7 tier grid and the per-column month labels from the history. */
function buildGrid(history: Record<string, number>, today: Date): Grid {
  const start = shiftDays(mondayOf(today), -(WEEKS - 1) * 7);
  const tiers: number[] = [];
  const monthLabels: Grid['monthLabels'] = [];
  let prevMonth = -1;

  for (let c = 0; c < WEEKS; c += 1) {
    const columnStart = shiftDays(start, c * 7);
    const columnMonth = columnStart.getMonth();
    // A label only where the month first appears — its column pins its x.
    if (columnMonth !== prevMonth)
      monthLabels.push({ column: c, label: MONTHS[columnMonth], key: dayKey(columnStart) });
    prevMonth = columnMonth;

    for (let r = 0; r < ROWS; r += 1) {
      const date = shiftDays(start, c * 7 + r);
      // Future days (this week's tail) hold their place but stay unpainted.
      tiers[c * ROWS + r]
        = date > today ? -1 : tierForDay(history[dayKey(date)] ?? 0);
    }
  }

  return { tiers, monthLabels };
}

/**
 * Streak, best day and average over the window.
 *
 * The streak counts back from today, but lets today be "pending": if today has
 * no steps yet (common — you sync later in the day), it starts from yesterday so
 * the number reflects the run you're on, not a zero you haven't filled. Average
 * is over ACTIVE days only, so rest days don't drag a real habit down to nothing.
 */
function buildStats(history: Record<string, number>, today: Date): Stats {
  const start = shiftDays(mondayOf(today), -(WEEKS - 1) * 7);
  let best = 0;
  let sum = 0;
  let active = 0;

  for (let i = 0; i < WEEKS * ROWS; i += 1) {
    const steps = history[dayKey(shiftDays(start, i))] ?? 0;
    if (steps >= 1) {
      active += 1;
      sum += steps;
      if (steps > best)
        best = steps;
    }
  }

  const stepsOn = (offset: number) => history[dayKey(shiftDays(today, offset))] ?? 0;
  let streak = 0;
  let offset = stepsOn(0) >= 1 ? 0 : -1;
  while (stepsOn(offset) >= 1) {
    streak += 1;
    offset -= 1;
  }

  return { streak, best, average: active > 0 ? Math.round(sum / active) : 0 };
}

/**
 * Stats screen — the day's steps as a contributions calendar.
 *
 * A 16-week heatmap on the garden's paper, in the shared tier greens, plus three
 * summary tiles. Reads the day-history store, so a sync done on the home screen
 * shows up here on the next visit. Offline; no real step source yet, so the grid
 * is seeded with demo history (past days only — today tracks real syncs).
 */
export function GardenStatsScreen() {
  const palette = gardenPalettes.light;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const history = useDayHistory.use.history();

  // Recompute only when the history or width changes — not every render. `today`
  // is captured per computation; the screen is short-lived enough not to need a
  // midnight rollover watcher.
  const { grid, stats, cell } = React.useMemo(() => {
    const today = new Date();
    const inner = width - SCREEN_PADDING * 2 - CARD_PADDING * 2 - GUTTER;
    const size = clampNum(
      Math.floor((inner - (WEEKS - 1) * CELL_GAP) / WEEKS),
      CELL_MIN,
      CELL_MAX,
    );
    return {
      grid: buildGrid(history, today),
      stats: buildStats(history, today),
      cell: size,
    };
  }, [history, width]);

  return (
    <View style={{ flex: 1, backgroundColor: GARDEN_PAPER }}>
      <StatusBar style="dark" />
      <BackButton palette={palette} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 64,
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: palette.ink }]}>Mon activité</Text>

        <View style={styles.tiles}>
          <StatTile label="Série" value={String(stats.streak)} unit="jours" palette={palette} />
          <StatTile label="Meilleur jour" value={formatSteps(stats.best)} unit="pas" palette={palette} />
          <StatTile label="Moyenne" value={formatSteps(stats.average)} unit="pas/j" palette={palette} />
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.inkSoft }]}>
            16 dernières semaines
          </Text>

          <MonthLabels labels={grid.monthLabels} cell={cell} palette={palette} />

          <View style={{ flexDirection: 'row', gap: CELL_GAP }}>
            <View style={{ width: GUTTER - CELL_GAP, gap: CELL_GAP }}>
              {WEEKDAYS.map(day => (
                <View key={day.id} style={{ height: cell, justifyContent: 'center' }}>
                  <Text style={[styles.weekday, { color: palette.label }]}>{day.letter}</Text>
                </View>
              ))}
            </View>

            <TierSquares
              tiers={grid.tiers}
              columns={WEEKS}
              rows={ROWS}
              size={cell}
              gap={CELL_GAP}
              radius={Math.max(2, Math.round(cell / 5))}
              palette={palette}
            />
          </View>

          <Legend palette={palette} />
        </View>
      </ScrollView>
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
        zIndex: 1,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Text style={[styles.back, { color: palette.inkSoft }]}>‹ Retour</Text>
    </Pressable>
  );
}

/** One summary tile — a big number over a quiet label. */
function StatTile({
  label,
  value,
  unit,
  palette,
}: {
  label: string;
  value: string;
  unit: string;
  palette: GardenPalette;
}) {
  return (
    <View style={[styles.tile, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
      <View style={styles.tileValueRow}>
        <Text style={[styles.tileValue, { color: palette.ink }]}>{value}</Text>
        <Text style={[styles.tileUnit, { color: palette.label }]}>{unit}</Text>
      </View>
      <Text style={[styles.tileLabel, { color: palette.inkSoft }]}>{label}</Text>
    </View>
  );
}

/** Month names above the grid, each pinned to the column where its month begins. */
function MonthLabels({
  labels,
  cell,
  palette,
}: {
  labels: { column: number; label: string; key: string }[];
  cell: number;
  palette: GardenPalette;
}) {
  const step = cell + CELL_GAP;
  return (
    <View style={{ height: 16, marginLeft: GUTTER, marginBottom: 4 }}>
      {labels.map(({ column, label, key }) => (
        <Text
          key={key}
          style={[styles.month, { color: palette.label, left: column * step }]}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}

/** "Moins ▢▢▢▢▢ Plus" — the tier ramp, so the greens are legible as a scale. */
function Legend({ palette }: { palette: GardenPalette }) {
  return (
    <View style={styles.legend}>
      <Text style={[styles.legendText, { color: palette.label }]}>Moins</Text>
      {palette.tiers.map(color => (
        <View key={color} style={[styles.legendCell, { backgroundColor: color }]} />
      ))}
      <Text style={[styles.legendText, { color: palette.label }]}>Plus</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  back: {
    fontFamily: strideFonts.medium,
    fontSize: 15,
    lineHeight: 20,
  },
  title: {
    fontFamily: strideFonts.bold,
    fontSize: 24,
    lineHeight: 30,
  },
  tiles: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  tile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tileValue: {
    fontFamily: strideFonts.black,
    fontSize: 22,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  tileUnit: {
    marginLeft: 3,
    fontFamily: strideFonts.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  tileLabel: {
    marginTop: 4,
    fontFamily: strideFonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: CARD_PADDING,
  },
  cardTitle: {
    fontFamily: strideFonts.bold,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 14,
  },
  weekday: {
    fontFamily: strideFonts.medium,
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
  },
  month: {
    position: 'absolute',
    top: 0,
    fontFamily: strideFonts.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
  },
  legendText: {
    fontFamily: strideFonts.medium,
    fontSize: 11,
    lineHeight: 14,
    marginHorizontal: 2,
  },
  legendCell: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
});
