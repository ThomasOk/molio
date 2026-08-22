import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusAwareStatusBar } from '@/components/ui';
import { StrideText } from '@/components/ui/stride-text';

type Props = {
  title: string;
  description: string;
};

/**
 * Placeholder for the tabs that exist in the approved design but are not part
 * of this milestone. It keeps the navigation shape honest without pretending
 * the screens behind it are built.
 */
export function ComingSoonScreen({ title, description }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-stride-bg px-5" style={{ paddingTop: insets.top }}>
      <FocusAwareStatusBar />
      <View className="flex-1 justify-center gap-3">
        <StrideText variant="label">Coming soon</StrideText>
        <StrideText variant="h1">{title}</StrideText>
        <StrideText variant="body">{description}</StrideText>
      </View>
    </View>
  );
}
