import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GardenText } from '@/features/garden/components/garden-text';
import { gardenPalettes } from '@/features/garden/palette';

/**
 * The app's bottom navigation.
 *
 * Coloured from `gardenPalettes` rather than the Stride tokens: Home is the
 * garden now (2026-08-30 handoff), and a Stride-dark bar under a cream screen
 * read as two different apps stacked on top of each other. Progress/Stats/
 * Profile carry the same palette (see `ComingSoonScreen`) so the bar doesn't
 * clash the moment you switch tabs.
 *
 * Pinned to `gardenPalettes.light`, not the system scheme — same constraint as
 * `GardenHomeScreen`: the flipbook art only exists on the cream paper (ADR
 * 0001, amendment 2026-08-25, "pas de mode sombre sur Home sans refaire
 * peindre l'art"). A theme-aware bar would turn dark under a Home that stays
 * cream regardless, which is the inconsistency this bar exists to avoid.
 * Revisit once Home has dark art.
 *
 * The active marker is a neutral pill rather than an icon, deliberately: the
 * design keeps every piece of chrome independent of the progress cell's shape,
 * so switching to Living Cells never leaves the navigation looking wrong.
 */
export function StrideTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const palette = gardenPalettes.light;

  return (
    <View
      className="flex-row px-6 pt-[14px]"
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        // Black, not `cardBorder` — a hairline of that soft cream tone barely
        // read against the paper; explicit ask for a firm line under the nav.
        borderTopColor: '#000000',
        backgroundColor: palette.bg,
        paddingBottom: Math.max(insets.bottom, 22),
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        // Expo Router rewrites `href: null` into a hidden item style before the
        // options reach us, so that — not `href` — is what marks a hidden tab.
        if (StyleSheet.flatten(options.tabBarItemStyle)?.display === 'none')
          return null;

        const focused = state.index === index;
        const label = options.title ?? route.name;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            testID={options.tabBarButtonTestID}
            className="items-center gap-[7px]"
            // flexBasis must be '0%': a numeric 0 is dropped and the tabs
            // would then be sized by their label widths rather than evenly.
            style={{ flexGrow: 1, flexShrink: 1, flexBasis: '0%' }}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented)
                navigation.navigate(route.name, route.params);
            }}
          >
            <View
              style={{
                height: 6,
                borderRadius: 3,
                width: focused ? 18 : 6,
                // The completed-ring green, not the XP coral — this pill marks
                // where you are, closer to "goal met" than to a reward.
                backgroundColor: focused ? palette.ringDone : palette.chip,
              }}
            />
            <GardenText
              palette={palette}
              variant="label"
              style={{
                fontSize: 8.5,
                lineHeight: 11,
                letterSpacing: 0.85,
                color: focused ? palette.ink : palette.label,
              }}
            >
              {label}
            </GardenText>
          </Pressable>
        );
      })}
    </View>
  );
}
