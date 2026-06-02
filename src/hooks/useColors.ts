import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { THEMES, LIGHT_THEMES, type ThemeName } from '../constants/themes';

export function useColors() {
  const { activeTheme, colorMode } = useThemeStore();
  const systemScheme = useColorScheme();
  const effectiveMode = colorMode === 'system' ? (systemScheme ?? 'dark') : colorMode;
  const isLight = effectiveMode === 'light';
  const theme = activeTheme as ThemeName;
  return {
    colors: isLight ? LIGHT_THEMES[theme] : THEMES[theme],
    isLight,
  };
}
