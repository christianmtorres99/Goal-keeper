import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeName } from '../constants/themes';

const KEY = 'appTheme_v1';

interface ThemeStore {
  activeTheme: ThemeName;
  setTheme: (name: ThemeName) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  activeTheme: 'violet',
  loadTheme: async () => {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved) set({ activeTheme: saved as ThemeName });
  },
  setTheme: async (name) => {
    set({ activeTheme: name });
    await AsyncStorage.setItem(KEY, name);
  },
}));
