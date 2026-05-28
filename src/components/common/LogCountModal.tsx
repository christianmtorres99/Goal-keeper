import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing, OVERLAY_MID } from '../../constants/theme';

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
  const [countText, setCountText] = useState('');
  const [note, setNote] = useState('');
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(backdropOpacity, {
        toValue: 1, duration: 280, useNativeDriver: true,
      }).start();
    } else {
      backdropOpacity.setValue(0);
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_MID, opacity: backdropOpacity }]} pointerEvents="none" />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCancel} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={[styles.colorDot, { backgroundColor: goalColor }]} />
            <Text style={styles.goalName}>{goalName}</Text>
          </View>

          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Today: {todayTotal.toLocaleString()} / {targetCount.toLocaleString()} {unit}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (todayTotal / targetCount) * 100)}%` as any, backgroundColor: goalColor }]} />
            </View>
          </View>

          <Text style={styles.label}>How much did you do?</Text>
          <TextInput
            style={styles.countInput}
            value={countText}
            onChangeText={setCountText}
            placeholder={`Enter ${unit || 'amount'}`}
            placeholderTextColor={Colors.textDisabled}
            keyboardType="number-pad"
            autoFocus
          />

          {countValue > 0 && (
            <View style={styles.preview}>
              <Text style={styles.previewText}>
                New total: {newTotal.toLocaleString()} / {targetCount.toLocaleString()} {unit}
                {' '}({Math.round(progressPct)}%)
              </Text>
            </View>
          )}

          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)"
            placeholderTextColor={Colors.textDisabled}
            maxLength={200}
            multiline
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bg1, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderTopWidth: 1, borderColor: Colors.border },
  handle: { width: 40, height: 4, backgroundColor: Colors.bg3, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  goalName: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  progressSection: { gap: Spacing.xs },
  progressLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  progressBar: { height: 6, backgroundColor: Colors.bg3, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  countInput: { backgroundColor: Colors.bg2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.xxxl, fontWeight: '700', padding: Spacing.md, textAlign: 'center' },
  preview: { backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  previewText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },
  noteInput: { backgroundColor: Colors.bg2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md, minHeight: 60, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.bg2, borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  confirmBtn: { flex: 2, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  confirmText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
