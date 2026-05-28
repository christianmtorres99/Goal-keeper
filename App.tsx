import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
import { THEMES } from './src/constants/themes';
import { useThemeStore } from './src/store/themeStore';
import { ThemeProvider } from './src/context/ThemeContext';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [themeKey, setThemeKey] = useState(0);

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

        // Apply the loaded theme to Colors immediately
        const activeTheme = useThemeStore.getState().activeTheme;
        Object.assign(Colors, THEMES[activeTheme]);

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
      const palette = THEMES[state.activeTheme];
      Object.assign(Colors, palette);
      setThemeKey(k => k + 1);
    });
    return unsub;
  }, []);

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
    <ThemeProvider key={themeKey}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg1 }}>
        <StatusBar style="light" />
        <AppNavigator />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.bg0, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: 16 },
  errorText: { color: Colors.danger, fontSize: 14, textAlign: 'center', padding: 20 },
});
