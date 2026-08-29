import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';
import type { Standing } from './leaderboard';
import type { GardenPalette } from './palette';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strideFonts } from '@/lib/theme';
import { formatSteps } from './bloom';
import { formatDayMonth } from './calendar';
import { FlowerAvatar } from './components/flower-avatar';
import { TrendRow } from './components/trend-row';
import { buildStandings } from './leaderboard';
import { GARDEN_PAPER, gardenPalettes } from './palette';
import { useDayHistory } from './use-day-history';

const SCREEN_PADDING = 20;

/**
 * Every row's portrait, mocked friends included — one shared painting until
 * there are several to choose from (see `PROFILE.avatar`'s doc comment) and a
 * picker exists. It measurably beat `FlowerAvatar` here: a dozen rows of
 * hand-drawn SVG petals (~11 shapes apiece) cost enough paint time on Android
 * hardware to show up as a delay opening the screen, invisible in the
 * simulator. Rank and name already carry a row's identity without the colour.
 */
const ROW_AVATAR = require('./assets/profile-poppy.png') as number;
/**
 * Every row is exactly this tall — the portrait (42) plus its breathing room.
 * Pinned rather than left to the text, because the pinned bar finds my row by
 * arithmetic (`listTop + rank × ROW_H`) instead of measuring twelve views, and
 * that only holds if a row cannot grow under a larger font.
 */
const ROW_H = 68;
const AVATAR = 42;
/** The pinned bar's own padding, above the home indicator's inset. */
const PIN_PAD = 6;
/** The pinned bar's fade — short enough to feel like a consequence of the scroll. */
const PIN_MS = 160;

/**
 * The day's leaderboard — where you stand among your friends right now.
 *
 * One row each: the portrait, the name, today's steps, and the week behind it as
 * tier squares. The squares are the SHARED ramp (`palette.tiers`), the same one
 * the heatmap paints with, which is what makes two rows comparable at a glance —
 * identity is carried by rank and name instead, since every portrait is
 * currently the same shared painting (see `ROW_AVATAR`'s doc comment).
 *
 * The friends are mocked (`friends.ts`); my own row is not — it reads the real
 * day history, so a sync on the home screen moves me up the board.
 */
export function GardenLeaderboardScreen() {
  const palette = gardenPalettes.light;
  const insets = useSafeAreaInsets();
  const history = useDayHistory.use.history();

  const { standings, today } = React.useMemo(() => {
    const now = new Date();
    return { standings: buildStandings(history, now), today: now };
  }, [history]);

  const myRank = standings.findIndex(one => one.isMe);
  const me = standings[myRank];
  // The bar is a row plus its own padding plus whatever the home indicator
  // takes — the same number has to drive the slide and the visibility test, or
  // it stops halfway off the screen.
  const pinHeight = ROW_H + PIN_PAD * 2 + insets.bottom;
  const pin = useMyRowPin({ myRank, pinHeight });

  return (
    <View style={{ flex: 1, backgroundColor: GARDEN_PAPER }} onLayout={pin.onViewportLayout}>
      <StatusBar style="dark" />
      <BackButton palette={palette} />

      <Animated.ScrollView
        ref={pin.scrollerRef}
        onScroll={pin.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 64,
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: pinHeight + 24,
        }}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: palette.ink }]}>Classement</Text>
          <FlowerAvatar hue="red" size={22} palette={palette} disc={false} />
        </View>
        <Text style={[styles.subtitle, { color: palette.label }]}>
          {formatDayMonth(today)}
          {' · '}
          {standings.length}
          {' marcheurs'}
        </Text>

        <View style={styles.list} onLayout={pin.onListLayout}>
          {standings.map((standing, index) => (
            <StandingRow
              key={standing.id}
              standing={standing}
              rank={index + 1}
              palette={palette}
              // No hairline against the highlighted row — its own outline is the
              // separation, and a rule touching it would read as a seam.
              divider={index > 0 && !standing.isMe && !standings[index - 1].isMe}
            />
          ))}
        </View>
      </Animated.ScrollView>

      {me && (
        <PinnedRow
          standing={me}
          rank={myRank + 1}
          palette={palette}
          style={pin.rPin}
          bottom={insets.bottom + PIN_PAD}
          onPress={pin.scrollToMe}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------

/**
 * Keeps my own row reachable: when it scrolls out of view, a copy of it slides
 * up from the bottom edge; tap it to travel back to the real one.
 *
 * My row's position is arithmetic, not a measurement — the list's own offset
 * plus my rank times the fixed `ROW_H`. One layout event instead of a ref per
 * row, and the answer stays correct while the list is being scrolled.
 *
 * The visibility test reserves the bar's own height at the bottom, so it appears
 * exactly when my row would start hiding behind it rather than after.
 */
function useMyRowPin({ myRank, pinHeight }: { myRank: number; pinHeight: number }) {
  const scrollY = useSharedValue(0);
  const [box, setBox] = React.useState({ listTop: 0, viewport: 0 });
  const scrollerRef = React.useRef<React.ComponentRef<typeof Animated.ScrollView>>(null);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  const myTop = box.listTop + myRank * ROW_H;

  const hidden = useDerivedValue(() => {
    // Before the first layout there is nothing to compare against; showing the
    // bar then would flash it on every mount.
    if (box.viewport === 0 || myRank < 0)
      return 0;

    const y = scrollY.get();
    const gone = myTop < y || myTop + ROW_H > y + box.viewport - pinHeight;
    return gone ? 1 : 0;
  });

  // Animate on the CROSSING, not on the value: a `withTiming` returned straight
  // from the derived value would be restarted by every scroll frame, and an
  // easing that keeps restarting never actually arrives.
  const shown = useSharedValue(0);
  useAnimatedReaction(
    () => hidden.get(),
    (next, previous) => {
      if (next !== previous)
        shown.set(withTiming(next, { duration: PIN_MS }));
    },
  );

  const rPin = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateY: (1 - shown.get()) * pinHeight }],
  }));

  const onListLayout = (event: LayoutChangeEvent) => {
    const { y } = event.nativeEvent.layout;
    setBox(current => (current.listTop === y ? current : { ...current, listTop: y }));
  };

  const onViewportLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setBox(current => (current.viewport === height ? current : { ...current, viewport: height }));
  };

  const scrollToMe = () =>
    scrollerRef.current?.scrollTo({
      y: Math.max(0, myTop - box.viewport / 2 + ROW_H / 2),
      animated: true,
    });

  return { scrollerRef, onScroll, rPin, onListLayout, onViewportLayout, scrollToMe };
}

