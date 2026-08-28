import type { GardenPalette } from './palette';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strideFonts } from '@/lib/theme';
import { formatSteps, tierForDay } from './bloom';
import { FlowerAvatar } from './components/flower-avatar';
import { TierSquares } from './components/tier-squares';
import { GARDEN_PAPER, gardenPalettes } from './palette';
import { dayKey, useDayHistory } from './use-day-history';

/** A rolling window of 52 week-columns × 7 day-rows (Monday-first) ending today. */
const WEEKS = 52;
const ROWS = 7;
const CELL = 14;
const CELL_GAP = 2;
const CELL_STEP = CELL + CELL_GAP;
/** Left gutter for the weekday letters, held out of the horizontal scroll. */
const GUTTER = 18;
const SCREEN_PADDING = 20;
/** Height reserved above the grid for the month labels. */
const MONTH_ROW_H = 16;
const MONTH_ROW_MB = 6;

/** Short month names (FR), matching the mock's "jan fév mar…". */
const MONTHS_SHORT = [
  'jan',
  'fév',
  'mar',
  'avr',
  'mai',
  'juin',
  'juil',
  'août',
  'sep',
  'oct',
  'nov',
  'déc',
];
/** Monday → Sunday, every day labelled (L M M J V S D). */
const WEEKDAYS = [
  { id: 'mon', letter: 'L' },
  { id: 'tue', letter: 'M' },
  { id: 'wed', letter: 'M' },
  { id: 'thu', letter: 'J' },
  { id: 'fri', letter: 'V' },
  { id: 'sat', letter: 'S' },
  { id: 'sun', letter: 'D' },
];

/** A date `days` from `from`, at local midnight arithmetic. */
function shiftDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

