import type { ViewProps } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Toaster } from 'sonner-native';
import { useThemeConfig } from '@/components/ui/use-theme-config';
import { hydrateAuth } from '@/features/auth/use-auth-store';
import { GARDEN_PAPER } from '@/features/garden/palette';
import { hydrateDayHistory } from '@/features/garden/use-day-history';

import { APIProvider } from '@/lib/api';
import { loadSelectedTheme } from '@/lib/hooks/use-selected-theme';
import { useStrideFonts } from '@/lib/theme';
// Import  global CSS file
import '../global.css';

export { ErrorBoundary } from 'expo-router';

// eslint-disable-next-line react-refresh/only-export-components
export const unstable_settings = {
  initialRouteName: '(app)',
};

hydrateAuth();
hydrateDayHistory();
loadSelectedTheme();
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

export default function RootLayout() {
  const hasHiddenSplashRef = React.useRef(false);
  const hasLaidOutRef = React.useRef(false);
  // Stride's typography is load-bearing, so hold the splash until Manrope and
  // JetBrains Mono are ready rather than flashing a fallback face.
  const fontsLoaded = useStrideFonts();

  const hideSplash = React.useCallback(() => {
    if (hasHiddenSplashRef.current || !hasLaidOutRef.current || !fontsLoaded) {
      return;
    }

    hasHiddenSplashRef.current = true;
    SplashScreen.hide();
  }, [fontsLoaded]);

  // Layout usually wins the race against font loading, so both paths retry.
  React.useEffect(hideSplash, [hideSplash]);

  const onLayoutRootView = React.useCallback(() => {
    hasLaidOutRef.current = true;
    hideSplash();
  }, [hideSplash]);

  return (
    <Providers onLayout={onLayoutRootView}>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        {/* The botanical home, and its test bench — both reachable from Home
            in dev.

            They carry `contentStyle` as well as painting their own paper: the
            navigator's own screen background comes from the React Navigation
            theme (white when light, #121212 when dark), and while a screen
            animates in it is briefly translucent — enough for that background
            to tint the cream, which on a dark-themed device reads as the new
            screen arriving dimmed. Handing the navigator the same paper means
            there is nothing behind to show through. */}
        <Stack.Screen
          name="garden"
          options={{ headerShown: false, contentStyle: { backgroundColor: GARDEN_PAPER } }}
        />
        <Stack.Screen
          name="garden-lab"
          options={{ headerShown: false, contentStyle: { backgroundColor: GARDEN_PAPER } }}
        />
        <Stack.Screen
          name="garden-leaderboard"
          options={{ headerShown: false, contentStyle: { backgroundColor: GARDEN_PAPER } }}
        />
        <Stack.Screen
          name="garden-level"
          options={{ headerShown: false, contentStyle: { backgroundColor: GARDEN_PAPER } }}
        />
        <Stack.Screen
          name="garden-stats"
          options={{ headerShown: false, contentStyle: { backgroundColor: GARDEN_PAPER } }}
        />
      </Stack>
    </Providers>
  );
}

function Providers({
  children,
  onLayout,
}: {
  children: React.ReactNode;
  onLayout: ViewProps['onLayout'];
}) {
  const theme = useThemeConfig();
  return (
    <GestureHandlerRootView
      onLayout={onLayout}
      style={styles.container}
      // eslint-disable-next-line better-tailwindcss/no-unknown-classes
      className={theme.dark ? `dark` : undefined}
    >
      <KeyboardProvider>
        <ThemeProvider value={theme}>
          <APIProvider>
            <BottomSheetModalProvider>
              {children}
              <FlashMessage position="top" />
              <Toaster />
            </BottomSheetModalProvider>
          </APIProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
