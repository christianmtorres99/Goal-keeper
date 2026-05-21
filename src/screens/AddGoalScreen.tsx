import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useGoalStore } from '../store/goalStore';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Route = RouteProp<RootStackParamList, 'AddGoal'>;

const ICONS = [
  'musical-notes', 'fitness', 'book', 'code-slash', 'brush', 'barbell',
  'camera', 'bicycle', 'leaf', 'heart', 'star', 'trophy', 'flame',
  'flash', 'rocket', 'planet', 'diamond', 'shield', 'flag', 'medal',
  'mic', 'headset', 'game-controller', 'cafe', 'restaurant',
  'walk', 'bed', 'water', 'sunny', 'moon',
];

const COLORS = [
  '#7B5EA7', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899',
];

export default function AddGoalScreen() {
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

  useEffect(() => {
    navigation.setOptions({ title: editingId ? 'Edit Goal' : 'New Goal' });
  }, [editingId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a goal name.');
      return;
    }
    if (isMilestone && (!targetCount || parseInt(targetCount) <= 0)) {
      Alert.alert('Required', 'Please enter a valid target count for your milestone.');
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim(),
      type: isMilestone ? 'milestone' as const : 'habit' as const,
      color: selectedColor,
      icon: selectedIcon,
      targetCount: isMilestone ? parseInt(targetCount) : undefined,
      unit: isMilestone ? unit.trim() || undefined : undefined,
    };

    if (editingId) {
      await updateGoal(editingId, data);
    } else {
      await addGoal(data);
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
          <Switch
            value={isMilestone}
            onValueChange={setIsMilestone}
            trackColor={{ true: Colors.accent, false: Colors.bg3 }}
            thumbColor={Colors.textPrimary}
          />
        </View>

        {isMilestone && (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Target Count</Text>
              <TextInput
                style={[styles.input, { marginTop: 4 }]}
                value={targetCount}
                onChangeText={setTargetCount}
                placeholder="10"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.flex1, { marginLeft: Spacing.md }]}>
              <Text style={styles.label}>Unit (optional)</Text>
              <TextInput
                style={[styles.input, { marginTop: 4 }]}
                value={unit}
                onChangeText={setUnit}
                placeholder="songs, pages..."
                placeholderTextColor={Colors.textDisabled}
              />
            </View>
          </View>
        )}

        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {COLORS.map(color => (
            <TouchableOpacity
              key={color}
              style={[styles.colorSwatch, { backgroundColor: color }, selectedColor === color && styles.swatchSelected]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>

        <Text style={styles.label}>Icon</Text>
        <View style={styles.iconGrid}>
          {ICONS.map(icon => (
            <TouchableOpacity
              key={icon}
              style={[styles.iconBtn, selectedIcon === icon && { backgroundColor: selectedColor + '33', borderColor: selectedColor }]}
              onPress={() => setSelectedIcon(icon)}
            >
              <Ionicons name={icon as any} size={24} color={selectedIcon === icon ? selectedColor : Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

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
  input: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    padding: Spacing.md,
  },
  multiline: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex1: { flex: 1 },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  colorSwatch: { width: 36, height: 36, borderRadius: Radius.full, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: Colors.textPrimary, transform: [{ scale: 1.15 }] },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconBtn: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg2, borderWidth: 1, borderColor: Colors.border },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  saveBtnText: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
});
