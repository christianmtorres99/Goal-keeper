export const Colors = {
  bg0: '#08080C',
  bg1: '#101018',
  bg2: '#16161F',
  bg3: '#222230',
  border: '#2E2E3E',

  accent: '#5551E8',
  accentBright: '#7B78F2',
  accentDim: '#1A193A',
  accentGlow: 'rgba(85, 81, 232, 0.22)',

  success: '#22A37A',
  warning: '#D98A1A',
  danger: '#DC4545',
  info: '#3A9FD8',

  goalColors: [
    '#5551E8',
    '#3A7DD8',
    '#22A37A',
    '#D98A1A',
    '#DC4545',
    '#8B68DA',
    '#1AAFC0',
    '#C94A8E',
  ],

  textPrimary: '#ECEEF5',
  textSecondary: '#8A94A8',
  textDisabled: '#444C60',

  xpGradient: ['#5551E8', '#7B78F2'] as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
};

export const FontFamily = {
  regular:   'PlusJakartaSans_400Regular',
  medium:    'PlusJakartaSans_500Medium',
  semiBold:  'PlusJakartaSans_600SemiBold',
  bold:      'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
};

export function hexAlpha(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const OVERLAY_DARK = 'rgba(0,0,0,0.85)';
export const OVERLAY_MID  = 'rgba(0,0,0,0.5)';

// Mode-aware overlay variants
export const OVERLAY_DARK_MODE  = 'rgba(0,0,0,0.75)';
export const OVERLAY_LIGHT_MODE = 'rgba(0,0,0,0.35)';
export const OVERLAY_MID_DARK   = 'rgba(0,0,0,0.5)';
export const OVERLAY_MID_LIGHT  = 'rgba(0,0,0,0.2)';
