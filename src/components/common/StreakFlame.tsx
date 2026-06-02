import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';

interface Props {
  streak: number;
  size?: number;
  children: React.ReactNode;
}

export default function StreakFlame({ streak, size = 44, children }: Props) {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  const intensity = streak >= 30 ? 3 : streak >= 7 ? 2 : streak >= 1 ? 1 : 0;

  useEffect(() => {
    if (intensity === 0) return;
    const speed = streak >= 30 ? 900 : streak >= 7 ? 1200 : 1600;

    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, { toValue: 1, duration: speed, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 0, duration: speed, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.delay(speed / 2),
        Animated.timing(pulse2, { toValue: 1, duration: speed, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 0, duration: speed, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim1.start();
    anim2.start();
    return () => { anim1.stop(); anim2.stop(); };
  }, [intensity]);

  if (intensity === 0) return <>{children}</>;

  const ringColor = streak >= 30 ? '#F97316' : streak >= 7 ? '#F59E0B' : '#F59E0B';
  const maxScale = 1 + (intensity * 0.12);

  const ring1Scale = pulse1.interpolate({ inputRange: [0, 1], outputRange: [1, maxScale] });
  const ring1Opacity = pulse1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0] });
  const ring2Scale = pulse2.interpolate({ inputRange: [0, 1], outputRange: [1, maxScale * 0.85] });
  const ring2Opacity = pulse2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.15, 0] });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: ringColor, transform: [{ scale: ring1Scale }], opacity: ring1Opacity }
      ]} />
      {intensity >= 2 && (
        <Animated.View style={[
          styles.ring,
          { width: size * 0.85, height: size * 0.85, borderRadius: size / 2, borderColor: ringColor, transform: [{ scale: ring2Scale }], opacity: ring2Opacity }
        ]} />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 2 },
  content: { position: 'absolute' },
});
