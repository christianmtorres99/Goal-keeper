export function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export function makeChartConfig(color: string, bgColor: string) {
  return {
    backgroundGradientFrom: bgColor,
    backgroundGradientTo: bgColor,
    color: (opacity = 1) => hexToRgba(color, opacity),
    labelColor: () => '#9090A8',
    strokeWidth: 2,
    barPercentage: 0.6,
    propsForBackgroundLines: { strokeDasharray: '', stroke: '#252535' },
    decimalPlaces: 0,
  };
}
