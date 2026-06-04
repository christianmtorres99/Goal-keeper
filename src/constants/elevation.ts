import { Platform } from 'react-native';

export const Elevation = {
  low: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
    android: { elevation: 2 },
    default: {},
  })!,
  mid: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8 },
    android: { elevation: 5 },
    default: {},
  })!,
  high: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16 },
    android: { elevation: 10 },
    default: {},
  })!,
};
