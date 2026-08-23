import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { StrideText } from '@/components/ui/stride-text';

/**
 * Dev-only way into the bloom lab.
 *
 * Renders nothing outside `__DEV__`, and sits under the scenario switcher so it
 * never competes with Home's real hierarchy.
 */
export function GardenLabLink() {
  if (!__DEV__)
    return null;

  return (
    <View className="mt-4">
      <Link href="/garden" asChild>
        <Pressable
          accessibilityRole="button"
          hitSlop={6}
          className={`
            self-start rounded-lg border border-stride-hairline
            bg-stride-surface px-[9px] py-[7px]
          `}
        >
          <StrideText variant="label-sm" className="text-stride-text">
            Dev · Bloom lab →
          </StrideText>
        </Pressable>
      </Link>
    </View>
  );
}
