import { Easing } from 'react-native-reanimated';

export const Spring = {
  snappy:    { damping: 18, stiffness: 350, mass: 0.8 },
  bouncy:    { damping: 12, stiffness: 280, mass: 0.9 },
  gentle:    { damping: 22, stiffness: 250, mass: 1.0 },
  stiff:     { damping: 30, stiffness: 500, mass: 0.8 },
  cinematic: { damping: 20, stiffness: 90,  mass: 1.0 },
};

export const Timing = {
  fast:   150,
  normal: 250,
  slow:   400,
};

export const Stagger = {
  item:    50,
  section: 80,
};

// Expo-out: fast start, smooth deceleration — the hallmark of premium native feel
export const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
// Expo-in: slow start, fast exit — used for dismiss/exit animations
export const EXPO_IN  = Easing.bezier(0.36, 0, 0.66, 0);
