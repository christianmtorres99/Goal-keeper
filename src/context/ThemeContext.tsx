import React, { createContext, useContext } from 'react';
import { useThemeStore } from '../store/themeStore';
import { THEMES } from '../constants/themes';
import type { ColorPalette } from '../constants/themes';

const ThemeContext = createContext<ColorPalette>(THEMES.violet);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const activeTheme = useThemeStore(s => s.activeTheme);
  const colors = THEMES[activeTheme];
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useThemeColors(): ColorPalette {
  return useContext(ThemeContext);
}
