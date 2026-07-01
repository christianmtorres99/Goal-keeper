import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReAnimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, Radius, Spacing, OVERLAY_MID_DARK, OVERLAY_MID_LIGHT } from '../../constants/theme';
import { Spring } from '../../constants/motion';
import { useColors } from '../../hooks/useColors';
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
  const { colors: Colors, isLight } = useColors();
  const [note, setNote] = useState('');
  const nextStreak = currentStreak + 1;
  const xpPreview = calculateXPForLog(pastDate ? 1 : nextStreak);
  const multiplier = getStreakMultiplier(pastDate ? 1 : nextStreak);
  const quote = getMotivationalQuote(pastDate ? 0 : currentStreak);

  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    } else {
      backdropOpacity.setValue(0);
    }
  }, [visible]);

  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => { translateY.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 800) {
        runOnJS(handleCancel)();
        translateY.value = 0;
      } else {
        translateY.value = withSpring(0, Spring.cinematic);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (visible) {
      translateY.value = 500;
      translateY.value = withSpring(0, Spring.snappy);
    } else {
      translateY.value = 0;
    }
  }, [visible]);

  const handleConfirm = () => {
    onConfirm(note.trim() || undefined);
    setNote('');
  };

  const handleCancel = () => {
    setNote('');
    onCancel();
  };

  const backdropColor = isLight ? OVERLAY_MID_LIGHT : OVERLAY_MID_DARK;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <Animated.View
          style={[styles.backdrop, { backgroundColor: backdropColor, opacity: backdropOpacity }]}
          pointerEvents="none"
        />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCancel} />
        <GestureDetector gesture={panGesture}>
          <ReAnimated.View style={[styles.sheet, sheetStyle, { backgroundColor: Colors.bg0, borderColor: Colors.border }]}>
            <View style={[styles.handle, { backgroundColor: Colors.bg3 }]} />
            <View style={styles.header}>
              <View style={[styles.colorDot, { backgroundColor: goalColor }]} />
              <Text style={[styles.goalName, { color: Colors.textPrimary }]}>{goalName}</Text>
            </View>

            {pastDate ? (
              <View style={[styles.preview, { backgroundColor: Colors.bg2 }]}>
                <View style={styles.previewItem}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.accentBright} />
                  <Text style={[styles.previewValue, { color: Colors.textPrimary }]}>Past day — {pastDate}</Text>
                </View>
                <View style={styles.previewItem}>
                  <Ionicons name="flash" size={16} color={Colors.accentBright} />
                  <Text style={[styles.previewValue, { color: Colors.textPrimary }]}>+15 XP</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.preview, { backgroundColor: Colors.bg2 }]}>
                <View style={styles.previewItem}>
                  <Ionicons name="flame" size={16} color={Colors.warning} />
                  <Text style={[styles.previewValue, { color: Colors.textPrimary }]}>
                    {nextStreak === 1 ? 'Day 1 streak!' : `${nextStreak}d streak`}
                  </Text>
                </View>
                <View style={styles.previewItem}>
                  <Ionicons name="flash" size={16} color={Colors.accentBright} />
                  <Text style={[styles.previewValue, { color: Colors.textPrimary }]}>+{xpPreview} XP{multiplier > 1 ? ` (${multiplier}×)` : ''}</Text>
                </View>
              </View>
            )}

            <Text style={[styles.label, { color: Colors.textSecondary }]}>Add a note (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]}
              value={note}
              onChangeText={setNote}
              placeholder="How did it go today?"
              placeholderTextColor={Colors.textDisabled}
              maxLength={200}
              multiline
              autoFocus
            />

            <Text style={[styles.quote, { color: Colors.textDisabled }]}>"{quote}"</Text>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: Colors.bg2, borderColor: Colors.border }]} onPress={handleCancel}>
                <Text style={[styles.cancelText, { color: Colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: goalColor }]} onPress={handleConfirm}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.confirmText}>Log It</Text>
              </TouchableOpacity>
            </View>
          </ReAnimated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderTopWidth: 1 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  goalName: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  preview: { flexDirection: 'row', gap: Spacing.lg, borderRadius: Radius.md, padding: Spacing.md },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  previewValue: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  input: { borderRadius: Radius.md, borderWidth: 1, fontSize: FontSize.md, padding: Spacing.md, minHeight: 80, textAlignVertical: 'top' },
  quote: { fontSize: FontSize.xs, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: Spacing.md },
  actions: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1 },
  cancelText: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  confirmBtn: { flex: 2, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  confirmText: { color: '#fff', fontSize: FontSize.md, fontFamily: FontFamily.bold },
});
