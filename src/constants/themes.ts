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
    bg0: '#060C18',
    bg1: '#091524',
    bg2: '#0C1C32',
    bg3: '#14243E',
    border: '#1C3850',
    accent: '#2E7CD6',
    accentBright: '#5A9EE8',
    accentDim: '#0D2548',
    accentGlow: 'rgba(46, 124, 214, 0.22)',
    success: '#22A37A',
    warning: '#D98A1A',
    danger: '#DC4545',
    info: '#3A9FD8',
    goalColors: [
      '#2E7CD6', '#5A9EE8', '#22A37A', '#D98A1A',
      '#DC4545', '#8B68DA', '#1AAFC0', '#C94A8E',
    ],
    textPrimary: '#EDF4FF',
    textSecondary: '#8098B8',
    textDisabled: '#364E68',
    xpGradient: ['#2E7CD6', '#5A9EE8'],
  },
  forest: {
    bg0: '#060E08',
    bg1: '#09180C',
    bg2: '#0C200F',
    bg3: '#112614',
    border: '#1C3C20',
    accent: '#1EAE5A',
    accentBright: '#3EC870',
    accentDim: '#0A2E18',
    accentGlow: 'rgba(30, 174, 90, 0.22)',
    success: '#22A37A',
    warning: '#D98A1A',
    danger: '#DC4545',
    info: '#3A9FD8',
    goalColors: [
      '#1EAE5A', '#3EC870', '#2E7CD6', '#D98A1A',
      '#DC4545', '#8B68DA', '#1AAFC0', '#C94A8E',
    ],
    textPrimary: '#EDFBF2',
    textSecondary: '#72A880',
    textDisabled: '#2C4A32',
    xpGradient: ['#1EAE5A', '#3EC870'],
  },
  crimson: {
    bg0: '#110304',
    bg1: '#1A0506',
    bg2: '#220809',
    bg3: '#2A0C0E',
    border: '#481818',
    accent: '#E03A3A',
    accentBright: '#F06060',
    accentDim: '#3A0E0E',
    accentGlow: 'rgba(224, 58, 58, 0.22)',
    success: '#22A37A',
    warning: '#D98A1A',
    danger: '#E03A3A',
    info: '#3A9FD8',
    goalColors: [
      '#E03A3A', '#F06060', '#2E7CD6', '#D98A1A',
      '#22A37A', '#8B68DA', '#1AAFC0', '#C94A8E',
    ],
    textPrimary: '#FAEEF0',
    textSecondary: '#AA6868',
    textDisabled: '#482828',
    xpGradient: ['#E03A3A', '#F06060'],
  },
  golden: {
    bg0: '#100E02',
    bg1: '#181402',
    bg2: '#201A04',
    bg3: '#282006',
    border: '#483608',
    accent: '#E58E10',
    accentBright: '#F5B240',
    accentDim: '#3A2808',
    accentGlow: 'rgba(229, 142, 16, 0.22)',
    success: '#22A37A',
    warning: '#E58E10',
    danger: '#DC4545',
    info: '#3A9FD8',
    goalColors: [
      '#E58E10', '#F5B240', '#2E7CD6', '#DC4545',
      '#22A37A', '#8B68DA', '#1AAFC0', '#C94A8E',
    ],
    textPrimary: '#FBF6E8',
    textSecondary: '#AC9860',
    textDisabled: '#483A16',
    xpGradient: ['#E58E10', '#F5B240'],
  },
  sakura: {
    bg0: '#11050C',
    bg1: '#1A0813',
    bg2: '#220C1A',
    bg3: '#2A1022',
    border: '#481838',
    accent: '#E0408A',
    accentBright: '#F06AAE',
    accentDim: '#380826',
    accentGlow: 'rgba(224, 64, 138, 0.22)',
    success: '#22A37A',
    warning: '#D98A1A',
    danger: '#DC4545',
    info: '#3A9FD8',
    goalColors: [
      '#E0408A', '#F06AAE', '#2E7CD6', '#D98A1A',
      '#22A37A', '#8B68DA', '#1AAFC0', '#DC4545',
    ],
    textPrimary: '#FAEEf6',
    textSecondary: '#AA6898',
    textDisabled: '#482038',
    xpGradient: ['#E0408A', '#F06AAE'],
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
    bg0: '#FFFFFF', bg1: '#EEF4FE', bg2: '#D8E8FC', bg3: '#BCCFEE', border: '#90B4DC',
    accent: '#1E5EAA', accentBright: '#2E7CD6', accentDim: '#1C3F6E',
    accentGlow: 'rgba(30, 94, 170, 0.15)',
    textPrimary: '#0C1A38', textSecondary: '#385070', textDisabled: '#7890B0',
    success: '#1A8F6A', warning: '#B8750F', danger: '#C23838', info: '#1E6898',
    goalColors: ['#1E5EAA', '#2E7CD6', '#1A8F6A', '#B8750F', '#C23838', '#6E54C0', '#128898', '#A83878'],
    xpGradient: ['#1E5EAA', '#2E7CD6'],
  },
  forest: {
    bg0: '#FFFFFF', bg1: '#EDFBF2', bg2: '#D4F5E2', bg3: '#B0E8C8', border: '#80CC9E',
    accent: '#15804A', accentBright: '#1EAE5A', accentDim: '#0F5232',
    accentGlow: 'rgba(21, 128, 74, 0.15)',
    textPrimary: '#061E0E', textSecondary: '#1A5830', textDisabled: '#60A078',
    success: '#1A8F6A', warning: '#B8750F', danger: '#C23838', info: '#1E6898',
    goalColors: ['#15804A', '#1EAE5A', '#1E5EAA', '#B8750F', '#C23838', '#6E54C0', '#128898', '#A83878'],
    xpGradient: ['#15804A', '#1EAE5A'],
  },
  crimson: {
    bg0: '#FFFFFF', bg1: '#FFF0F0', bg2: '#FFE0E0', bg3: '#FFBCBC', border: '#F89898',
    accent: '#B82828', accentBright: '#E03A3A', accentDim: '#7A1A1A',
    accentGlow: 'rgba(184, 40, 40, 0.15)',
    textPrimary: '#1A0404', textSecondary: '#5E1818', textDisabled: '#D07070',
    success: '#1A8F6A', warning: '#B8750F', danger: '#901818', info: '#1E6898',
    goalColors: ['#B82828', '#E03A3A', '#1E5EAA', '#B8750F', '#1A8F6A', '#6E54C0', '#128898', '#A83878'],
    xpGradient: ['#B82828', '#E03A3A'],
  },
  golden: {
    bg0: '#FFFFFF', bg1: '#FDF8EE', bg2: '#FAEDCC', bg3: '#F5DC98', border: '#E8C060',
    accent: '#B86E08', accentBright: '#E58E10', accentDim: '#7A4A08',
    accentGlow: 'rgba(184, 110, 8, 0.15)',
    textPrimary: '#1A1002', textSecondary: '#6A400A', textDisabled: '#C09840',
    success: '#1A8F6A', warning: '#9A5E08', danger: '#C23838', info: '#1E6898',
    goalColors: ['#B86E08', '#E58E10', '#1E5EAA', '#C23838', '#1A8F6A', '#6E54C0', '#128898', '#A83878'],
    xpGradient: ['#B86E08', '#E58E10'],
  },
  sakura: {
    bg0: '#FFFFFF', bg1: '#FFF0F8', bg2: '#FFE0F0', bg3: '#FFBEDD', border: '#F890C0',
    accent: '#A82868', accentBright: '#E0408A', accentDim: '#701848',
    accentGlow: 'rgba(168, 40, 104, 0.15)',
    textPrimary: '#1A0410', textSecondary: '#601840', textDisabled: '#D070A0',
    success: '#1A8F6A', warning: '#B8750F', danger: '#C23838', info: '#1E6898',
    goalColors: ['#A82868', '#E0408A', '#1E5EAA', '#B8750F', '#1A8F6A', '#6E54C0', '#128898', '#C23838'],
    xpGradient: ['#A82868', '#E0408A'],
  },
};

export const THEME_META: Record<ThemeName, { label: string; preview: string }> = {
  violet:  { label: 'Midnight Indigo', preview: '#7B78F2' },
  ocean:   { label: 'Ocean Blue',     preview: '#2E7CD6' },
  forest:  { label: 'Forest',         preview: '#1EAE5A' },
  crimson: { label: 'Crimson',        preview: '#E03A3A' },
  golden:  { label: 'Golden Hour',    preview: '#E58E10' },
  sakura:  { label: 'Sakura',         preview: '#E0408A' },
};
