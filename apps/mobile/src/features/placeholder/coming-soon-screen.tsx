import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusAwareStatusBar } from '@/components/ui';
import { GardenText } from '@/features/garden/components/garden-text';
import { gardenPalettes } from '@/features/garden/palette';

type Props = {
  title: string;
  description: string;
};

/**
 * Placeholder for the tabs that exist in the approved design but are not part
 * of this milestone. It keeps the navigation shape honest without pretending
 * the screens behind it are built.
 *
 * Coloured from `gardenPalettes`, not the Stride tokens — Home is the garden
 * now, and these are the screens you land on one swipe away from it (see the
 * 2026-08-30 navigation handoff, and `StrideTabBar` right below it).
 *
 * Pinned to `gardenPalettes.light`, same reason and same ADR as the tab bar:
 * Home can't go dark until its art does, so nothing next to it can either.
 */
export function ComingSoonScreen({ title, description }: Props) {
  const insets = useSafeAreaInsets();
  const palette = gardenPalettes.light;

  return (
    <View className="flex-1 px-5" style={{ backgroundColor: palette.bg, paddingTop: insets.top }}>
      <FocusAwareStatusBar style="dark" />
      <View className="flex-1 justify-center gap-3">
        <GardenText palette={palette} variant="label">Coming soon</GardenText>
        <GardenText palette={palette} variant="title">{title}</GardenText>
        <GardenText palette={palette} variant="body">{description}</GardenText>
      </View>
    </View>
  );
}
