import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '../../hooks/useColors';

export default function AmbientBackground() {
  const { colors: Colors } = useColors();

  const x1 = useSharedValue(0);
  const y1 = useSharedValue(0);
  const x2 = useSharedValue(0);
  const y2 = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    x1.value = withRepeat(withTiming(28, { duration: 4800, easing: ease }), -1, true);
    y1.value = withRepeat(withTiming(22, { duration: 5600, easing: ease }), -1, true);
    x2.value = withRepeat(withTiming(-24, { duration: 5200, easing: ease }), -1, true);
    y2.value = withRepeat(withTiming(-18, { duration: 6400, easing: ease }), -1, true);
  }, []);

  const style1 = useAnimatedStyle(() => ({
    transform: [{ translateX: x1.value }, { translateY: y1.value }],
  }));
  const style2 = useAnimatedStyle(() => ({
    transform: [{ translateX: x2.value }, { translateY: y2.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[styles.blob, style1, { backgroundColor: Colors.accentGlow }]}
      />
      <Animated.View
        style={[styles.blob, styles.blob2, style2, { backgroundColor: Colors.accentGlow }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.55,
    top: -60,
    left: -40,
  },
  blob2: {
    top: undefined,
    left: undefined,
    bottom: 80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.45,
  },
});
