import type { ColorPalette } from '../constants/themes';

export function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export function makeChartConfig(color: string, bgColor: string, Colors?: ColorPalette) {
  return {
    backgroundGradientFrom: bgColor,
    backgroundGradientTo: bgColor,
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => hexToRgba(color, opacity),
    labelColor: () => Colors?.textSecondary ?? '#9090A8',
    strokeWidth: 2,
    barPercentage: 0.6,
    propsForBackgroundLines: { strokeDasharray: '', stroke: Colors?.bg3 ?? '#252535' },
    decimalPlaces: 0,
  };
}
