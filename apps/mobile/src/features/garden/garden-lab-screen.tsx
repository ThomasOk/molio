import type { TextStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { GardenPalette } from './palette';
import type { StrideScheme } from '@/lib/theme';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strideFonts } from '@/lib/theme';
import { BANDS, formatSteps, MAX_STEPS, MILESTONES } from './bloom';
import { AnimatedSteps } from './components/animated-steps';
import { BloomScrubber } from './components/bloom-scrubber';
import { GardenFlipbook } from './components/garden-flipbook';
import { StepRing } from './components/step-ring';
import { GARDEN_PAPER, gardenPalettes } from './palette';
import { useBloomLab } from './use-bloom-lab';

/**
 * The bloom lab.
 *
 * Not a product screen — an instrument. Three ways to drive the same garden:
 * milestone buttons (discrete jumps, the way a real sync arrives), the scrubber
 * (the continuum between them) and pull-to-refresh (a simulated Health sync
 * with a random delta, which is the real interaction).
 *
 * Everything below renders from one shared value. There is no "tier 3" state
 * anywhere in this file.
 */
export function GardenLabScreen() {
  // The paintings exist in one light only, so the lab is pinned to the light
  // palette. Dark mode for this screen needs the artwork repainted, not a
  // palette — ADR 0001, amendment 2026-08-25.
  const scheme: StrideScheme = 'light';
  const palette = gardenPalettes[scheme];

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const lab = useBloomLab();

  const [footerHeight, setFooterHeight] = React.useState(220);
  // A bottom band, like the reference: the meadow lives low and the ring floats
  // in clean cream above it. Tall stems reach up toward the ring, never into it.
  const sceneHeight = Math.round(height * 0.46);

  return (
    // The screen wears the paper's own cream, so the painting reads as the
    // surface rather than as a rectangle laid on one.
    <View style={{ flex: 1, backgroundColor: GARDEN_PAPER }}>
      <StatusBar style={palette.scheme === 'dark' ? 'light' : 'dark'} />

      {/* The garden sits on top of the control footer, not behind it — a
          garden you cannot see is not a garden you can judge. */}
      <GardenFlipbook
        progress={lab.progress}
        width={width}
        offsetBottom={footerHeight}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 20,
          paddingBottom: sceneHeight + footerHeight,
        }}
        refreshControl={(
          <RefreshControl
            refreshing={lab.refreshing}
            onRefresh={lab.sync}
            tintColor={palette.ring}
            colors={[palette.ring]}
            progressBackgroundColor={palette.card}
          />
        )}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={12}
            onPress={() => router.back()}
          >
            <GText palette={palette} variant="title">←</GText>
          </Pressable>
          <GText palette={palette} variant="title">Bloom lab</GText>
        </View>

        <LabHero
          palette={palette}
          counter={lab.counter}
          bandIndex={lab.bandIndex}
          lastDelta={lab.lastDelta}
        />
      </ScrollView>

      <LabFooter
        palette={palette}
        lab={lab}
        bottomInset={insets.bottom}
        onLayout={setFooterHeight}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------

/**
 * Centred text gets an explicit width, never `auto`.
 *
 * Auto-width `Text` measured with a runtime-loaded font comes out a hair too
 * narrow on iOS and silently drops its last glyph — "bourgeons" renders as
 * "bourgeon". Giving the box a real width and centring inside it removes the
 * measurement from the equation entirely.
 */
const BLOCK_CENTERED_LG: TextStyle = {
  marginTop: 14,
  alignSelf: 'stretch',
  textAlign: 'center',
};
const BLOCK_CENTERED_SM: TextStyle = {
  marginTop: 6,
  alignSelf: 'stretch',
  textAlign: 'center',
};
const CENTERED_IN_RING: TextStyle = {
  marginTop: 2,
  width: 192,
  textAlign: 'center',
};
const RING_FOOTNOTE: TextStyle = {
  marginTop: 10,
  width: 192,
  textAlign: 'center',
};

