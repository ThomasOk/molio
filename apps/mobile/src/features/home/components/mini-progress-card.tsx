import type { DayProgress, ProgressVariant } from '@/features/progress';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { StrideText } from '@/components/ui/stride-text';
import { ProgressMap } from '@/features/progress';

type Props = {
  days: DayProgress[];
  variant: ProgressVariant;
  /** Copy shown under the map while the user has no history yet. */
  hint?: string;
};

/**
 * Five weeks of recent consistency, plus the way into the full year.
 *
 * The card deliberately shows a window rather than a summary number: the point
 * is to make the run of filled cells — and any gap in it — visible at a glance.
 */
export function MiniProgressCard({ days, variant, hint }: Props) {
  return (
    <View className="gap-3 pt-[22px]">
      <View className="flex-row items-center justify-between">
        <StrideText variant="section">Last 5 weeks</StrideText>
        <Link href="/progress" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="See the whole year"
            hitSlop={12}
          >
            <StrideText
              variant="label-sm"
              className="text-[9.5px] text-stride-accent"
            >
              See year ↗
            </StrideText>
          </Pressable>
        </Link>
      </View>

      <View
        className={`
          gap-[14px] rounded-2xl border border-stride-hairline
          bg-stride-elevated p-4
        `}
      >
        <ProgressMap days={days} variant={variant} cellSize={26} gap={6} />
        {hint !== undefined && (
          <StrideText variant="caption" className="leading-[20px]">
            {hint}
          </StrideText>
        )}
      </View>
    </View>
  );
}
