import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  // RN Animated values for backdrop fade + sheet entry slide (matching AddTodoModal)
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(80)).current;

  // Reanimated shared value for drag-to-dismiss gesture
  const dragTranslateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => { dragTranslateY.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 800) {
        runOnJS(onClose)();
        dragTranslateY.value = 0;
      } else {
        dragTranslateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragTranslateY.value }],
  }));

  // Animate open/close (entry animation matches AddTodoModal)
  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(80);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      dragTranslateY.value = 0;
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 80, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]).start(() => {
        backdropOpacity.setValue(0);
        sheetTranslateY.setValue(80);
      });
    }
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

  const bottomPad = Math.max(insets.bottom, Spacing.md);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Fade backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: isLight ? OVERLAY_MID_LIGHT : OVERLAY_MID_DARK, opacity: backdropOpacity }]}
        pointerEvents="none"
      />
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kavWrapper}>
        {/* Outer: RN Animated for entry slide */}
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          {/* Inner: Reanimated for drag gesture */}
          <GestureDetector gesture={panGesture}>
            <ReanimatedAnimated.View style={[styles.sheet, dragStyle, { backgroundColor: Colors.bg1, borderColor: Colors.border, paddingBottom: bottomPad }]}>
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
            </ReanimatedAnimated.View>
          </GestureDetector>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