function LabHero({
  palette,
  counter,
  bandIndex,
  lastDelta,
}: {
  palette: GardenPalette;
  counter: SharedValue<number>;
  bandIndex: number;
  lastDelta: number | null;
}) {
  return (
    <View style={{ alignItems: 'center', marginTop: 18 }}>
      <StepRing progress={counter} palette={palette} size={208} stroke={6}>
        <AnimatedSteps progress={counter} color={palette.ink} />
        <GText palette={palette} variant="caption" style={CENTERED_IN_RING}>
          pas aujourd'hui
        </GText>
        <GText palette={palette} variant="mono" style={RING_FOOTNOTE}>
          {`Palier max · ${formatSteps(MAX_STEPS)} pas`}
        </GText>
      </StepRing>

      <GText
        palette={palette}
        variant="band"
        style={BLOCK_CENTERED_LG}
      >
        {BANDS[bandIndex].label}
      </GText>

      <GText
        palette={palette}
        variant="caption"
        style={BLOCK_CENTERED_SM}
      >
        {syncHint(lastDelta)}
      </GText>
    </View>
  );
}

/** Every way to drive the garden, pinned below it. */
function LabFooter({
  palette,
  lab,
  bottomInset,
  onLayout,
}: {
  palette: GardenPalette;
  lab: ReturnType<typeof useBloomLab>;
  bottomInset: number;
  onLayout: (height: number) => void;
}) {
  return (
    <View
      onLayout={event => onLayout(event.nativeEvent.layout.height)}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: bottomInset + 14,
        borderTopWidth: 1,
        borderTopColor: palette.cardBorder,
        backgroundColor: palette.card,
      }}
    >
      {/* Paliers — fixed step counts, not a personal goal. Each commits a jump
          the way a real Health sync would arrive. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7, paddingRight: 20 }}
      >
        {MILESTONES.map(steps => (
          <Chip
            key={steps}
            palette={palette}
            label={formatSteps(steps)}
            onPress={() => lab.commit(steps)}
          />
        ))}
      </ScrollView>

      {/* Lab instruments, kept apart from the paliers. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7, paddingRight: 20, marginTop: 8 }}
      >
        <Chip
          palette={palette}
          label={lab.motion ? 'Sway on' : 'Sway off'}
          active={lab.motion}
          onPress={() => lab.setMotion(value => !value)}
        />
        <Chip
          palette={palette}
          label="Reset"
          onPress={lab.reset}
        />
      </ScrollView>

      <BloomScrubber
        progress={lab.progress}
        counter={lab.counter}
        palette={palette}
        onCommit={lab.adopt}
      />
    </View>
  );
}

function syncHint(lastDelta: number | null): string {
  if (lastDelta === null)
    return 'Tire vers le bas pour synchroniser';
  if (lastDelta === 0)
    return 'Synchronisé · aucun nouveau pas, pas de floraison';
  return `Synchronisé · +${formatSteps(lastDelta)} pas`;
}

function Chip({
  palette,
  label,
  active = false,
  onPress,
}: {
  palette: GardenPalette;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={6}
      onPress={onPress}
      style={{
        minHeight: 40,
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: active ? palette.ringDone : palette.cardBorder,
        backgroundColor: active ? palette.chipActive : palette.card,
      }}
    >
      <GText palette={palette} variant="chip">{label}</GText>
    </Pressable>
  );
}

type GVariant = 'band' | 'caption' | 'chip' | 'label' | 'mono' | 'title';

const G_STYLES: Record<GVariant, TextStyle> = {
  title: { fontFamily: strideFonts.bold, fontSize: 19, lineHeight: 24 },
  band: { fontFamily: strideFonts.bold, fontSize: 17, lineHeight: 22 },
  chip: { fontFamily: strideFonts.semibold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: strideFonts.medium, fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: strideFonts.mono, fontSize: 11, lineHeight: 15 },
  label: {
    fontFamily: strideFonts.mono,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
};

/**
 * Local text component.
 *
 * `StrideText` styles itself from the Stride `className` tokens, which are the
 * other art direction. Keeping the garden's type on its own palette is what
 * stops this spike from quietly entangling the two.
 */
function GText({
  palette,
  variant,
  style,
  children,
}: {
  palette: GardenPalette;
  variant: GVariant;
  style?: TextStyle;
  children: React.ReactNode;
}) {
  const color
    = variant === 'caption' || variant === 'mono'
      ? palette.inkSoft
      : variant === 'label'
        ? palette.label
        : palette.ink;

  return <Text style={[G_STYLES[variant], { color }, style]}>{children}</Text>;
}
