import type { AnimatedRef } from 'react-native-reanimated';
import type { ExpandOrigin } from './components/expansion';
import type { GardenPalette } from './palette';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { measure, useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { strideFonts } from '@/lib/theme';
import { formatSteps, tierForDay } from './bloom';
import {
  mondayOf,
  MONTHS_SHORT,
  shiftDays,
  startOfDay,
  startOfMonth,
  WEEKDAY_LETTERS,
} from './calendar';
import { FlowerAvatar } from './components/flower-avatar';
import { MonthZoom } from './components/month-zoom';
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

/** The cell's corner radius — the rect the month zoom grows out of. */
const CELL_RADIUS = Math.max(2, Math.round(CELL / 5));

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

/** The month a column belongs to — its Thursday, same ISO rule as the labels. */
function monthOfColumn(start: Date, column: number): Date {
  return startOfMonth(shiftDays(start, column * 7 + 3));
}

/**
 * The columns of the window that belong to `month` — the block the month zoom
 * unfolds from, so it grows out of exactly the weeks it is about.
 */
function columnsOfMonth(start: Date, month: Date): { first: number; last: number } {
  let first = -1;
  let last = -1;
  for (let c = 0; c < WEEKS; c += 1) {
    const owner = monthOfColumn(start, c);
    if (owner.getTime() === month.getTime()) {
      if (first < 0)
        first = c;
      last = c;
    }
  }
  return { first: Math.max(0, first), last: Math.max(0, last) };
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
  const { grid, stats, scrollX, window: bounds } = React.useMemo(() => {
    const today = new Date();
    const start = windowStartFor(today);
    const visibleGrid = width - SCREEN_PADDING * 2 - GUTTER;
    const contentWidth = WEEKS * CELL_STEP - CELL_GAP;
    return {
      grid: buildGrid(history, today),
      stats: buildStats(history, today),
      // Open on the end of the window — today sits flush against the right edge;
      // the user scrolls left to walk back through the year.
      scrollX: Math.max(0, contentWidth - visibleGrid),
      // The months the zoom may page through: exactly the window's own span.
      window: { start, first: monthOfColumn(start, 0), last: startOfMonth(today) },
    };
  }, [history, width]);

  const { open, close, gridRef, gesture } = useMonthZoom(bounds.start);

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
          <StatBlock value={String(stats.streak)} label="Série actuelle" palette={palette} />
          <View style={[styles.statDivider, { backgroundColor: palette.cardBorder }]} />
          <StatBlock value={formatSteps(stats.best)} label="Meilleur jour" palette={palette} />
        </View>

        <ActivityGrid
          grid={grid}
          palette={palette}
          scrollX={scrollX}
          gridRef={gridRef}
          gesture={gesture}
        />

        {/* The tier ramp, calm → active, centred — the scale at a glance. */}
        <View style={styles.legend}>
          <Text style={[styles.legendCap, { color: palette.label }]}>−</Text>
          {palette.tiers.map(color => (
            <View key={color} style={[styles.legendSwatch, { backgroundColor: color }]} />
          ))}
          <Text style={[styles.legendCap, { color: palette.label }]}>+</Text>
        </View>
      </ScrollView>

      {open && (
        <MonthZoom
          origin={open.origin}
          month={open.month}
          window={{ first: bounds.first, last: bounds.last }}
          history={history}
          palette={palette}
          onClose={close}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------

/**
 * Tapping the heatmap opens the month you touched, full screen.
 *
 * The gesture only reports WHERE it landed — the column under the finger and
 * the grid's rect — and all the month arithmetic stays on the JS side, so no
 * `Date` ever has to cross into a worklet. The rect it hands the zoom is the
 * touched month's own columns, so the calendar unfolds out of exactly the weeks
 * it is about.
 */
function useMonthZoom(start: Date) {
  const [open, setOpen] = React.useState<{ month: Date; origin: ExpandOrigin } | null>(null);
  const gridRef = useAnimatedRef<Animated.View>();

  const openAt = React.useCallback(
    (column: number, box: { x: number; y: number; height: number }) => {
      const month = monthOfColumn(start, Math.max(0, Math.min(column, WEEKS - 1)));
      const span = columnsOfMonth(start, month);
      Haptics.selectionAsync();
      setOpen({
        month,
        origin: {
          x: box.x + span.first * CELL_STEP,
          y: box.y,
          width: (span.last - span.first + 1) * CELL_STEP - CELL_GAP,
          height: box.height,
          radius: CELL_RADIUS,
        },
      });
    },
    [start],
  );

  const gesture = Gesture.Tap().onEnd((event) => {
    const box = measure(gridRef);
    if (!box)
      return;
    scheduleOnRN(openAt, Math.floor(event.x / CELL_STEP), {
      x: box.pageX,
      y: box.pageY,
      height: box.height,
    });
  });

  const close = React.useCallback(() => setOpen(null), []);

  return { open, close, gridRef, gesture };
}

/** The heatmap itself: the fixed weekday gutter, then the scrolling year. */
function ActivityGrid({
  grid,
  palette,
  scrollX,
  gridRef,
  gesture,
}: {
  grid: Grid;
  palette: GardenPalette;
  scrollX: number;
  gridRef: AnimatedRef<Animated.View>;
  gesture: ReturnType<typeof Gesture.Tap>;
}) {
  return (
    <View style={styles.gridRow}>
      {/* Fixed weekday gutter — stays put while the grid scrolls under it. */}
      <View style={{ width: GUTTER }}>
        <View style={{ height: MONTH_ROW_H + MONTH_ROW_MB }} />
        <View style={{ gap: CELL_GAP }}>
          {WEEKDAY_LETTERS.map(day => (
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
          {/* Tap a month's columns to unfold them into a full-screen calendar —
              at 14 px a cell is far too small to aim at. */}
          <GestureDetector gesture={gesture}>
            {/* collapsable={false} keeps a backing native view on Fabric, so
                measure() returns a rect instead of null. */}
            <Animated.View
              accessibilityRole="button"
              accessibilityLabel="Ouvrir le calendrier du mois"
              collapsable={false}
              ref={gridRef}
            >
              <TierSquares
                tiers={grid.tiers}
                columns={grid.columns}
                rows={ROWS}
                size={CELL}
                gap={CELL_GAP}
                radius={CELL_RADIUS}
                palette={palette}
              />
            </Animated.View>
          </GestureDetector>
        </View>
      </ScrollView>
    </View>
  );
}

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

/** One summary stat — a quiet label over a big number, centred in its half. */
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
      <Text style={[styles.statLabel, { color: palette.label }]}>{label}</Text>
      <Text style={[styles.statValue, { color: palette.ink }]}>{value}</Text>
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
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 6,
  },
  // Letterpress: a hard 1px light shadow under the glyphs makes the text read as
  // pressed into the paper — relief without any panel or layout change.
  statValue: {
    marginTop: 4,
    fontFamily: strideFonts.black,
    fontSize: 30,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(255, 255, 255, 0.92)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 0,
  },
  statLabel: {
    fontFamily: strideFonts.medium,
    fontSize: 12,
    lineHeight: 16,
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
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
