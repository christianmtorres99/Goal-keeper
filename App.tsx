import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';

import { runMigrations } from './src/db/client';
import { useGoalStore } from './src/store/goalStore';
import { useLogStore } from './src/store/logStore';
import { useBadgeStore } from './src/store/badgeStore';
import { useGameStore } from './src/store/gameStore';
import { useTodoXPStore } from './src/store/todoXPStore';
import { useJournalStore } from './src/store/journalStore';
import { setupNotificationHandler } from './src/utils/notifications';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen, { ONBOARDING_KEY } from './src/screens/OnboardingScreen';
import { Colors } from './src/constants/theme';
import { THEMES, LIGHT_THEMES } from './src/constants/themes';
import { useThemeStore } from './src/store/themeStore';
import { useScheduledTaskStore } from './src/store/scheduledTaskStore';
import { ThemeProvider } from './src/context/ThemeContext';

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#A855F7',
    background: '#080B12',
    card: '#080B12',
    text: '#F1F5F9',
    border: '#2D3555',
    notification: '#A855F7',
  },
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [themeKey, setThemeKey] = useState(0);

  const systemScheme = useColorScheme(); // 'dark' | 'light' | null

  useEffect(() => {
    async function bootstrap() {
      try {
        setupNotificationHandler();
        await runMigrations();
        await useGoalStore.getState().loadGoals();
        await useLogStore.getState().loadLogs();
        await useBadgeStore.getState().loadBadges();
        await useGameStore.getState().load();
        await useTodoXPStore.getState().load();
        await useJournalStore.getState().loadEntries();
        await useThemeStore.getState().loadTheme();
        await useScheduledTaskStore.getState().loadScheduledTasks();
        await useScheduledTaskStore.getState().generateTodaysTasks();

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

    // Subscribe to theme changes and force full remount so StyleSheet caches reset
    const unsub = useThemeStore.subscribe((state) => {
      const effectiveMode = state.colorMode === 'system' ? (systemScheme ?? 'dark') : state.colorMode;
      const palette = effectiveMode === 'light' ? LIGHT_THEMES[state.activeTheme] : THEMES[state.activeTheme];
      Object.assign(Colors, palette);
      setThemeKey(k => k + 1);
    });
    return unsub;
  }, [systemScheme]);

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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      </GestureHandlerRootView>
    );
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      <ThemeProvider key={themeKey}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg1 }}>
          <StatusBar style="light" />
          <AppNavigator />
        </GestureHandlerRootView>
      </ThemeProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.bg0, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: 16 },
  errorText: { color: Colors.danger, fontSize: 14, textAlign: 'center', padding: 20 },
});
