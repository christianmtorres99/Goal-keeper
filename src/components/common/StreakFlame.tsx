import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hexAlpha } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';

interface Props {
  streak: number;
  size?: number;
  children?: React.ReactNode;
}

export default function StreakFlame({ streak, size = 40, children }: Props) {
  const { colors: Colors } = useColors();
  const isHot  = streak >= 7;
  const isLong = streak >= 30;
  const color  = streak === 0
    ? Colors.textDisabled
    : isLong
    ? Colors.warning
    : isHot
    ? '#E8734A'
    : Colors.warning;
  const iconSz = Math.round(size * 0.52);

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size }]}>
      {streak > 0 && (
        <View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: hexAlpha(color, isLong ? 0.22 : isHot ? 0.16 : 0.10) }]} />
      )}
      {children ?? <Ionicons name="flame" size={iconSz} color={color} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
