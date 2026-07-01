import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import ReAnimated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, Radius, Spacing, OVERLAY_MID_DARK, OVERLAY_MID_LIGHT } from '../../constants/theme';
import { Spring } from '../../constants/motion';
import { useColors } from '../../hooks/useColors';

interface Props {
  visible: boolean;
  goalName: string;
  goalColor: string;
  targetCount: number;
  unit: string;
  todayTotal: number;
  onConfirm: (count: number, note?: string) => void;
  onCancel: () => void;
}

export default function LogCountModal({ visible, goalName, goalColor, targetCount, unit, todayTotal, onConfirm, onCancel }: Props) {
  const { colors: Colors, isLight } = useColors();
  const [countText, setCountText] = useState('');
  const [note, setNote] = useState('');
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useSharedValue(0);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (visible) {
      Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
      translateY.value = 500;
      translateY.value = withSpring(0, Spring.snappy);
    } else {
      backdropOpacity.setValue(0);
      translateY.value = 0;
      setCountText('');
      setNote('');
    }
  }, [visible]);

  const countValue = parseInt(countText, 10) || 0;
  const newTotal = todayTotal + countValue;
  const progressPct = Math.min(100, (newTotal / targetCount) * 100);

  const handleConfirm = () => {
    if (countValue <= 0) return;
    onConfirm(countValue, note.trim() || undefined);
    setCountText('');
    setNote('');
  };

  const handleCancel = () => {
    setCountText('');
    setNote('');
    onCancel();
  };

  const backdropColor = isLight ? OVERLAY_MID_LIGHT : OVERLAY_MID_DARK;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor, opacity: backdropOpacity }]} pointerEvents="none" />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCancel} />
        <ReAnimated.View style={[styles.sheet, sheetStyle, { backgroundColor: Colors.bg0, borderColor: Colors.border }]}>
          <View style={[styles.handle, { backgroundColor: Colors.bg3 }]} />
          <View style={styles.header}>
            <View style={[styles.colorDot, { backgroundColor: goalColor }]} />
            <Text style={[styles.goalName, { color: Colors.textPrimary }]}>{goalName}</Text>
          </View>

          <View style={styles.progressSection}>
            <Text style={[styles.progressLabel, { color: Colors.textSecondary }]}>Today: {todayTotal.toLocaleString()} / {targetCount.toLocaleString()} {unit}</Text>
            <View style={[styles.progressBar, { backgroundColor: Colors.bg3 }]}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (todayTotal / targetCount) * 100)}%` as any, backgroundColor: goalColor }]} />
            </View>
          </View>

          <Text style={[styles.label, { color: Colors.textSecondary }]}>How much did you do?</Text>
          <TextInput
            style={[styles.countInput, { backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]}
            value={countText}
            onChangeText={setCountText}
            placeholder={`Enter ${unit || 'amount'}`}
            placeholderTextColor={Colors.textDisabled}
            keyboardType="number-pad"
            autoFocus
          />

          {countValue > 0 && (
            <View style={[styles.preview, { backgroundColor: Colors.bg2 }]}>
              <Text style={[styles.previewText, { color: Colors.textPrimary }]}>
                New total: {newTotal.toLocaleString()} / {targetCount.toLocaleString()} {unit}
                {' '}({Math.round(progressPct)}%)
              </Text>
            </View>
          )}

          <TextInput
            style={[styles.noteInput, { backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)"
            placeholderTextColor={Colors.textDisabled}
            maxLength={200}
            multiline
          />

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: Colors.bg2, borderColor: Colors.border }]} onPress={handleCancel}>
              <Text style={[styles.cancelText, { color: Colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: countValue > 0 ? goalColor : Colors.bg3 }]}
              onPress={handleConfirm}
              disabled={countValue <= 0}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.confirmText}>Add {countValue > 0 ? `${countValue.toLocaleString()}` : ''}</Text>
            </TouchableOpacity>
          </View>
        </ReAnimated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderTopWidth: 1 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  goalName: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  progressSection: { gap: Spacing.xs },
  progressLabel: { fontSize: FontSize.sm },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  countInput: { borderRadius: Radius.md, borderWidth: 1, fontSize: FontSize.xxxl, fontFamily: FontFamily.bold, padding: Spacing.md, textAlign: 'center' },
  preview: { borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  previewText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  noteInput: { borderRadius: Radius.md, borderWidth: 1, fontSize: FontSize.md, padding: Spacing.md, minHeight: 60, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1 },
  cancelText: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  confirmBtn: { flex: 2, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  confirmText: { color: '#fff', fontSize: FontSize.md, fontFamily: FontFamily.bold },
});
