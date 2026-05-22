import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Switch, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useGoalStore } from '../store/goalStore';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../utils/categoryXP';
import { requestNotificationPermissions, scheduleGoalReminder, cancelGoalReminder } from '../utils/notifications';
import { formatTime12h } from '../utils/dateUtils';
import type { GoalCategory, GoalDifficulty } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { DIFFICULTY_MULTIPLIERS } from '../constants/xp';

type Route = RouteProp<RootStackParamList, 'AddGoal'>;

const ICONS = [
  // Music & Creative
  'musical-notes', 'musical-note', 'mic', 'headset', 'radio', 'brush', 'color-palette', 'pencil', 'camera', 'film', 'tv', 'image',
  // Fitness & Health
  'fitness', 'barbell', 'bicycle', 'walk', 'bed', 'heart', 'pulse', 'body', 'bandage', 'medical',
  // Nature & Mindfulness
  'leaf', 'flower', 'sunny', 'moon', 'water', 'snow', 'planet', 'earth', 'cloudy', 'thunderstorm',
  // Tech & Learning
  'book', 'library', 'school', 'code-slash', 'laptop', 'bulb', 'desktop', 'calculator',
  // Food & Lifestyle
  'cafe', 'restaurant', 'beer-outline', 'wine', 'nutrition', 'fast-food',
  // Social & People
  'people', 'person', 'happy', 'chatbubble',
  // Achievement & Status
  'star', 'trophy', 'flame', 'flash', 'rocket', 'diamond', 'shield', 'flag', 'medal', 'ribbon', 'crown',
  // Work & Finance
  'briefcase', 'cash', 'card', 'stats-chart', 'pie-chart', 'construct', 'hammer',
  // Travel & Transport
  'airplane', 'car', 'map', 'compass', 'navigate',
  // Games & Misc
  'game-controller', 'dice', 'glasses', 'watch', 'alarm',
];

const COLORS = [
  // Purples
  '#7B5EA7', '#8B5CF6', '#A78BFA', '#6D28D9',
  // Blues
  '#3B82F6', '#06B6D4', '#0EA5E9', '#1D4ED8',
  // Greens
  '#10B981', '#22C55E', '#84CC16', '#16A34A',
  // Warm
  '#F59E0B', '#F97316', '#EF4444', '#DC2626',
  // Pinks & Rose
  '#EC4899', '#F43F5E', '#DB2777', '#BE185D',
];

const CATEGORIES: GoalCategory[] = ['creative', 'physical', 'learning', 'wellness', 'other'];

// Parse 24h time string into 12h components
const parseTime24 = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return { hour: h % 12 || 12, minute: m, isPM: h >= 12 };
};