/** The Monday on or before `date` (getDay: 0=Sun…6=Sat), at local midnight. */
function mondayOf(date: Date): Date {
  const since = (date.getDay() + 6) % 7;
  const m = shiftDays(date, -since);
  m.setHours(0, 0, 0, 0);
  return m;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

type Grid = {
  /** Tier per cell, COLUMN-MAJOR (index c*ROWS + r) — TierSquares' order. */
  tiers: number[];
  /** Month labels to place above the grid: the column and its name. */
  monthLabels: { column: number; label: string; key: string }[];
  columns: number;
};

type Stats = {
  streak: number;
  best: number;
};

/** The Monday that opens the rolling window: `WEEKS - 1` weeks before this week. */
function windowStartFor(today: Date): Date {
  return shiftDays(mondayOf(today), -(WEEKS - 1) * 7);
}

/**
 * Build the rolling 52-week tier grid (column per week) ending on TODAY, plus its
 * month labels — a GitHub-style contributions window that always closes on the
 * current day. It spans back a full year, so it crosses the year boundary; months
 * are pinned by each week's Thursday (the ISO convention). Days after today (this
 * week's tail) hold their place but stay unpainted (tier -1).
 */
function buildGrid(history: Record<string, number>, today: Date): Grid {
  const start = windowStartFor(today);
  const todayMs = startOfDay(today).getTime();

  const tiers: number[] = [];
  const monthLabels: Grid['monthLabels'] = [];
  let prevMonth = -1;

  for (let c = 0; c < WEEKS; c += 1) {
    // The week's Thursday decides which month owns this column.
    const thursday = shiftDays(start, c * 7 + 3);
    if (thursday.getMonth() !== prevMonth) {
      monthLabels.push({
        column: c,
        label: MONTHS_SHORT[thursday.getMonth()],
        key: `${thursday.getFullYear()}-${thursday.getMonth()}`,
      });
      prevMonth = thursday.getMonth();
    }

    for (let r = 0; r < ROWS; r += 1) {
      const date = shiftDays(start, c * 7 + r);
      tiers[c * ROWS + r]
        = startOfDay(date).getTime() > todayMs
          ? -1
          : tierForDay(history[dayKey(date)] ?? 0);
    }
  }

  return { tiers, monthLabels, columns: WEEKS };
}

/**
 * Streak and best day over the rolling window.
 *
 * The streak counts back from today, but lets today be "pending": if today has
 * no steps yet (common — you sync later in the day), it starts from yesterday so
 * the number reflects the run you're on, not a zero you haven't filled.
 */
function buildStats(history: Record<string, number>, today: Date): Stats {
  const start = windowStartFor(today);
  const todayMs = startOfDay(today).getTime();

  let best = 0;
  for (let d = new Date(start); d.getTime() <= todayMs; d.setDate(d.getDate() + 1)) {
    const steps = history[dayKey(d)] ?? 0;
    if (steps > best)
      best = steps;
  }

  const stepsOn = (offset: number) => history[dayKey(shiftDays(today, offset))] ?? 0;
  let streak = 0;
  let offset = stepsOn(0) >= 1 ? 0 : -1;
  while (stepsOn(offset) >= 1) {
    streak += 1;
    offset -= 1;
  }

  return { streak, best };
}

/**
 * Stats screen — the last year of steps as a contributions calendar.
 *
 * A rolling 52-week heatmap on the garden's paper, scrolled horizontally, in the
 * shared tier colours, plus the streak and best day. Reads the day-history store,
 * so a sync done on the home screen shows up here on the next visit. Offline; no
 * real step source yet, so the grid is seeded with demo history (past days only —
 * today tracks real syncs).
 */
export function GardenStatsScreen() {
  const palette = gardenPalettes.light;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const history = useDayHistory.use.history();

  // Recompute only when the history or width changes — not every render. `today`
  // is captured per computation; the screen is short-lived enough not to need a
  // midnight rollover watcher.
  const { grid, stats, scrollX } = React.useMemo(() => {
    const today = new Date();
    const visibleGrid = width - SCREEN_PADDING * 2 - GUTTER;
    const contentWidth = WEEKS * CELL_STEP - CELL_GAP;
    return {
      grid: buildGrid(history, today),
      stats: buildStats(history, today),
      // Open on the end of the window — today sits flush against the right edge;
      // the user scrolls left to walk back through the year.
      scrollX: Math.max(0, contentWidth - visibleGrid),
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
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: palette.ink }]}>Mon activité</Text>
          <FlowerAvatar hue="red" size={22} palette={palette} disc={false} />
        </View>

        <View style={styles.stats}>
          <StatBlock value={String(stats.streak)} label="jours de série" palette={palette} />
          <View style={[styles.statDivider, { backgroundColor: palette.cardBorder }]} />
          <StatBlock value={formatSteps(stats.best)} label="meilleur jour" palette={palette} />
        </View>

        <View style={styles.gridRow}>
          {/* Fixed weekday gutter — stays put while the grid scrolls under it. */}
          <View style={{ width: GUTTER }}>
            <View style={{ height: MONTH_ROW_H + MONTH_ROW_MB }} />
            <View style={{ gap: CELL_GAP }}>
              {WEEKDAYS.map(day => (
                <View key={day.id} style={{ height: CELL, justifyContent: 'center' }}>
                  <Text style={[styles.weekday, { color: palette.label }]}>{day.letter}</Text>
                </View>
              ))}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: scrollX, y: 0 }}
          >
            <View>
              <MonthLabels labels={grid.monthLabels} palette={palette} />
              <TierSquares
                tiers={grid.tiers}
                columns={grid.columns}
                rows={ROWS}
                size={CELL}
                gap={CELL_GAP}
                radius={Math.max(2, Math.round(CELL / 5))}
                palette={palette}
              />
            </View>
          </ScrollView>
        </View>

        {/* The tier ramp, calm → active, centred — the scale at a glance. */}
        <View style={styles.legend}>
          <Text style={[styles.legendCap, { color: palette.label }]}>−</Text>
          {palette.tiers.map(color => (
            <View key={color} style={[styles.legendSwatch, { backgroundColor: color }]} />
          ))}
          <Text style={[styles.legendCap, { color: palette.label }]}>+</Text>
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

/** One summary stat — a big number over a quiet label, centred in its half. */
function StatBlock({
  value,
  label,
  palette,
}: {
  value: string;
  label: string;
  palette: GardenPalette;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: palette.ink }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.label }]}>{label}</Text>
    </View>
  );
}

/** Month names above the grid, each pinned to the column where its month begins. */
function MonthLabels({
  labels,
  palette,
}: {
  labels: { column: number; label: string; key: string }[];
  palette: GardenPalette;
}) {
  return (
    <View style={{ height: MONTH_ROW_H, marginBottom: MONTH_ROW_MB }}>
      {labels.map(({ column, label, key }) => (
        <Text
          key={key}
          style={[styles.month, { color: palette.label, left: column * CELL_STEP }]}
        >
          {label}
        </Text>
      ))}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: strideFonts.bold,
    fontSize: 24,
    lineHeight: 30,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: strideFonts.black,
    fontSize: 30,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    marginTop: 4,
    fontFamily: strideFonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 6,
  },
  gridRow: {
    flexDirection: 'row',
    marginTop: 24,
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
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
  },
  legendCap: {
    fontFamily: strideFonts.bold,
    fontSize: 14,
    lineHeight: 14,
    marginHorizontal: 3,
  },
});
