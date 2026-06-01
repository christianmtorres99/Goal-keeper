import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing, OVERLAY_MID } from '../../constants/theme';
import { useScheduledTaskStore } from '../../store/scheduledTaskStore';

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DOW_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ScheduledTaskModal({ visible, onClose }: Props) {
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavWrapper}
      >
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <View style={styles.handle} />
            <Text style={styles.title}>Scheduled Tasks</Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={true}>
              {scheduledTasks.length === 0 && (
                <Text style={styles.empty}>No scheduled tasks yet.</Text>
              )}
              {scheduledTasks.map(task => (
                <View key={task.id} style={styles.taskRow}>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskDays}>{task.daysOfWeek.map(d => DOW_FULL[d]).join(', ')}</Text>
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
            <View style={styles.divider} />
            <Text style={styles.newLabel}>New Scheduled Task</Text>
            <TextInput
              style={styles.input}
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
                    selectedDays.includes(d) && { backgroundColor: Colors.accent, borderColor: Colors.accent },
                  ]}
                  onPress={() => toggleDay(d)}
                >
                  <Text style={[styles.dowText, selectedDays.includes(d) && { color: '#fff' }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.addBtn,
                { backgroundColor: Colors.accent, opacity: (!title.trim() || selectedDays.length === 0) ? 0.4 : 1 },
              ]}
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
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: OVERLAY_MID },
  kavWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: {
    backgroundColor: Colors.bg1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    maxHeight: '85%',
    gap: Spacing.md,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.bg3,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  title: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  list: { maxHeight: 280 },
  empty: {
    color: Colors.textDisabled,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  taskInfo: { flex: 1 },
  taskTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  taskDays: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  scrollHint: { textAlign: 'center', fontSize: 11, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border },
  newLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  input: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    padding: Spacing.md,
  },
  dowRow: { flexDirection: 'row', gap: Spacing.xs },
  dowPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
  },
  dowText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' },
  addBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
