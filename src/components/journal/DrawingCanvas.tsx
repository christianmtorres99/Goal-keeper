import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import type { DrawingPath } from '../../types';

interface Props {
  paths: DrawingPath[];
  onPathsChange: (paths: DrawingPath[]) => void;
  penColor: string;
  penWidth: number;
  style?: any;
}

export default function DrawingCanvas({ paths, onPathsChange, penColor, penWidth, style }: Props) {
  const [currentPath, setCurrentPath] = useState('');

  const startPath = useCallback((x: number, y: number) => {
    setCurrentPath(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
  }, []);

  const extendPath = useCallback((x: number, y: number) => {
    setCurrentPath(prev => `${prev} L ${x.toFixed(1)} ${y.toFixed(1)}`);
  }, []);

  const endPath = useCallback(() => {
    setCurrentPath(prev => {
      if (prev) {
        onPathsChange([...paths, { d: prev, color: penColor, strokeWidth: penWidth }]);
      }
      return '';
    });
  }, [paths, penColor, penWidth, onPathsChange]);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => startPath(e.x, e.y))
    .onUpdate((e) => extendPath(e.x, e.y))
    .onEnd(() => endPath());

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.canvas, style]}>
        <Svg style={StyleSheet.absoluteFill}>
          {paths.map((p, i) => (
            <Path
              key={i}
              d={p.d}
              stroke={p.color}
              strokeWidth={p.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke={penColor}
              strokeWidth={penWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: 'transparent' },
});
