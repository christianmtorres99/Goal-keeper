import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
  topOffset?: number;
}

export default function UndoToast({ visible, message, onUndo, onDismiss, durationMs = 8000, topOffset = 80 }: Props) {
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
    <Animated.View style={[styles.toast, { opacity, top: topOffset }]}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity onPress={() => { onUndo(); onDismiss(); }} style={styles.undoBtn}>
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
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 8,
    shadowColor: Colors.bg0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  message: { color: Colors.textPrimary, fontSize: FontSize.sm, flex: 1 },
  undoBtn: { backgroundColor: Colors.accent, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginLeft: Spacing.md },
  undoText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
});
