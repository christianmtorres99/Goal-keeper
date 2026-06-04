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
      '#5551E8', '#3A7DD8', '#22A37A', '#D98A1A',
      '#DC4545', '#8B68DA', '#1AAFC0', '#C94A8E',
    ],
    textPrimary: '#ECEEF5',
    textSecondary: '#8A94A8',
    textDisabled: '#444C60',
    xpGradient: ['#5551E8', '#7B78F2'],
  },
  ocean: {
    bg0: '#060D1A',
    bg1: '#0A1628',
    bg2: '#0D1E35',
    bg3: '#162540',
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
    bg1: '#0A1A0D',
    bg2: '#0D2210',
    bg3: '#122814',
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
    bg0: '#120406',
    bg1: '#1C0608',
    bg2: '#240A0C',
    bg3: '#2C0E10',
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
    bg0: '#110E02',
    bg1: '#1A1504',
    bg2: '#221C06',
    bg3: '#2A2308',
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
    bg0: '#12060C',
    bg1: '#1C0A14',
    bg2: '#240D1C',
    bg3: '#2C1224',
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

// Alias for backward compatibility
export type ThemePalette = ColorPalette;

export const LIGHT_THEMES: Record<ThemeName, ColorPalette> = {
  violet: {
    bg0: '#FFFFFF', bg1: '#F4F3FF', bg2: '#ECEAFD', bg3: '#DCDAFB', border: '#C0BEFA',
    accent: '#5551E8', accentBright: '#7B78F2', accentDim: '#3E3CB8',
    accentGlow: 'rgba(85, 81, 232, 0.15)',
    textPrimary: '#18182A', textSecondary: '#48476A', textDisabled: '#9898BE',
    success: '#1A8F6A', warning: '#B8750F', danger: '#C23838', info: '#2880B8',
    goalColors: ['#5551E8', '#3A7DD8', '#1A8F6A', '#B8750F', '#C23838', '#8B68DA', '#1AAFC0', '#C94A8E'],
    xpGradient: ['#5551E8', '#7B78F2'],
  },
  ocean: {
    bg0: '#FFFFFF', bg1: '#EFF6FF', bg2: '#DBEAFE', bg3: '#BFDBFE', border: '#93C5FD',
    accent: '#2563EB', accentBright: '#3B82F6', accentDim: '#1D4ED8',
    accentGlow: 'rgba(37, 99, 235, 0.15)',
    textPrimary: '#0C1445', textSecondary: '#3B4D7A', textDisabled: '#7B8FBB',
    success: '#059669', warning: '#D97706', danger: '#DC2626', info: '#0284C7',
    goalColors: ['#2563EB', '#3B82F6', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777'],
    xpGradient: ['#2563EB', '#3B82F6'],
  },
  forest: {
    bg0: '#FFFFFF', bg1: '#F0FDF4', bg2: '#DCFCE7', bg3: '#BBF7D0', border: '#86EFAC',
    accent: '#16A34A', accentBright: '#22C55E', accentDim: '#15803D',
    accentGlow: 'rgba(22, 163, 74, 0.15)',
    textPrimary: '#052E16', textSecondary: '#166534', textDisabled: '#4ADE80',
    success: '#059669', warning: '#D97706', danger: '#DC2626', info: '#0284C7',
    goalColors: ['#16A34A', '#22C55E', '#2563EB', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777'],
    xpGradient: ['#16A34A', '#22C55E'],
  },
  crimson: {
    bg0: '#FFFFFF', bg1: '#FFF1F2', bg2: '#FFE4E6', bg3: '#FECDD3', border: '#FDA4AF',
    accent: '#DC2626', accentBright: '#EF4444', accentDim: '#B91C1C',
    accentGlow: 'rgba(220, 38, 38, 0.15)',
    textPrimary: '#1C0507', textSecondary: '#6B1A1A', textDisabled: '#F87171',
    success: '#059669', warning: '#D97706', danger: '#991B1B', info: '#0284C7',
    goalColors: ['#DC2626', '#EF4444', '#2563EB', '#D97706', '#059669', '#7C3AED', '#0891B2', '#DB2777'],
    xpGradient: ['#DC2626', '#EF4444'],
  },
  golden: {
    bg0: '#FFFFFF', bg1: '#FFFBEB', bg2: '#FEF3C7', bg3: '#FDE68A', border: '#FCD34D',
    accent: '#D97706', accentBright: '#F59E0B', accentDim: '#B45309',
    accentGlow: 'rgba(217, 119, 6, 0.15)',
    textPrimary: '#1C1203', textSecondary: '#78350F', textDisabled: '#FCD34D',
    success: '#059669', warning: '#B45309', danger: '#DC2626', info: '#0284C7',
    goalColors: ['#D97706', '#F59E0B', '#2563EB', '#DC2626', '#059669', '#7C3AED', '#0891B2', '#DB2777'],
    xpGradient: ['#D97706', '#F59E0B'],
  },
  sakura: {
    bg0: '#FFFFFF', bg1: '#FFF0F7', bg2: '#FFE4F0', bg3: '#FFC0D9', border: '#F9A8D4',
    accent: '#DB2777', accentBright: '#EC4899', accentDim: '#BE185D',
    accentGlow: 'rgba(219, 39, 119, 0.15)',
    textPrimary: '#1C0610', textSecondary: '#6B1A3C', textDisabled: '#F9A8D4',
    success: '#059669', warning: '#D97706', danger: '#DC2626', info: '#0284C7',
    goalColors: ['#DB2777', '#EC4899', '#2563EB', '#D97706', '#059669', '#7C3AED', '#0891B2', '#DC2626'],
    xpGradient: ['#DB2777', '#EC4899'],
  },
};

export const THEME_META: Record<ThemeName, { label: string; preview: string }> = {
  violet:  { label: 'Midnight Indigo', preview: '#7B78F2' },
  ocean:   { label: 'Ocean Blue',   preview: '#3B82F6' },
  forest:  { label: 'Forest',       preview: '#22C55E' },
  crimson: { label: 'Crimson',      preview: '#EF4444' },
  golden:  { label: 'Golden Hour',  preview: '#F59E0B' },
  sakura:  { label: 'Sakura',       preview: '#EC4899' },
};
