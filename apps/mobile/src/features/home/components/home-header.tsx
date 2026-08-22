import { View } from 'react-native';

import { StrideText } from '@/components/ui/stride-text';
import { formatHeaderDate } from '@/features/home/home-copy';

type Props = {
  date: Date;
  streak: number;
};

/** "Today / SAT 22 AUG" on the left, the streak pill on the right. */
export function HomeHeader({ date, streak }: Props) {
  return (
    <View className="flex-row items-center justify-between pt-[6px] pb-[22px]">
      <View className="gap-[2px]">
        <StrideText variant="title">Today</StrideText>
        <StrideText variant="label" className="tracking-[0.8px]">
          {formatHeaderDate(date)}
        </StrideText>
      </View>

      {streak > 0 ? <StreakPill streak={streak} /> : <DayOneChip />}
    </View>
  );
}

/**
 * Three rising bars plus the count. The bars are the streak's second signal —
 * the pill still reads as a streak with colour stripped out.
 */
function StreakPill({ streak }: { streak: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`Current streak, ${streak} days`}
      className={`
        flex-row items-center gap-[7px] rounded-full border
        border-stride-accent-ring bg-stride-surface px-3 py-[7px]
      `}
    >
      <View className="flex-row items-end gap-[2px]">
        <View className="h-[7px] w-[3px] rounded-[1px] bg-stride-primary-dim" />
        <View className="h-[10px] w-[3px] rounded-[1px] bg-stride-primary" />
        <View className="h-[13px] w-[3px] rounded-[1px] bg-stride-accent" />
      </View>
      <StrideText
        variant="metric-sm"
        className="font-stride-bold text-[13px] leading-[16px]"
      >
        {streak}
      </StrideText>
    </View>
  );
}

function DayOneChip() {
  return (
    <View className="rounded-full border border-stride-ring px-[10px] py-[6px]">
      <StrideText variant="label" className="text-stride-muted">Day 1</StrideText>
    </View>
  );
}
