import type { PanGesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import type { GardenPalette } from '../palette';
import type { DayHistory } from '../use-day-history';
import type { ExpandOrigin } from './expansion';
import type { DayCell } from './month-cells';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  measure,
  useAnimatedProps,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { strideFonts } from '@/lib/theme';
import { addMonths, formatMonthTitle, monthsBetween } from '../calendar';
import { GARDEN_PAPER } from '../palette';
import { DayZoom } from './day-zoom';
import { ExpandingSurface } from './expanding-surface';
import { buildMonthCells, COLS } from './month-cells';
import { useExpansion } from './use-expansion';
import { usePageSlide } from './use-page-slide';
import { ZoomBackButton } from './zoom-back-button';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/** Side padding of the grid — the tiles spread across what is left. */
const PLATE_PADDING = 24;
/** Height of the day number under each tile, plus the breathing room after it. */
const LABEL_H = 16;
const ROW_GAP = 12;
/** The month name and the space under it, held out of the tile arithmetic. */
const TITLE_BLOCK = 56;
/** Slack kept at the bottom so the last row never touches the home indicator. */
const BOTTOM_SLACK = 24;
/** A tile stops growing here — on a tablet, four huge squares read as buttons. */
const MAX_TILE = 96;
/** iOS' squircle ratio: a 60 pt icon has a 13.5 pt radius. */
const TILE_RADIUS_RATIO = 0.2237;
/** How much the screen behind is blurred once the month is open. */
const BLUR_INTENSITY = 40;

type Geometry = {
  /** The tile itself. */
  size: number;
  /** The column pitch — a tile centred in its share of the width. */
  slot: number;
  /** The row pitch — tile, day number, gap. */
  rowPitch: number;
};

/**
 * One month, full screen, unfolded from the heatmap.
 *
 * The first step of the zoom: the columns you tapped grow into a grid of four
 * tiles a row — big enough to actually touch (the heatmap's cells are 14 px, a
 * third of a finger), each with its day number under it. Same tier colours,
 * same days, only closer. Swipe sideways to walk through the months of the
 * window, tap a day to open it, swipe down or use the chevron to fold back into
 * the grid.
 */
export function MonthZoom({
  origin,
  month,
  window: bounds,
  history,
  palette,
  onClose,
}: {
  origin: ExpandOrigin;
  /** The month to open on (its 1st). */
  month: Date;
  /** First and last month reachable — the rolling window's own span. */
  window: { first: Date; last: Date };
  history: DayHistory;
  palette: GardenPalette;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  const { progress, scale, fade, collapse, dismissGesture } = useExpansion(onClose);

  const { current, page, rPlate } = useMonthPaging({ month, bounds });
  const { cells, rows } = React.useMemo(
    () => buildMonthCells(history, current, new Date()),
    [history, current],
  );
  const geometry = tileGeometry({
    width: screen.width,
    height: screen.height - insets.top - insets.bottom,
    rows,
  });

  const { gridRef, pressed, tap, openDay, closeDay, pageDay } = useDayPicker({
    cells,
    rows,
    geometry,
  });

  const gesture = monthGestures({ dismiss: dismissGesture, page, live: !openDay });

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.overlay}>
        <ZoomBackdrop progress={progress} />

        <ExpandingSurface
          origin={origin}
          progress={progress}
          scale={scale}
          fade={fade}
          color={GARDEN_PAPER}
        >
          <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
            <ZoomBackButton
              label="Mon activité"
              color={palette.inkSoft}
              top={insets.top + 12}
              onPress={collapse}
            />

            <Animated.View style={[styles.plate, rPlate]}>
              <Text style={[styles.monthTitle, { color: palette.ink }]}>
                {formatMonthTitle(current)}
              </Text>

              <GestureDetector gesture={tap}>
                {/* collapsable={false} keeps a backing native view on Fabric, so
                    measure() returns a rect instead of null. */}
                <Animated.View collapsable={false} ref={gridRef}>
                  {Array.from({ length: rows }, (_, row) => (
                    <View key={row} style={styles.row}>
                      {cells.slice(row * COLS, row * COLS + COLS).map((cell, col) => (
                        <DayTile
                          key={cell.key}
                          cell={cell}
                          index={row * COLS + col}
                          pressed={pressed}
                          geometry={geometry}
                          palette={palette}
                        />
                      ))}
                    </View>
                  ))}
                </Animated.View>
              </GestureDetector>
            </Animated.View>
          </View>
        </ExpandingSurface>

        {openDay && (
          <DayZoom
            origin={openDay.origin}
            day={openDay.cell}
            palette={palette}
            onClose={closeDay}
            onPage={pageDay}
          />
        )}
      </View>
    </GestureDetector>
  );
}

