export const Colors = {
  // Backgrounds — subtle navy tint instead of flat grey-black
  bg0: '#080B12',
  bg1: '#0F1320',
  bg2: '#161B2E',
  bg3: '#1F2540',
  border: '#2D3555',

  // Purple accent — more saturated and vivid
  accent: '#7C3AED',
  accentBright: '#A855F7',
  accentDim: '#3B0764',
  accentGlow: 'rgba(124, 58, 237, 0.25)',

  // Semantic — kept punchy for contrast on dark navy
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',

  goalColors: [
    '#7C3AED',
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#06B6D4',
    '#EC4899',
  ],

  // Text — slate-tinted for warmth on navy backgrounds
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textDisabled: '#475569',

  xpGradient: ['#7C3AED', '#A855F7'] as const,
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

export const OVERLAY_DARK = 'rgba(0,0,0,0.85)';
export const OVERLAY_MID  = 'rgba(0,0,0,0.5)';

// Mode-aware overlay variants
export const OVERLAY_DARK_MODE  = 'rgba(0,0,0,0.75)';
export const OVERLAY_LIGHT_MODE = 'rgba(0,0,0,0.35)';
export const OVERLAY_MID_DARK   = 'rgba(0,0,0,0.5)';
export const OVERLAY_MID_LIGHT  = 'rgba(0,0,0,0.2)';
