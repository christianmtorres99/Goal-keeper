import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing, OVERLAY_MID } from '../../constants/theme';
import { getStreakMultiplier, calculateXPForLog } from '../../logic/xpEngine';
import { getMotivationalQuote } from '../../utils/motivationUtils';

interface Props {
  visible: boolean;
  goalName: string;
  goalColor: string;
  currentStreak: number;
  onConfirm: (note?: string) => void;
  onCancel: () => void;
  pastDate?: string;
}

export default function LogNoteModal({ visible, goalName, goalColor, currentStreak, onConfirm, onCancel, pastDate }: Props) {
  const [note, setNote] = useState('');
  const nextStreak = currentStreak + 1;
  const xpPreview = calculateXPForLog(pastDate ? 1 : nextStreak);
  const multiplier = getStreakMultiplier(pastDate ? 1 : nextStreak);
  const quote = getMotivationalQuote(pastDate ? 0 : currentStreak);

  const handleConfirm = () => {
    onConfirm(note.trim() || undefined);
    setNote('');
  };

  const handleCancel = () => {
    setNote('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleCancel} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={[styles.colorDot, { backgroundColor: goalColor }]} />
            <Text style={styles.goalName}>{goalName}</Text>
          </View>

          {pastDate ? (
            <View style={styles.preview}>
              <View style={styles.previewItem}>
                <Ionicons name="calendar-outline" size={16} color={Colors.accentBright} />
                <Text style={styles.previewValue}>Past day — {pastDate}</Text>
              </View>
              <View style={styles.previewItem}>
                <Ionicons name="flash" size={16} color={Colors.accentBright} />
                <Text style={styles.previewValue}>+15 XP</Text>
              </View>
            </View>
          ) : (
            <View style={styles.preview}>
              <View style={styles.previewItem}>
                <Ionicons name="flame" size={16} color={Colors.warning} />
                <Text style={styles.previewValue}>
                  {nextStreak === 1 ? 'Day 1 streak!' : `${nextStreak}d streak`}
                </Text>
              </View>
              <View style={styles.previewItem}>
                <Ionicons name="flash" size={16} color={Colors.accentBright} />
                <Text style={styles.previewValue}>+{xpPreview} XP{multiplier > 1 ? ` (${multiplier}×)` : ''}</Text>
              </View>
            </View>
          )}

          <Text style={styles.label}>Add a note (optional)</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="How did it go today?"
            placeholderTextColor={Colors.textDisabled}
            maxLength={200}
            multiline
            autoFocus
          />

          <Text style={styles.quote}>"{quote}"</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: goalColor }]} onPress={handleConfirm}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.confirmText}>Log It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: OVERLAY_MID },
  sheet: { backgroundColor: Colors.bg1, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderTopWidth: 1, borderColor: Colors.border },
  handle: { width: 40, height: 4, backgroundColor: Colors.bg3, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  goalName: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  preview: { flexDirection: 'row', gap: Spacing.lg, backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Spacing.md },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  previewValue: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  input: { backgroundColor: Colors.bg2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md, minHeight: 80, textAlignVertical: 'top' },
  quote: { color: Colors.textDisabled, fontSize: FontSize.xs, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: Spacing.md },
  actions: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.bg2, borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  confirmBtn: { flex: 2, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  confirmText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