// ---------------------------------------------------------------------------

/** The stats screen behind, blurred out as the month takes over. */
function ZoomBackdrop({ progress }: { progress: SharedValue<number> }) {
  // Reanimated only re-applies BlurView's intensity through animatedProps; a
  // shared value passed straight to the prop freezes at its default.
  const blurProps = useAnimatedProps(() => ({ intensity: progress.get() * BLUR_INTENSITY }));

  return (
    <AnimatedBlurView
      animatedProps={blurProps}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      tint="light"
    />
  );
}

/**
 * The month's own gestures: swipe down to fold back into the grid, fling
 * sideways to walk through the window.
 *
 * All three go dead while a day is open on top — that day's swipe-down must not
 * also drag the month out from under it. The flag goes on each child because
 * `Gesture.Race` itself has no `.enabled()`.
 */
function monthGestures({
  dismiss,
  page,
  live,
}: {
  dismiss: PanGesture;
  page: (delta: number) => void;
  live: boolean;
}) {
  return Gesture.Race(
    dismiss.enabled(live),
    Gesture.Fling().direction(Directions.LEFT).enabled(live).onEnd(() => scheduleOnRN(page, 1)),
    Gesture.Fling().direction(Directions.RIGHT).enabled(live).onEnd(() => scheduleOnRN(page, -1)),
  );
}

/**
 * How big a tile can be — the smaller of what the width allows and what the
 * height allows, so a 31-day month fits on one screen without scrolling.
 *
 * Nothing scrolls here on purpose: a scroll view inside a surface that is also
 * dismissed by a downward swipe is a gesture fight, and the whole point of the
 * screen is to see the month at a glance.
 */
function tileGeometry({
  width,
  height,
  rows,
}: {
  width: number;
  height: number;
  rows: number;
}): Geometry {
  const slot = (width - PLATE_PADDING * 2) / COLS;
  const room = height - TITLE_BLOCK - BOTTOM_SLACK - rows * (LABEL_H + ROW_GAP);
  const size = Math.floor(Math.min(slot, room / rows, MAX_TILE));
  return { size, slot, rowPitch: size + LABEL_H + ROW_GAP };
}

/**
 * The month on screen, and the way through the window.
 *
 * Bounded by the rolling window's own span: there is nothing to see before its
 * first month or after the current one, so a swipe into either edge does
 * nothing at all rather than replaying a slide onto the same month.
 */
function useMonthPaging({
  month,
  bounds,
}: {
  month: Date;
  bounds: { first: Date; last: Date };
}) {
  const [current, setCurrent] = React.useState(month);
  const { slide, rPage } = usePageSlide();

  const page = (delta: number) => {
    const next = addMonths(current, delta);
    if (monthsBetween(bounds.first, next) < 0 || monthsBetween(next, bounds.last) < 0)
      return;
    Haptics.selectionAsync();
    setCurrent(next);
    slide(delta);
  };

  return { current, page, rPlate: rPage };
}

/**
 * The tile index under a touch point, or -1 outside the grid.
 *
 * Module scope on purpose: a `'worklet'` directive inside a hook makes the React
 * compiler bail on the whole hook, and the maths needs no closure anyway.
 */
function cellIndexAt(
  point: { x: number; y: number },
  grid: { geometry: Geometry; rows: number },
): number {
  'worklet';
  const col = Math.floor(point.x / grid.geometry.slot);
  const row = Math.floor(point.y / grid.geometry.rowPitch);
  if (col < 0 || col >= COLS || row < 0 || row >= grid.rows)
    return -1;
  return row * COLS + col;
}

/**
 * The page rect of one tile, from the grid's own measured corner.
 *
 * The tile is centred in its slot but sits at the top of it — the day number
 * lives underneath, inside the same slot.
 */
function tileOrigin(grid: { x: number; y: number }, index: number, geometry: Geometry): ExpandOrigin {
  const inset = (geometry.slot - geometry.size) / 2;
  return {
    x: grid.x + (index % COLS) * geometry.slot + inset,
    y: grid.y + Math.floor(index / COLS) * geometry.rowPitch,
    width: geometry.size,
    height: geometry.size,
    radius: geometry.size * TILE_RADIUS_RATIO,
  };
}

