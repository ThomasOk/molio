import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StrideText } from '@/components/ui/stride-text';

/**
 * Stride's bottom navigation.
 *
 * The active marker is a neutral pill rather than an icon, deliberately: the
 * design keeps every piece of chrome independent of the progress cell's shape,
 * so switching to Living Cells never leaves the navigation looking wrong.
 */
export function StrideTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`
        flex-row border-t border-stride-hairline bg-stride-bg px-6 pt-[14px]
      `}
      style={{ paddingBottom: Math.max(insets.bottom, 22) }}
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
              className={`
                h-[6px] rounded-full
                ${focused ? 'w-[18px] bg-stride-accent' : 'w-[6px] bg-stride-border'}
              `}
            />
            <StrideText
              variant="label-sm"
              className={`
                text-[8.5px] tracking-[0.85px]
                ${focused ? 'text-stride-text' : 'text-stride-muted'}
              `}
            >
              {label}
            </StrideText>
          </Pressable>
        );
      })}
    </View>
  );
}
