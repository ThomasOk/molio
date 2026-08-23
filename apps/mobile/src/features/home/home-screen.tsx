import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusAwareStatusBar } from '@/components/ui';
import { GardenLabLink } from '@/features/garden/components/garden-lab-link';
import { HomeHeader } from '@/features/home/components/home-header';
import { HomeStatsRow } from '@/features/home/components/home-stats-row';
import { MiniProgressCard } from '@/features/home/components/mini-progress-card';
import { ScenarioSwitcher } from '@/features/home/components/scenario-switcher';
import { TodayHero } from '@/features/home/components/today-hero';
import { homeMessage } from '@/features/home/home-copy';
import { useHomeScenario } from '@/features/home/use-home-scenario';
import { getMockSummary } from '@/features/progress/mock-data';

const EMPTY_HINT
  = 'One cell per day. The first one fills as soon as your steps sync.';

/**
 * Home — one layout, driven entirely by a `ProgressSummary`.
 *
 * Low progress, almost complete and goal complete are not three screens; they
 * are three sets of numbers flowing through the same tree. That is why the
 * scenario switcher below can swap them without anything re-laying out.
 */
export function HomeScreen() {
  const scenario = useHomeScenario.use.scenario();
  const variant = useHomeScenario.use.variant();
  const insets = useSafeAreaInsets();

  // Mocked for this milestone. A health service layer will supply this later;
  // nothing below this line knows where the numbers came from.
  const summary = React.useMemo(() => getMockSummary(scenario), [scenario]);
  const message = React.useMemo(() => homeMessage(summary), [summary]);
  const hasHistory = summary.recentDays.some(day => day.hasData && !day.isToday);

  return (
    <View className="flex-1 bg-stride-bg">
      <FocusAwareStatusBar />
      <ScrollView
        contentContainerClassName="px-5 pb-6"
        contentContainerStyle={{ paddingTop: insets.top }}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader date={new Date()} streak={summary.streak} />
        <TodayHero day={summary.today} message={message} variant={variant} />
        <HomeStatsRow summary={summary} />
        <MiniProgressCard
          days={summary.recentDays}
          variant={variant}
          hint={hasHistory ? undefined : EMPTY_HINT}
        />
        <ScenarioSwitcher />
        <GardenLabLink />
      </ScrollView>
    </View>
  );
}
