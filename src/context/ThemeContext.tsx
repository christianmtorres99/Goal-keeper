import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { THEMES, LIGHT_THEMES } from '../constants/themes';
import type { ColorPalette } from '../constants/themes';

const ThemeContext = createContext<ColorPalette>(THEMES.violet);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const activeTheme = useThemeStore(s => s.activeTheme);
  const colorMode = useThemeStore(s => s.colorMode);
  const systemScheme = useColorScheme();
  const effectiveMode = colorMode === 'system' ? (systemScheme ?? 'dark') : colorMode;
  const colors = effectiveMode === 'light' ? LIGHT_THEMES[activeTheme] : THEMES[activeTheme];
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useThemeColors(): ColorPalette {
  return useContext(ThemeContext);
}
