import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { FontSize, Radius, Spacing } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';

interface Props {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
  topOffset?: number;
}

export default function UndoToast({ visible, message, onUndo, onDismiss, durationMs = 8000, topOffset = 80 }: Props) {
  const { colors: Colors, isLight } = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timerRef.current = setTimeout(() => onDismiss(), durationMs);
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[
      styles.toast,
      {
        opacity,
        top: topOffset,
        backgroundColor: Colors.bg2,
        borderColor: Colors.border,
        shadowColor: isLight ? Colors.textDisabled : Colors.bg0,
      },
    ]}>
      <Text style={[styles.message, { color: Colors.textPrimary }]}>{message}</Text>
      <TouchableOpacity onPress={() => { onUndo(); onDismiss(); }} style={[styles.undoBtn, { backgroundColor: Colors.accent }]}>
        <Text style={styles.undoText}>Undo</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  message: { fontSize: FontSize.sm, flex: 1 },
  undoBtn: { borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginLeft: Spacing.md },
  undoText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
});
