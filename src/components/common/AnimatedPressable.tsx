import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Spring } from '../../constants/motion';

interface Props extends Omit<PressableProps, 'style'> {
  scale?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedPressable({ scale = 0.96, children, style, onPress, onLongPress, hitSlop, disabled, ...rest }: Props) {
  const s = useSharedValue(1);
  const as = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  return (
    <Pressable
      onPressIn={() => { if (!disabled) s.value = withSpring(scale, Spring.stiff); }}
      onPressOut={() => { s.value = withSpring(1, Spring.snappy); }}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={hitSlop}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[style, as]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
