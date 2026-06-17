import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, useColorScheme, AppState, AppStateStatus } from 'react-native';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold }
  from '@expo-google-fonts/plus-jakarta-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DarkTheme, NavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import { runMigrations } from './src/db/client';
import { useGoalStore } from './src/store/goalStore';
import { useLogStore } from './src/store/logStore';
import { useBadgeStore } from './src/store/badgeStore';
import { useGameStore } from './src/store/gameStore';
import { useTodoXPStore } from './src/store/todoXPStore';
import { useJournalStore } from './src/store/journalStore';
import { setupNotificationHandler } from './src/utils/notifications';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import type { RootStackParamList } from './src/navigation/AppNavigator';
import OnboardingScreen, { ONBOARDING_KEY } from './src/screens/OnboardingScreen';
import { Colors } from './src/constants/theme';
import { THEMES, LIGHT_THEMES } from './src/constants/themes';
import { useThemeStore } from './src/store/themeStore';
import { useScheduledTaskStore } from './src/store/scheduledTaskStore';
import { useTodoStore } from './src/store/todoStore';
import { ThemeProvider } from './src/context/ThemeContext';
import { useColors } from './src/hooks/useColors';
import { useCoinStore } from './src/store/coinStore';
import { useRaidStore } from './src/store/raidStore';
import { useSeasonStore } from './src/store/seasonStore';
import { usePerkStore } from './src/store/perkStore';
import { useTitleStore } from './src/store/titleStore';
import { useFriendsStore } from './src/store/friendsStore';
import { getPlayerStats } from './src/logic/xpEngine';
import { sumXP } from './src/utils/xpUtils';
import AmbientBackground from './src/components/common/AmbientBackground';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const systemScheme = useColorScheme(); // 'dark' | 'light' | null
  const { colors: appColors, isLight } = useColors();

  const NAV_THEME = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: appColors.accentBright,
      background: 'transparent',
      card: appColors.bg0,
      text: appColors.textPrimary,
      border: appColors.border,
      notification: appColors.accentBright,
    },
  };

  useEffect(() => {
    async function bootstrap() {
      try {
        await setupNotificationHandler();
        await runMigrations();

        // Daily reset: clear todos from previous days
        const lastClear = await AsyncStorage.getItem('lastTodoClearDate');
        const todayDateStr = (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        })();
        if (lastClear !== todayDateStr) {
          await useTodoStore.getState().clearExpiredTodos();
          await AsyncStorage.setItem('lastTodoClearDate', todayDateStr);
        }
        await useTodoStore.getState().loadTodos();

        await useGoalStore.getState().loadGoals();
        await useLogStore.getState().loadLogs();
        await useBadgeStore.getState().loadBadges();
        await useGameStore.getState().load();
        await useTodoXPStore.getState().load();
        await useJournalStore.getState().loadEntries();
        await useThemeStore.getState().loadTheme();
        await useScheduledTaskStore.getState().loadScheduledTasks();
        await useScheduledTaskStore.getState().generateTodaysTasks();

        // New stores
        await useCoinStore.getState().load();
        await usePerkStore.getState().load();
        await useTitleStore.getState().load();
        await useSeasonStore.getState().load();
        await useRaidStore.getState().load();
        await useFriendsStore.getState().load();

        // Date integrity check (anti-cheat)
        await useGameStore.getState().checkDateIntegrity();

        // Boss spawn check (uses player level)
        const logs = useLogStore.getState().logs;
        const todoXP = useTodoXPStore.getState().totalXP;
        const rawXP = sumXP(logs) + todoXP;
        const adjustedXP = useGameStore.getState().getAdjustedXP(rawXP);
        const { level } = getPlayerStats(adjustedXP);
        await useRaidStore.getState().checkSpawn(level);
        await useRaidStore.getState().checkDebuff();

        // Apply the loaded theme to Colors immediately
        const { activeTheme, colorMode } = useThemeStore.getState();
        const effectiveMode = colorMode === 'system' ? (systemScheme ?? 'dark') : colorMode;
        const palette = effectiveMode === 'light' ? LIGHT_THEMES[activeTheme] : THEMES[activeTheme];
        Object.assign(Colors, palette);

        const onboarded = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!onboarded) setShowOnboarding(true);

        setReady(true);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to initialize');
      }
    }
    bootstrap();

    // Midnight reset: re-run daily clear when app returns to foreground on a new day
    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      const lastClear = await AsyncStorage.getItem('lastTodoClearDate');
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (lastClear !== today) {
        await useTodoStore.getState().clearExpiredTodos();
        await useTodoStore.getState().loadTodos();
        await AsyncStorage.setItem('lastTodoClearDate', today);
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppState);

    // Navigate to goal when user taps a notification
    const notifSub = Notifications.addNotificationResponseReceivedListener(response => {
      const goalId = response.notification.request.content.data?.goalId as string | undefined;
      if (goalId && navigationRef.current) {
        navigationRef.current.navigate('GoalDetail', { goalId });
      }
    });

    // Keep static Colors object in sync for StyleSheet.create references
    const unsub = useThemeStore.subscribe((state) => {
      const effectiveMode = state.colorMode === 'system' ? (systemScheme ?? 'dark') : state.colorMode;
      const palette = effectiveMode === 'light' ? LIGHT_THEMES[state.activeTheme] : THEMES[state.activeTheme];
      Object.assign(Colors, palette);
    });
    return () => {
      unsub();
      appStateSub.remove();
      notifSub.remove();
    };
  }, [systemScheme]);

  if (!fontsLoaded) return null;

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style={isLight ? 'dark' : 'light'} />
          <OnboardingScreen onDone={() => setShowOnboarding(false)} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: appColors.bg0 }}>
          <AmbientBackground />
          <NavigationContainer ref={navigationRef} theme={NAV_THEME}>
            <ThemeProvider>
              <StatusBar style={isLight ? 'dark' : 'light'} />
              <AppNavigator />
            </ThemeProvider>
          </NavigationContainer>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.bg0, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: 16 },
  errorText: { color: Colors.danger, fontSize: 14, textAlign: 'center', padding: 20 },
});
