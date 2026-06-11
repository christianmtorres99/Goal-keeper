import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, Switch, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from '../components/common/AnimatedPressable';

import { FontFamily, FontSize, hexAlpha, Radius, Spacing, TextStyle } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import { useGoalStore } from '../store/goalStore';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../utils/categoryXP';
import { requestNotificationPermissions, scheduleGoalReminder, cancelGoalReminder } from '../utils/notifications';
import { formatTime12h } from '../utils/dateUtils';
import type { GoalCategory, GoalDifficulty, GoalType } from '../types';
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
  const { colors: Colors, isLight } = useColors();
  const { width: winW } = useWindowDimensions();
  const iconBtnSize = Math.floor((winW - Spacing.md * 2 - Spacing.sm * 5) / 6);

  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { addGoal, updateGoal, getGoal } = useGoalStore();
  const allGoals = useGoalStore(s => s.goals);
  const editingId = route.params?.goalId;
  const existing = editingId ? getGoal(editingId) : undefined;

  // Distinct custom skill-track names already in use (for the 'Other' category picker)
  const existingTrackLabels = useMemo(() => {
    const seen = new Map<string, string>();
    allGoals
      .filter(g => !g.isArchived && g.category === 'other' && g.customCategoryLabel?.trim())
      .forEach(g => {
        const label = g.customCategoryLabel!.trim();
        if (!seen.has(label.toLowerCase())) seen.set(label.toLowerCase(), label);
      });
    return [...seen.values()];
  }, [allGoals]);

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [goalType, setGoalType] = useState<GoalType>(existing?.type ?? 'habit');
  const [targetCount, setTargetCount] = useState(existing?.targetCount?.toString() ?? '');
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [selectedIcon, setSelectedIcon] = useState(existing?.icon ?? 'flag');
  const [selectedColor, setSelectedColor] = useState(existing?.color ?? COLORS[0]);
  const [category, setCategory] = useState<GoalCategory>(existing?.category ?? 'other');
  const [customCategoryLabel, setCustomCategoryLabel] = useState(existing?.customCategoryLabel ?? '');
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
    if (goalType === 'count' && (!targetCount || parseInt(targetCount) <= 0)) {
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
        Alert.alert('Notifications Disabled', 'Please enable notification permissions in your device settings to use reminders.');
        notificationId = undefined;
      }
    } else if (notificationId) {
      await cancelGoalReminder(notificationId).catch(() => {});
      notificationId = undefined;
    }

    const hasTarget = goalType === 'count';
    const data = {
      name: name.trim(),
      description: description.trim(),
      type: goalType,
      color: selectedColor,
      icon: selectedIcon,
      category,
      targetCount: hasTarget ? parseInt(targetCount) : undefined,
      unit: hasTarget ? unit.trim() || undefined : undefined,
      notificationTime: reminderEnabled && notificationId ? reminderTime24 : undefined,
      notificationId: notificationId ?? undefined,
      allowMultiplePerDay: goalType === 'habit' ? allowMultiple : false,
      difficulty,
      customCategoryLabel: category === 'other' && customCategoryLabel.trim() ? customCategoryLabel.trim() : undefined,
    };

    if (editingId) {
      await updateGoal(editingId, data);
    } else {
      const newGoal = await addGoal(data);
      // Re-schedule with real goal id once we have it
      if (notificationId && reminderEnabled) {
        try {
          await cancelGoalReminder(notificationId).catch(() => {});
          const realId = await scheduleGoalReminder(newGoal.id, reminderTime24, name.trim());
          await updateGoal(newGoal.id, { notificationId: realId });
        } catch {
          // Non-fatal: goal is saved, reminder just won't fire
        }
      }
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg0 }]} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Goal Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. DJ every day, Read books..."
          placeholderTextColor={Colors.textDisabled}
          maxLength={50}
        />

        <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.multiline, { backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]}
          value={description}
          onChangeText={setDescription}
          placeholder="What's this goal about?"
          placeholderTextColor={Colors.textDisabled}
          multiline
          numberOfLines={3}
        />

        <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Type</Text>
        <View style={styles.typeRow}>
          <AnimatedPressable
            style={[styles.typeCard, { backgroundColor: Colors.bg2, borderColor: Colors.border }, goalType === 'habit' && { borderColor: selectedColor, backgroundColor: hexAlpha(selectedColor, 0.13) }]}
            onPress={() => setGoalType('habit')}

          >
            <Ionicons name="repeat" size={22} color={goalType === 'habit' ? selectedColor : Colors.textSecondary} />
            <Text style={[styles.typeCardTitle, { color: Colors.textSecondary }, goalType === 'habit' && { color: selectedColor }]}>Habit</Text>
            <Text style={[styles.typeCardSub, { color: Colors.textDisabled }]}>Daily check-in</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles.typeCard, { backgroundColor: Colors.bg2, borderColor: Colors.border }, goalType === 'count' && { borderColor: selectedColor, backgroundColor: hexAlpha(selectedColor, 0.13) }]}
            onPress={() => setGoalType('count')}

          >
            <Ionicons name="stats-chart" size={22} color={goalType === 'count' ? selectedColor : Colors.textSecondary} />
            <Text style={[styles.typeCardTitle, { color: Colors.textSecondary }, goalType === 'count' && { color: selectedColor }]}>Count</Text>
            <Text style={[styles.typeCardSub, { color: Colors.textDisabled }]}>Daily target (steps, pages, etc.)</Text>
          </AnimatedPressable>
        </View>

        {goalType === 'count' && (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Target Count</Text>
              <TextInput style={[styles.input, { marginTop: 4, backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]} value={targetCount} onChangeText={setTargetCount} placeholder="10" placeholderTextColor={Colors.textDisabled} keyboardType="number-pad" />
            </View>
            <View style={[styles.flex1, { marginLeft: Spacing.md }]}>
              <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Unit (optional)</Text>
              <TextInput style={[styles.input, { marginTop: 4, backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]} value={unit} onChangeText={setUnit} placeholder="songs, pages..." placeholderTextColor={Colors.textDisabled} />
            </View>
          </View>
        )}

        {goalType === 'habit' && (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Multiple Logs Per Day</Text>
              <Text style={[styles.sublabel, { color: Colors.textDisabled }]}>Allow logging this goal more than once daily</Text>
            </View>
            <Switch value={allowMultiple} onValueChange={setAllowMultiple} trackColor={{ true: Colors.accent, false: Colors.bg3 }} thumbColor={Colors.textPrimary} />
          </View>
        )}

        <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          {CATEGORIES.map(cat => (
            <AnimatedPressable
              key={cat}
              style={[styles.categoryBtn, { backgroundColor: Colors.bg2, borderColor: Colors.border }, category === cat && { backgroundColor: hexAlpha(selectedColor, 0.20), borderColor: selectedColor }]}
              onPress={() => setCategory(cat)}
            >
              <Ionicons name={CATEGORY_ICONS[cat] as any} size={16} color={category === cat ? selectedColor : Colors.textSecondary} />
              <Text style={[styles.categoryText, { color: Colors.textSecondary }, category === cat && { color: selectedColor }]}>{CATEGORY_LABELS[cat]}</Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
        {category === 'other' && (
          <>
            <Text style={[styles.sublabel, { color: Colors.textDisabled }]}>Pick an existing skill track or create a new one</Text>
            {existingTrackLabels.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                {existingTrackLabels.map(label => {
                  const sel = customCategoryLabel.trim().toLowerCase() === label.toLowerCase();
                  return (
                    <AnimatedPressable
                      key={label}
                      style={[styles.categoryBtn, { backgroundColor: Colors.bg2, borderColor: Colors.border }, sel && { backgroundColor: hexAlpha(selectedColor, 0.20), borderColor: selectedColor }]}
                      onPress={() => setCustomCategoryLabel(sel ? '' : label)}
                    >
                      <Text style={[styles.categoryText, { color: Colors.textSecondary }, sel && { color: selectedColor }]}>{label}</Text>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            )}
            <TextInput
              style={[styles.input, { backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]}
              placeholder='New skill track name (e.g. "Finance", "Cooking")'
              placeholderTextColor={Colors.textDisabled}
              value={customCategoryLabel}
              onChangeText={setCustomCategoryLabel}
              maxLength={24}
            />
          </>
        )}

        <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Difficulty</Text>
        <Text style={[styles.sublabel, { color: Colors.textDisabled }]}>Harder goals earn more XP per log</Text>
        <View style={styles.difficultyRow}>
          {(['easy', 'medium', 'hard', 'extreme'] as GoalDifficulty[]).map(d => {
            const mult = DIFFICULTY_MULTIPLIERS[d];
            const labels = { easy: 'Easy', medium: 'Medium', hard: 'Hard', extreme: 'Extreme' };
            const icons = { easy: 'leaf-outline', medium: 'flash-outline', hard: 'flame-outline', extreme: 'rocket-outline' };
            const sel = difficulty === d;
            return (
              <AnimatedPressable
                key={d}
                style={[styles.diffBtn, { backgroundColor: Colors.bg2, borderColor: Colors.border }, sel && { backgroundColor: hexAlpha(selectedColor, 0.20), borderColor: selectedColor }]}
                onPress={() => setDifficulty(d)}
              >
                <Ionicons name={icons[d] as any} size={16} color={sel ? selectedColor : Colors.textSecondary} />
                <Text style={[styles.diffLabel, { color: Colors.textSecondary }, sel && { color: selectedColor }]}>{labels[d]}</Text>
                <Text style={[styles.diffMult, { color: Colors.textDisabled }, sel && { color: selectedColor }]}>{mult}×</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Color</Text>
        <View style={styles.colorRow}>
          {COLORS.map(color => (
            <AnimatedPressable key={color} style={[styles.colorSwatch, { backgroundColor: color }, selectedColor === color && [styles.swatchSelected, { borderColor: Colors.textPrimary }]]} onPress={() => setSelectedColor(color)} />
          ))}
        </View>

        <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Icon</Text>
        <View style={styles.iconGrid}>
          {ICONS.map(icon => (
            <AnimatedPressable
              key={icon}
              style={[styles.iconBtn, { width: iconBtnSize, height: iconBtnSize, backgroundColor: Colors.bg2, borderColor: Colors.border }, selectedIcon === icon && { backgroundColor: hexAlpha(selectedColor, 0.20), borderColor: selectedColor }]}
              onPress={() => setSelectedIcon(icon)}
            >
              <Ionicons name={icon as any} size={24} color={selectedIcon === icon ? selectedColor : Colors.textSecondary} />
            </AnimatedPressable>
          ))}
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Daily Reminder</Text>
            <Text style={[styles.sublabel, { color: Colors.textDisabled }]}>{reminderEnabled ? `Notify at ${formatTime12h(reminderTime24)}` : 'No reminder'}</Text>
          </View>
          <Switch value={reminderEnabled} onValueChange={setReminderEnabled} trackColor={{ true: Colors.accent, false: Colors.bg3 }} thumbColor={Colors.textPrimary} />
        </View>

        {reminderEnabled && (
          <View style={[styles.timePickerRow, { backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
            {/* Hour */}
            <View style={styles.timeUnit}>
              <AnimatedPressable onPress={() => setRHour(h => h === 12 ? 1 : h + 1)} style={styles.timeArrow} hitSlop={8}>
                <Ionicons name="chevron-up" size={16} color={Colors.textSecondary} />
              </AnimatedPressable>
              <Text style={[styles.timeDigit, { color: Colors.textPrimary }]}>{String(rHour).padStart(2, '0')}</Text>
              <AnimatedPressable onPress={() => setRHour(h => h === 1 ? 12 : h - 1)} style={styles.timeArrow} hitSlop={8}>
                <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
              </AnimatedPressable>
            </View>
            <Text style={[styles.timeColon, { color: Colors.textPrimary }]}>:</Text>
            {/* Minute */}
            <View style={styles.timeUnit}>
              <AnimatedPressable onPress={() => setRMinute(m => (m + 1) % 60)} style={styles.timeArrow} hitSlop={8}>
                <Ionicons name="chevron-up" size={16} color={Colors.textSecondary} />
              </AnimatedPressable>
              <Text style={[styles.timeDigit, { color: Colors.textPrimary }]}>{String(rMinute).padStart(2, '0')}</Text>
              <AnimatedPressable onPress={() => setRMinute(m => (m - 1 + 60) % 60)} style={styles.timeArrow} hitSlop={8}>
                <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
              </AnimatedPressable>
            </View>
            {/* AM/PM */}
            <AnimatedPressable style={[styles.ampmBtn, { backgroundColor: Colors.accent }]} onPress={() => setRIsPM(p => !p)}>
              <Text style={[styles.ampmText, { color: Colors.textPrimary }]}>{rIsPM ? 'PM' : 'AM'}</Text>
            </AnimatedPressable>
          </View>
        )}

        <AnimatedPressable style={[styles.saveBtn, { backgroundColor: Colors.accent }]} onPress={handleSave}>
          <Text style={[styles.saveBtnText, { color: Colors.textPrimary }]}>{editingId ? 'Save Changes' : 'Create Goal'}</Text>
        </AnimatedPressable>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  sublabel: { fontSize: FontSize.sm, marginTop: 2 },
  input: { borderRadius: Radius.md, borderWidth: 1, fontSize: FontSize.md, padding: Spacing.md },
  multiline: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex1: { flex: 1 },
  typeRow: { flexDirection: 'row', gap: Spacing.sm },
  typeCard: { flex: 1, alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.lg, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderWidth: 2, minHeight: 44 },
  typeCardTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold },
  typeCardSub: { fontSize: FontSize.xs, textAlign: 'center' },
  categoryRow: { flexGrow: 0 },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, marginRight: Spacing.sm },
  categoryText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  colorSwatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { transform: [{ scale: 1.15 }] },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconBtn: { borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  saveBtn: { borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  saveBtnText: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  // 12hr time picker
  timePickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  timeUnit: { alignItems: 'center', gap: Spacing.xs },
  timeArrow: { padding: Spacing.sm },
  timeDigit: { fontSize: FontSize.xxl, fontFamily: FontFamily.bold, minWidth: 42, textAlign: 'center' },
  timeColon: { fontSize: FontSize.xxl, fontFamily: FontFamily.bold, marginBottom: 8 },
  ampmBtn: { borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  ampmText: { fontSize: FontSize.md, fontFamily: FontFamily.bold },
  difficultyRow: { flexDirection: 'row', gap: Spacing.sm },
  diffBtn: { flex: 1, alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  diffLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.bold },
  diffMult: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold },
});
