import type { HomeMessage } from '@/features/home/home-copy';
import type { DayProgress, ProgressVariant } from '@/features/progress';
import { View } from 'react-native';

import { StrideText } from '@/components/ui/stride-text';
import { formatNumber } from '@/features/home/home-copy';
import { GoalGauge, TodayCell } from '@/features/progress';

type Props = {
  day: DayProgress;
  message: HomeMessage;
  variant: ProgressVariant;
};

/**
 * The part of Home that has to land in under a second: how many steps today,
 * what the goal is, and how much is left.
 *
 * The number is the hero; the enlarged day cell beside it is the same cell that
 * will join the year, which is what ties the daily loop to the annual one.
 */
export function TodayHero({ day, message, variant }: Props) {
  const empty = day.steps === 0;

  return (
    <View>
      <View className="flex-row items-end justify-between pb-5">
        <View className="gap-[6px]">
          <StrideText
            variant="hero"
            className={empty ? 'text-stride-text-empty' : undefined}
          >
            {formatNumber(day.steps)}
          </StrideText>
          <StrideText variant="mono" className="tracking-[0.66px] uppercase">
            {`Steps · Goal ${formatNumber(day.dailyGoal)}`}
          </StrideText>
        </View>

        <TodayCell day={day} variant={variant} />
      </View>

      <View className="pb-3">
        <GoalGauge day={day} variant={variant} />
      </View>

      <StrideText
        variant="message"
        className={message.isCelebration ? 'text-stride-accent' : undefined}
      >
        {message.text}
      </StrideText>
    </View>
  );
}
