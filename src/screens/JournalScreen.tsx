import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useJournalStore } from '../store/journalStore';
import DrawingCanvas from '../components/journal/DrawingCanvas';
import { todayString, formatDisplayDate } from '../utils/dateUtils';
import type { DrawingPath } from '../types';

type Tab = 'write' | 'draw';

const MOOD_EMOJIS = ['😔', '😕', '😐', '🙂', '😄'];
const PEN_COLORS = [
  { label: 'White', value: '#F1F5F9' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Blue', value: '#38BDF8' },
  { label: 'Green', value: '#10B981' },
  { label: 'Yellow', value: '#F59E0B' },
  { label: 'Black', value: '#1E293B' },
];
const PEN_SIZES = [2, 4, 8];

export default function JournalScreen() {
  const navigation = useNavigation();
  const { entries, saveEntry, loadEntries } = useJournalStore();

  const today = todayString();
  const todayEntry = entries.find(e => e.entryDate === today);

  const [tab, setTab] = useState<Tab>('write');
  const [mood, setMood] = useState(todayEntry?.mood ?? 3);
  const [energy, setEnergy] = useState(todayEntry?.energy ?? 3);
  const [text, setText] = useState(todayEntry?.textContent ?? '');
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>(todayEntry?.drawingData ?? []);
  const [penColor, setPenColor] = useState(PEN_COLORS[0].value);
  const [penSize, setPenSize] = useState(1); // index into PEN_SIZES
  const [saving, setSaving] = useState(false);

  // Sync from store when entry loads
  useEffect(() => {
    if (todayEntry) {
      setMood(todayEntry.mood);
      setEnergy(todayEntry.energy);
      setText(todayEntry.textContent);
      setDrawingPaths(todayEntry.drawingData);
    }
  }, [todayEntry?.id]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveEntry(today, mood, energy, text, drawingPaths);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save journal entry.');
    } finally {
      setSaving(false);
    }
  }, [today, mood, energy, text, drawingPaths, saveEntry, navigation]);

  const handleUndo = useCallback(() => {
    setDrawingPaths(prev => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    Alert.alert('Clear canvas?', 'This will erase all drawings.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setDrawingPaths([]) },
    ]);
  }, []);

  const switchTab = async (newTab: Tab) => {
    if (newTab === tab) return;
    // Auto-save on tab switch
    await saveEntry(today, mood, energy, text, drawingPaths);
    setTab(newTab);
  };

  const dateLabel = formatDisplayDate(today);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(['write', 'draw'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => switchTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'write' ? 'Write' : 'Draw'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'write' ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.writeContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.dateLabel}>{dateLabel}</Text>

            {/* Mood row */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>How are you feeling?</Text>
              <View style={styles.emojiRow}>
                {MOOD_EMOJIS.map((emoji, idx) => {
                  const val = idx + 1;
                  const selected = mood === val;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.emojiBtn, selected && styles.emojiBtnActive]}
                      onPress={() => setMood(val)}
                    >
                      <Text style={[styles.emoji, selected && styles.emojiSelected]}>
                        {emoji}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Energy row */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Energy level</Text>
              <View style={styles.energyRow}>
                {[1, 2, 3, 4, 5].map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.energyBar, val <= energy && styles.energyBarActive]}
                    onPress={() => setEnergy(val)}
                  >
                    <View style={[styles.energyBarFill, { height: 8 + val * 5 }, val <= energy && styles.energyBarFillActive]} />
                  </TouchableOpacity>
                ))}
                <Text style={styles.energyLabel}>{energy}/5</Text>
              </View>
            </View>

            {/* Text area */}
            <TextInput
              style={styles.textArea}
              placeholder="Write your thoughts..."
              placeholderTextColor={Colors.textDisabled}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.flex}>
          {/* Canvas */}
          <View style={styles.canvasWrapper}>
            <DrawingCanvas
              paths={drawingPaths}
              onPathsChange={setDrawingPaths}
              penColor={penColor}
              penWidth={PEN_SIZES[penSize]}
              style={styles.canvas}
            />
          </View>

          {/* Toolbar */}
          <View style={styles.drawToolbar}>
            {/* Color swatches */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
              {PEN_COLORS.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c.value },
                    penColor === c.value && styles.swatchSelected,
                  ]}
                  onPress={() => setPenColor(c.value)}
                />
              ))}
            </ScrollView>

            {/* Pen sizes */}
            <View style={styles.sizeBtns}>
              {PEN_SIZES.map((size, idx) => (
                <TouchableOpacity
                  key={size}
                  style={[styles.sizeBtn, penSize === idx && styles.sizeBtnActive]}
                  onPress={() => setPenSize(idx)}
                >
                  <View
                    style={[
                      styles.sizeDot,
                      { width: size * 2, height: size * 2, borderRadius: size },
                      penSize === idx && { backgroundColor: penColor },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <TouchableOpacity style={styles.toolBtn} onPress={handleUndo} disabled={drawingPaths.length === 0}>
              <Ionicons
                name="arrow-undo"
                size={20}
                color={drawingPaths.length === 0 ? Colors.textDisabled : Colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={handleClear} disabled={drawingPaths.length === 0}>
              <Ionicons
                name="trash-outline"
                size={20}
                color={drawingPaths.length === 0 ? Colors.textDisabled : Colors.danger}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg0 },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.accentBright,
    fontWeight: '700',
  },

  writeContent: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  dateLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },

  ratingSection: { gap: Spacing.sm },
  ratingLabel: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },

  emojiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emojiBtn: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg1,
  },
  emojiBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  emoji: { fontSize: 24 },
  emojiSelected: { fontSize: 30 },

  energyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  energyBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg1,
    overflow: 'hidden',
  },
  energyBarActive: {
    borderColor: Colors.accent,
  },
  energyBarFill: {
    width: '100%',
    backgroundColor: Colors.bg3,
    borderRadius: Radius.sm,
  },
  energyBarFillActive: {
    backgroundColor: Colors.accent,
  },
  energyLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    minWidth: 24,
  },

  textArea: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    minHeight: 200,
    borderWidth: 1,
    borderColor: Colors.border,
    lineHeight: FontSize.md * 1.6,
  },

  // Draw tab
  canvasWrapper: {
    flex: 1,
    backgroundColor: Colors.bg1,
    margin: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  canvas: { flex: 1 },

  drawToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.bg1,
  },
  colorScroll: { flexGrow: 0, flexShrink: 1 },
  colorSwatch: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    marginRight: Spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: Colors.textPrimary,
    transform: [{ scale: 1.2 }],
  },
  sizeBtns: {
    flexDirection: 'row',
    gap: Spacing.xs,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Spacing.xs,
  },
  sizeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  sizeBtnActive: {
    backgroundColor: Colors.bg3,
  },
  sizeDot: {
    backgroundColor: Colors.textSecondary,
  },
  toolBtn: {
    padding: Spacing.xs,
  },
});