/** One walker: rank, portrait, name over today's steps, and the week behind. */
function StandingRow({
  standing,
  rank,
  palette,
  divider,
}: {
  standing: Standing;
  rank: number;
  palette: GardenPalette;
  divider: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.cardBorder },
        // My row rests on a lighter patch of the same paper — not the white card
        // the stats screen turned down. It happens once, so it marks instead of
        // furnishing.
        standing.isMe && {
          backgroundColor: '#FFFDF7',
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: palette.cardBorder,
          marginHorizontal: -12,
          paddingHorizontal: 12,
        },
      ]}
    >
      <Text
        style={[styles.rank, { color: standing.isMe ? palette.inkSoft : palette.label }]}
      >
        {rank}
      </Text>

      <View style={styles.avatar}>
        <Image
          source={ROW_AVATAR}
          contentFit="cover"
          style={{
            width: AVATAR,
            height: AVATAR,
            borderRadius: AVATAR / 2,
            borderWidth: Math.max(1.5, AVATAR * 0.04),
            borderColor: palette.cardBorder,
          }}
        />
        {/* Same badge as the level screen's portrait (`palette.ring` ring,
            paper-coloured seam), sized down for a row instead of the big
            character-sheet avatar — and fed the SAME formula, just today's
            steps in place of the running total nobody mocks per friend. */}
        <View style={[styles.levelBadge, { backgroundColor: palette.ring, borderColor: GARDEN_PAPER }]}>
          <Text style={styles.levelBadgeText}>{standing.level}</Text>
        </View>
      </View>

      <View style={styles.who}>
        <Text numberOfLines={1} style={[styles.name, { color: palette.ink }]}>
          {standing.name}
          {standing.isMe && <Text style={[styles.you, { color: palette.inkSoft }]}>  VOUS</Text>}
        </Text>
        <Text style={[styles.steps, { color: palette.label }]}>
          {formatSteps(standing.steps)}
        </Text>
      </View>

      <TrendRow tiers={standing.tiers} palette={palette} />
    </View>
  );
}

/**
 * My row again, held against the bottom edge once the real one has scrolled off.
 *
 * It rides on the paper with a hairline above it rather than a shadow: the
 * garden has no elevation anywhere else, and the rule is enough to say the bar
 * is in front of the list.
 */
function PinnedRow({
  standing,
  rank,
  palette,
  style,
  bottom,
  onPress,
}: {
  standing: Standing;
  rank: number;
  palette: GardenPalette;
  style: StyleProp<AnimatedStyle<ViewStyle>>;
  bottom: number;
  onPress: () => void;
}) {
  return (
    <Animated.View
      style={[
        styles.pinned,
        {
          backgroundColor: GARDEN_PAPER,
          borderTopColor: palette.cardBorder,
          paddingBottom: bottom,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ma position, ${rank}e — revenir à ma ligne`}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <StandingRow standing={standing} rank={rank} palette={palette} divider={false} />
      </Pressable>
    </Animated.View>
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
        left: SCREEN_PADDING,
        zIndex: 2,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Text style={[styles.back, { color: palette.inkSoft }]}>‹ Retour</Text>
    </Pressable>
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
  subtitle: {
    marginTop: 4,
    fontFamily: strideFonts.medium,
    fontSize: 13,
    lineHeight: 17,
  },
  list: {
    marginTop: 20,
  },
  row: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rank: {
    width: 18,
    textAlign: 'center',
    fontFamily: strideFonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    fontVariant: ['tabular-nums'],
  },
  // `alignItems: 'center'` centres the badge horizontally on the unconstrained
  // axis, same trick the level screen's portrait uses for its own badge.
  avatar: {
    width: AVATAR,
    height: AVATAR,
    alignItems: 'center',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    fontFamily: strideFonts.black,
    fontSize: 9,
    lineHeight: 11,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  who: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: strideFonts.bold,
    fontSize: 16,
    lineHeight: 21,
  },
  you: {
    fontFamily: strideFonts.bold,
    fontSize: 10,
    lineHeight: 21,
  },
  steps: {
    marginTop: 1,
    fontFamily: strideFonts.medium,
    fontSize: 13,
    lineHeight: 17,
    fontVariant: ['tabular-nums'],
  },
  pinned: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: PIN_PAD,
    paddingHorizontal: SCREEN_PADDING,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
