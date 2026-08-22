import type { ReactNode } from 'react';
import type { ProgressSummary } from '@/features/progress';
import { View } from 'react-native';

import { GradientFill } from '@/components/ui/gradient-fill';
import { StrideText } from '@/components/ui/stride-text';
import { formatNumber } from '@/features/home/home-copy';
import { useStrideTheme } from '@/lib/theme';

type Props = {
  summary: ProgressSummary;
};

type CardProps = {
  /** Flex grow factor. The design splits this row 1 : 1.5. */
  grow: number;
  label: string;
  /** Row spacing inside the card — it differs per card in the design. */
  innerClassName: string;
  children: ReactNode;
};

/**
 * Zero flex basis, spelled as a percentage.
 *
 * A numeric `0` is dropped on the way to Yoga and the item silently falls back
 * to `auto`. `'0%'` survives.
 */
const ZERO_BASIS = '0%';

/**
 * A stat card: a dominant number over a mono label.
 *
 * Padding sits on an inner view, not on the flex item. Yoga resolves
 * `flexBasis` against the *content* box, so padding on the item is added on
 * top of the basis — whereas the design's CSS (`box-sizing: border-box`)
 * folds it in. Left on the item, the row's 1 : 1.5 split renders as 1 : 1.38.
 * Measured on device with the padding moved inside: 141.3 / 210.7pt against a
 * 140.8 / 211.2 target.
 */
function StatCard({ grow, label, innerClassName, children }: CardProps) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      className="rounded-2xl border border-stride-hairline bg-stride-surface"
      style={{ flexGrow: grow, flexShrink: 1, flexBasis: ZERO_BASIS }}
    >
      <View className={`p-4 ${innerClassName}`}>{children}</View>
    </View>
  );
}

/** Streak on the left, level and XP progress on the right. */
export function HomeStatsRow({ summary }: Props) {
  return (
    <View className="flex-row gap-[10px] pt-5">
      <StatCard
        grow={1}
        label={`Day streak, ${summary.streak}`}
        innerClassName="gap-[5px]"
      >
        <StrideText variant="metric-md" className="text-stride-accent">
          {summary.streak}
        </StrideText>
        <StrideText variant="label-sm">Day streak</StrideText>
      </StatCard>

      <XpCard summary={summary} />
    </View>
  );
}

function XpCard({ summary }: Props) {
  const { colors } = useStrideTheme();
  const { level, xpInLevel, xpForNextLevel, xpToday } = summary;
  const ratio = xpForNextLevel > 0 ? Math.min(1, xpInLevel / xpForNextLevel) : 0;
  const remaining = Math.max(0, xpForNextLevel - xpInLevel);

  return (
    <StatCard
      grow={1.5}
      label={`Level ${level}, ${formatNumber(xpInLevel)} of ${formatNumber(xpForNextLevel)} XP, ${formatNumber(xpToday)} earned today`}
      innerClassName="gap-[9px]"
    >
      <View className="flex-row items-baseline justify-between">
        <View className="flex-row items-baseline gap-[6px]">
          <StrideText variant="label-sm">Level</StrideText>
          <StrideText variant="metric-sm">{level}</StrideText>
        </View>
        <StrideText variant="mono" className="text-[10px] text-stride-xp">
          {`+${formatNumber(xpToday)} XP`}
        </StrideText>
      </View>

      <View className="h-[6px] overflow-hidden rounded-full bg-stride-inactive">
        <View style={{ width: `${ratio * 100}%`, height: '100%' }}>
          <GradientFill from={colors.xpDim} to={colors.xp} direction="horizontal" />
        </View>
      </View>

      <StrideText variant="label-sm" className="text-stride-muted">
        {`${formatNumber(remaining)} XP to L${level + 1}`}
      </StrideText>
    </StatCard>
  );
}
