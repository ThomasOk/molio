import { Redirect, Tabs } from 'expo-router';
import * as React from 'react';

import { StrideTabBar } from '@/components/ui/stride-tab-bar';
import { useAuthStore as useAuth } from '@/features/auth/use-auth-store';
import { useIsFirstTime } from '@/lib/hooks/use-is-first-time';

export default function TabLayout() {
  const status = useAuth.use.status();
  const [isFirstTime] = useIsFirstTime();

  if (isFirstTime) {
    return <Redirect href="/onboarding" />;
  }
  if (status === 'signOut') {
    return <Redirect href="/login" />;
  }
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={props => <StrideTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarButtonTestID: 'home-tab' }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarButtonTestID: 'progress-tab' }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Stats', tabBarButtonTestID: 'stats-tab' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarButtonTestID: 'profile-tab' }}
      />

      {/* Template screens kept routable but off the bar; Profile will link to
          Settings once that screen is built. */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="style" options={{ href: null }} />
    </Tabs>
  );
}
