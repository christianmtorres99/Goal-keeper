export type ThemeName = 'violet' | 'ocean' | 'forest' | 'crimson' | 'golden' | 'sakura';

export interface ColorPalette {
  bg0: string;
  bg1: string;
  bg2: string;
  bg3: string;
  border: string;
  accent: string;
  accentBright: string;
  accentDim: string;
  accentGlow: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  goalColors: string[];
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  xpGradient: readonly [string, string];
}

export const THEMES: Record<ThemeName, ColorPalette> = {
  violet: {
    bg0: '#080B12',
    bg1: '#0F1320',
    bg2: '#161B2E',
    bg3: '#1F2540',
    border: '#2D3555',
    accent: '#7C3AED',
    accentBright: '#A855F7',
    accentDim: '#3B0764',
    accentGlow: 'rgba(124, 58, 237, 0.25)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#38BDF8',
    goalColors: [
      '#7C3AED', '#3B82F6', '#10B981', '#F59E0B',
      '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899',
    ],
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textDisabled: '#475569',
    xpGradient: ['#7C3AED', '#A855F7'],
  },
  ocean: {
    bg0: '#07101A',
    bg1: '#0F1A29',
    bg2: '#172030',
    bg3: '#1E2A38',
    border: '#1E3A55',
    accent: '#3B82F6',
    accentBright: '#60A5FA',
    accentDim: '#1E3A5F',
    accentGlow: 'rgba(59, 130, 246, 0.25)',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#38BDF8',
    goalColors: [
      '#3B82F6', '#60A5FA', '#22C55E', '#F59E0B',
      '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899',
    ],
    textPrimary: '#F0F6FF',
    textSecondary: '#8BA5C4',
    textDisabled: '#3A5070',
    xpGradient: ['#3B82F6', '#60A5FA'],
  },
  forest: {
    bg0: '#060F08',
    bg1: '#0D1A0F',
    bg2: '#152216',
    bg3: '#1C2E1E',
    border: '#1E3D22',
    accent: '#22C55E',
    accentBright: '#4ADE80',
    accentDim: '#0F3018',
    accentGlow: 'rgba(34, 197, 94, 0.25)',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#38BDF8',
    goalColors: [
      '#22C55E', '#4ADE80', '#3B82F6', '#F59E0B',
      '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899',
    ],
    textPrimary: '#F0FFF4',
    textSecondary: '#7DAA84',
    textDisabled: '#2E4A32',
    xpGradient: ['#22C55E', '#4ADE80'],
  },
  crimson: {
    bg0: '#130808',
    bg1: '#1C1010',
    bg2: '#261818',
    bg3: '#301E1E',
    border: '#4A1A1A',
    accent: '#EF4444',
    accentBright: '#F87171',
    accentDim: '#3A1010',
    accentGlow: 'rgba(239, 68, 68, 0.25)',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#38BDF8',
    goalColors: [
      '#EF4444', '#F87171', '#3B82F6', '#F59E0B',
      '#22C55E', '#8B5CF6', '#06B6D4', '#EC4899',
    ],
    textPrimary: '#FFF0F0',
    textSecondary: '#B47070',
    textDisabled: '#4A2A2A',
    xpGradient: ['#EF4444', '#F87171'],
  },
  golden: {
    bg0: '#120E04',
    bg1: '#1C1808',
    bg2: '#261F0C',
    bg3: '#302810',
    border: '#4A380A',
    accent: '#F59E0B',
    accentBright: '#FCD34D',
    accentDim: '#3A2806',
    accentGlow: 'rgba(245, 158, 11, 0.25)',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#38BDF8',
    goalColors: [
      '#F59E0B', '#FCD34D', '#3B82F6', '#EF4444',
      '#22C55E', '#8B5CF6', '#06B6D4', '#EC4899',
    ],
    textPrimary: '#FFFBF0',
    textSecondary: '#B4A070',
    textDisabled: '#4A3A18',
    xpGradient: ['#F59E0B', '#FCD34D'],
  },
  sakura: {
    bg0: '#13080F',
    bg1: '#1C1018',
    bg2: '#261820',
    bg3: '#301E28',
    border: '#4A1A38',
    accent: '#EC4899',
    accentBright: '#F472B6',
    accentDim: '#3A0830',
    accentGlow: 'rgba(236, 72, 153, 0.25)',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#38BDF8',
    goalColors: [
      '#EC4899', '#F472B6', '#3B82F6', '#F59E0B',
      '#22C55E', '#8B5CF6', '#06B6D4', '#EF4444',
    ],
    textPrimary: '#FFF0F8',
    textSecondary: '#B470A0',
    textDisabled: '#4A2040',
    xpGradient: ['#EC4899', '#F472B6'],
  },
};

export const THEME_META: Record<ThemeName, { label: string; preview: string }> = {
  violet:  { label: 'Violet Night', preview: '#9B7FD4' },
  ocean:   { label: 'Ocean Blue',   preview: '#3B82F6' },
  forest:  { label: 'Forest',       preview: '#22C55E' },
  crimson: { label: 'Crimson',      preview: '#EF4444' },
  golden:  { label: 'Golden Hour',  preview: '#F59E0B' },
  sakura:  { label: 'Sakura',       preview: '#EC4899' },
};
