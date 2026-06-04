import React from 'react';
import { View } from 'react-native';

interface Props {
  streak: number;
  size?: number;
  children: React.ReactNode;
}

export default function StreakFlame({ size = 44, children }: Props) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}
