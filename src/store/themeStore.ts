import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeName } from '../constants/themes';

const KEY = 'appTheme_v1';

interface ThemeStore {
  activeTheme: ThemeName;
  colorMode: 'dark' | 'light' | 'system';
  setTheme: (name: ThemeName) => Promise<void>;
  setColorMode: (mode: 'dark' | 'light' | 'system') => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  activeTheme: 'violet',
  colorMode: 'dark',
  loadTheme: async () => {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          set({
            activeTheme: (parsed.activeTheme as ThemeName) ?? 'violet',
            colorMode: (parsed.colorMode as 'dark' | 'light' | 'system') ?? 'dark',
          });
        } else {
          // Legacy: saved was just the theme name string
          set({ activeTheme: saved as ThemeName });
        }
      } catch {
        // Legacy string value
        set({ activeTheme: saved as ThemeName });
      }
    }
  },
  setTheme: async (name) => {
    set((s) => {
      AsyncStorage.setItem(KEY, JSON.stringify({ activeTheme: name, colorMode: s.colorMode }));
      return { activeTheme: name };
    });
  },
  setColorMode: async (mode) => {
    set((s) => {
      AsyncStorage.setItem(KEY, JSON.stringify({ activeTheme: s.activeTheme, colorMode: mode }));
      return { colorMode: mode };
    });
  },
}));