/**
 * Which day is open, and the rect its detail grows out of.
 *
 * One tap handler for the whole grid rather than a gesture per tile: the tiles
 * are on a fixed pitch, so the index is arithmetic on the touch point, and a
 * single `measure()` of the grid gives every tile's page rect. Thirty-one
 * detectors and thirty-one animated refs would buy nothing. The hit area is the
 * whole slot, not just the tile — the gutters are generous, and a near miss
 * should still open the day you aimed at.
 *
 * What is kept in state is the grid's corner and an INDEX, not a finished rect:
 * the month does not move while a day is open on top of it, so walking to the
 * next day is a matter of re-deriving its origin from that same corner. Which
 * is what makes the open day fold back into its OWN tile, not into the one you
 * happened to tap first.
 */
function useDayPicker({
  cells,
  rows,
  geometry,
}: {
  cells: DayCell[];
  rows: number;
  geometry: Geometry;
}) {
  const gridRef = useAnimatedRef<Animated.View>();
  const pressed = useSharedValue(-1);
  const [open, setOpen] = React.useState<{ index: number; grid: { x: number; y: number } } | null>(null);

  const pick = (index: number, grid: { x: number; y: number }) => {
    // The days still to come are not days you can open.
    if (!cells[index]?.selectable)
      return;
    Haptics.selectionAsync();
    setOpen({ index, grid });
  };

  const tap = Gesture.Tap()
    .onBegin(event => pressed.set(cellIndexAt(event, { geometry, rows })))
    .onFinalize(() => pressed.set(-1))
    .onEnd((event) => {
      const index = cellIndexAt(event, { geometry, rows });
      const box = measure(gridRef);
      if (index < 0 || !box)
        return;
      scheduleOnRN(pick, index, { x: box.pageX, y: box.pageY });
    });

  const closeDay = () => setOpen(null);

  /**
   * Walk to the neighbouring day, within this month. Returns whether it moved,
   * so the detail only replays its slide when there was somewhere to go — the
   * 1st and the last lived day are walls, and days still to come are not days.
   * Crossing into another month is deliberately not done here: the month grid
   * is one swipe down away, and paging across would have to move the screen
   * underneath at the same time.
   */
  const pageDay = (delta: number) => {
    if (!open)
      return false;
    const next = open.index + delta;
    if (!cells[next]?.selectable)
      return false;
    Haptics.selectionAsync();
    setOpen({ ...open, index: next });
    return true;
  };

  const openDay = open
    ? { cell: cells[open.index], origin: tileOrigin(open.grid, open.index, geometry) }
    : null;

  return { gridRef, pressed, tap, openDay, closeDay, pageDay };
}

// ---------------------------------------------------------------------------

/** One day: its tier colour as a rounded tile, its number underneath. */
function DayTile({
  cell,
  index,
  pressed,
  geometry,
  palette,
}: {
  cell: DayCell;
  index: number;
  pressed: SharedValue<number>;
  geometry: Geometry;
  palette: GardenPalette;
}) {
  const { selectable, tier, today } = cell;
  const rStyle = useAnimatedStyle(() => ({
    opacity: selectable && pressed.get() === index ? 0.55 : 1,
  }));

  return (
    <View style={{ width: geometry.slot, height: geometry.rowPitch, alignItems: 'center' }}>
      <Animated.View
        style={[
          {
            width: geometry.size,
            height: geometry.size,
            borderRadius: geometry.size * TILE_RADIUS_RATIO,
            borderCurve: 'continuous',
            backgroundColor: tier >= 0 ? palette.tiers[tier] : 'transparent',
            // A day still to come keeps its place as an empty outline.
            borderWidth: cell.future ? StyleSheet.hairlineWidth : 0,
            borderColor: palette.cardBorder,
          },
          rStyle,
        ]}
      />
      <Text
        style={[
          styles.dayLabel,
          today ? styles.dayLabelToday : null,
          { color: today ? palette.ink : palette.label, opacity: cell.future ? 0.5 : 1 },
        ]}
      >
        {cell.label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Above the stats screen's own back control, which carries zIndex 1 to clear
    // its ScrollView. It is a SIBLING of this overlay and sits at the very same
    // spot, so without this it paints over the whole zoom — and swallows the tap
    // meant for the zoom's own back button, sending you home instead.
    zIndex: 2,
  },
  screen: {
    flex: 1,
  },
  plate: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: PLATE_PADDING,
  },
  monthTitle: {
    fontFamily: strideFonts.bold,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: TITLE_BLOCK - 28,
  },
  row: {
    flexDirection: 'row',
  },
  dayLabel: {
    fontFamily: strideFonts.medium,
    fontSize: 12,
    lineHeight: LABEL_H,
    textAlign: 'center',
  },
  dayLabelToday: {
    fontFamily: strideFonts.bold,
  },
});