export default function AddGoalScreen() {
  const { width: winW } = useWindowDimensions();
  const iconBtnSize = Math.floor((winW - Spacing.md * 2 - Spacing.sm * 5) / 6);

  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { addGoal, updateGoal, getGoal } = useGoalStore();
  const editingId = route.params?.goalId;
  const existing = editingId ? getGoal(editingId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [isMilestone, setIsMilestone] = useState(existing?.type === 'milestone');
  const [targetCount, setTargetCount] = useState(existing?.targetCount?.toString() ?? '');
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [selectedIcon, setSelectedIcon] = useState(existing?.icon ?? 'flag');
  const [selectedColor, setSelectedColor] = useState(existing?.color ?? COLORS[0]);
  const [category, setCategory] = useState<GoalCategory>(existing?.category ?? 'other');
  const [difficulty, setDifficulty] = useState<GoalDifficulty>(existing?.difficulty ?? 'medium');
  const [reminderEnabled, setReminderEnabled] = useState(!!existing?.notificationTime);
  const [allowMultiple, setAllowMultiple] = useState(existing?.allowMultiplePerDay ?? false);

  // 12hr time picker state
  const initTime = parseTime24(existing?.notificationTime ?? '09:00');
  const [rHour, setRHour] = useState(initTime.hour);
  const [rMinute, setRMinute] = useState(initTime.minute);
  const [rIsPM, setRIsPM] = useState(initTime.isPM);

  // Convert 12hr state back to 24hr string
  const reminderTime24 = useMemo(() => {
    let h = rHour % 12;
    if (rIsPM) h += 12;
    return `${String(h).padStart(2, '0')}:${String(rMinute).padStart(2, '0')}`;
  }, [rHour, rMinute, rIsPM]);

  useEffect(() => {
    navigation.setOptions({ title: editingId ? 'Edit Goal' : 'New Goal' });
  }, [editingId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a goal name.');
      return;
    }
    if (isMilestone && (!targetCount || parseInt(targetCount) <= 0)) {
      Alert.alert('Required', 'Please enter a valid target count.');
      return;
    }

    let notificationId = existing?.notificationId;

    if (reminderEnabled) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        if (notificationId) await cancelGoalReminder(notificationId).catch(() => {});
        try {
          notificationId = await scheduleGoalReminder('temp', reminderTime24, name.trim());
        } catch {}
      } else {
        notificationId = undefined;
        // Don't return - still save goal without notification
      }
    } else if (notificationId) {
      await cancelGoalReminder(notificationId).catch(() => {});
      notificationId = undefined;
    }

    const data = {
      name: name.trim(),
      description: description.trim(),
      type: isMilestone ? 'milestone' as const : 'habit' as const,
      color: selectedColor,
      icon: selectedIcon,
      category,
      targetCount: isMilestone ? parseInt(targetCount) : undefined,
      unit: isMilestone ? unit.trim() || undefined : undefined,
      notificationTime: reminderEnabled && notificationId ? reminderTime24 : undefined,
      notificationId: notificationId ?? undefined,
      allowMultiplePerDay: !isMilestone ? allowMultiple : false,
      difficulty,
    };

    if (editingId) {
      await updateGoal(editingId, data);
    } else {
      const newGoal = await addGoal(data);
      // Fix: update notification with real goal id
      if (notificationId && reminderEnabled) {
        await cancelGoalReminder(notificationId).catch(() => {});
        const realId = await scheduleGoalReminder(newGoal.id, reminderTime24, name.trim());
        await updateGoal(newGoal.id, { notificationId: realId });
      }
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.label}>Goal Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. DJ every day, Read books..."
          placeholderTextColor={Colors.textDisabled}
          maxLength={50}
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="What's this goal about?"
          placeholderTextColor={Colors.textDisabled}
          multiline
          numberOfLines={3}
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.sublabel}>{isMilestone ? 'Milestone — reach a target' : 'Habit — daily check-in'}</Text>
          </View>
          <Switch value={isMilestone} onValueChange={setIsMilestone} trackColor={{ true: Colors.accent, false: Colors.bg3 }} thumbColor={Colors.textPrimary} />
        </View>

        {isMilestone && (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Target Count</Text>
              <TextInput style={[styles.input, { marginTop: 4 }]} value={targetCount} onChangeText={setTargetCount} placeholder="10" placeholderTextColor={Colors.textDisabled} keyboardType="number-pad" />
            </View>
            <View style={[styles.flex1, { marginLeft: Spacing.md }]}>
              <Text style={styles.label}>Unit (optional)</Text>
              <TextInput style={[styles.input, { marginTop: 4 }]} value={unit} onChangeText={setUnit} placeholder="songs, pages..." placeholderTextColor={Colors.textDisabled} />
            </View>
          </View>
        )}

        {!isMilestone && (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Multiple Logs Per Day</Text>
              <Text style={styles.sublabel}>Allow logging this goal more than once daily</Text>
            </View>
            <Switch value={allowMultiple} onValueChange={setAllowMultiple} trackColor={{ true: Colors.accent, false: Colors.bg3 }} thumbColor={Colors.textPrimary} />
          </View>
        )}

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, category === cat && { backgroundColor: selectedColor + '33', borderColor: selectedColor }]}
              onPress={() => setCategory(cat)}
            >
              <Ionicons name={CATEGORY_ICONS[cat] as any} size={16} color={category === cat ? selectedColor : Colors.textSecondary} />
              <Text style={[styles.categoryText, category === cat && { color: selectedColor }]}>{CATEGORY_LABELS[cat]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Difficulty</Text>
        <Text style={styles.sublabel}>Harder goals earn more XP per log</Text>
        <View style={styles.difficultyRow}>
          {(['easy', 'medium', 'hard', 'extreme'] as GoalDifficulty[]).map(d => {
            const mult = DIFFICULTY_MULTIPLIERS[d];
            const labels = { easy: 'Easy', medium: 'Medium', hard: 'Hard', extreme: 'Extreme' };
            const icons = { easy: 'leaf-outline', medium: 'flash-outline', hard: 'flame-outline', extreme: 'rocket-outline' };
            const sel = difficulty === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.diffBtn, sel && { backgroundColor: selectedColor + '33', borderColor: selectedColor }]}
                onPress={() => setDifficulty(d)}
              >
                <Ionicons name={icons[d] as any} size={16} color={sel ? selectedColor : Colors.textSecondary} />
                <Text style={[styles.diffLabel, sel && { color: selectedColor }]}>{labels[d]}</Text>
                <Text style={[styles.diffMult, sel && { color: selectedColor }]}>{mult}×</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {COLORS.map(color => (
            <TouchableOpacity key={color} style={[styles.colorSwatch, { backgroundColor: color }, selectedColor === color && styles.swatchSelected]} onPress={() => setSelectedColor(color)} />
          ))}
        </View>

        <Text style={styles.label}>Icon</Text>
        <View style={styles.iconGrid}>
          {ICONS.map(icon => (
            <TouchableOpacity
              key={icon}
              style={[styles.iconBtn, { width: iconBtnSize, height: iconBtnSize }, selectedIcon === icon && { backgroundColor: selectedColor + '33', borderColor: selectedColor }]}
              onPress={() => setSelectedIcon(icon)}
            >
              <Ionicons name={icon as any} size={24} color={selectedIcon === icon ? selectedColor : Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Daily Reminder</Text>
            <Text style={styles.sublabel}>{reminderEnabled ? `Notify at ${formatTime12h(reminderTime24)}` : 'No reminder'}</Text>
          </View>
          <Switch value={reminderEnabled} onValueChange={setReminderEnabled} trackColor={{ true: Colors.accent, false: Colors.bg3 }} thumbColor={Colors.textPrimary} />
        </View>

        {reminderEnabled && (
          <View style={styles.timePickerRow}>
            {/* Hour */}
            <View style={styles.timeUnit}>
              <TouchableOpacity onPress={() => setRHour(h => h === 12 ? 1 : h + 1)} style={styles.timeArrow}>
                <Ionicons name="chevron-up" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.timeDigit}>{String(rHour).padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => setRHour(h => h === 1 ? 12 : h - 1)} style={styles.timeArrow}>
                <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.timeColon}>:</Text>
            {/* Minute */}
            <View style={styles.timeUnit}>
              <TouchableOpacity onPress={() => setRMinute(m => (m + 5) % 60)} style={styles.timeArrow}>
                <Ionicons name="chevron-up" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.timeDigit}>{String(rMinute).padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => setRMinute(m => (m - 5 + 60) % 60)} style={styles.timeArrow}>
                <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {/* AM/PM */}
            <TouchableOpacity style={styles.ampmBtn} onPress={() => setRIsPM(p => !p)}>
              <Text style={styles.ampmText}>{rIsPM ? 'PM' : 'AM'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Create Goal'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg0 },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sublabel: { color: Colors.textDisabled, fontSize: FontSize.sm, marginTop: 2 },
  input: { backgroundColor: Colors.bg2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md },
  multiline: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex1: { flex: 1 },
  categoryRow: { flexGrow: 0 },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.bg2, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.sm },
  categoryText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  colorSwatch: { width: 36, height: 36, borderRadius: Radius.full, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: Colors.textPrimary, transform: [{ scale: 1.15 }] },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconBtn: { borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg2, borderWidth: 1, borderColor: Colors.border },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  saveBtnText: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  // 12hr time picker
  timePickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  timeUnit: { alignItems: 'center', gap: 4 },
  timeArrow: { padding: 4 },
  timeDigit: { color: Colors.textPrimary, fontSize: 28, fontWeight: '700', minWidth: 42, textAlign: 'center' },
  timeColon: { color: Colors.textPrimary, fontSize: 28, fontWeight: '700', marginBottom: 8 },
  ampmBtn: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  ampmText: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
  difficultyRow: { flexDirection: 'row', gap: Spacing.sm },
  diffBtn: { flex: 1, alignItems: 'center', gap: 3, borderRadius: Radius.md, padding: Spacing.sm, backgroundColor: Colors.bg2, borderWidth: 1, borderColor: Colors.border },
  diffLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  diffMult: { color: Colors.textDisabled, fontSize: 10, fontWeight: '600' },
});
