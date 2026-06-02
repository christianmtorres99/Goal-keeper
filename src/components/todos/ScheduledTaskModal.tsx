import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Radius, Spacing, OVERLAY_MID_DARK, OVERLAY_MID_LIGHT } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';
import { useScheduledTaskStore } from '../../store/scheduledTaskStore';

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DOW_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ScheduledTaskModal({ visible, onClose }: Props) {
  const { colors: Colors, isLight } = useColors();
  const { scheduledTasks, addScheduledTask, deleteScheduledTask } = useScheduledTaskStore();
  const [title, setTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => { translateY.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 800) {
        runOnJS(onClose)();
        translateY.value = 0;
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (!visible) translateY.value = 0;
  }, [visible]);

  const toggleDay = (d: number) => {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleAdd = async () => {
    if (!title.trim() || selectedDays.length === 0) return;
    await addScheduledTask({
      title: title.trim(),
      daysOfWeek: [...selectedDays].sort((a, b) => a - b),
      icon: 'calendar',
      color: Colors.accent,
    });
    setTitle('');
    setSelectedDays([]);
  };

  const backdropColor = isLight ? OVERLAY_MID_LIGHT : OVERLAY_MID_DARK;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={[styles.backdrop, { backgroundColor: backdropColor }]} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kavWrapper}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, sheetStyle, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <View style={[styles.handle, { backgroundColor: Colors.bg3 }]} />
            <Text style={[styles.title, { color: Colors.textPrimary }]}>Scheduled Tasks</Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={true}>
              {scheduledTasks.length === 0 && (
                <Text style={[styles.empty, { color: Colors.textDisabled }]}>No scheduled tasks yet.</Text>
              )}
              {scheduledTasks.map(task => (
                <View key={task.id} style={styles.taskRow}>
                  <View style={styles.taskInfo}>
                    <Text style={[styles.taskTitle, { color: Colors.textPrimary }]}>{task.title}</Text>
                    <Text style={[styles.taskDays, { color: Colors.textSecondary }]}>{task.daysOfWeek.map(d => DOW_FULL[d]).join(', ')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteScheduledTask(task.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            {scheduledTasks.length > 3 && (
              <Text style={[styles.scrollHint, { color: Colors.textDisabled }]}>↕ Scroll to see all</Text>
            )}
            <View style={[styles.divider, { backgroundColor: Colors.border }]} />
            <Text style={[styles.newLabel, { color: Colors.textSecondary }]}>New Scheduled Task</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Clean the kitchen"
              placeholderTextColor={Colors.textDisabled}
              maxLength={80}
            />
            <View style={styles.dowRow}>
              {DOW_LABELS.map((label, d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.dowPill,
                    { borderColor: Colors.border, backgroundColor: Colors.bg2 },
                    selectedDays.includes(d) && { backgroundColor: Colors.accent, borderColor: Colors.accent },
                  ]}
                  onPress={() => toggleDay(d)}
                >
                  <Text style={[styles.dowText, { color: Colors.textSecondary }, selectedDays.includes(d) && { color: '#fff' }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: Colors.accent, opacity: (!title.trim() || selectedDays.length === 0) ? 0.4 : 1 }]}
              onPress={handleAdd}
              disabled={!title.trim() || selectedDays.length === 0}
            >
              <Text style={styles.addBtnText}>Add Schedule</Text>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill },
  kavWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '85%', gap: Spacing.md, borderTopWidth: 1 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  title: { fontSize: FontSize.lg, fontWeight: '700' },
  list: { maxHeight: 280 },
  empty: { fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.md },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: FontSize.md, fontWeight: '600' },
  taskDays: { fontSize: FontSize.xs, marginTop: 2 },
  scrollHint: { textAlign: 'center', fontSize: 11, marginTop: 2 },
  divider: { height: 1 },
  newLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  input: { borderRadius: Radius.md, borderWidth: 1, fontSize: FontSize.md, padding: Spacing.md },
  dowRow: { flexDirection: 'row', gap: Spacing.xs },
  dowPill: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  dowText: { fontSize: FontSize.xs, fontWeight: '700' },
  addBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
