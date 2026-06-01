import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useJournalStore } from '../store/journalStore';
import { useBadgeStore } from '../store/badgeStore';
import { useThemeStore } from '../store/themeStore';
import { computeJournalStreak } from '../utils/journalUtils';
import DrawingCanvas from '../components/journal/DrawingCanvas';
import { todayString, formatDisplayDate, addDays } from '../utils/dateUtils';
import type { DrawingPath, JournalEntry } from '../types';

type Tab = 'write' | 'draw' | 'stats';

const MOOD_EMOJIS = ['😔', '😕', '😐', '🙂', '😄'];
const PEN_COLORS = [
  { label: 'White',  value: '#F1F5F9' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Red',    value: '#EF4444' },
  { label: 'Blue',   value: '#38BDF8' },
  { label: 'Green',  value: '#10B981' },
  { label: 'Yellow', value: '#F59E0B' },
  { label: 'Black',  value: '#1E293B' },
];
const PEN_SIZES = [2, 4, 8];

const PAPER_BG    = '#111111';
const PAPER_LINE  = '#1A1A1A';
const PAPER_TEXT = '#E8D9C0';
const LINE_H = FontSize.md * 1.8;

// ── Plain-text extraction helper ──────────────────────────────────────────────

function extractPlainText(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.segs)) return parsed.segs.map((s: any) => s.text ?? '').join('');
    if (typeof parsed.t === 'string') return parsed.t;
  } catch {}
  return raw;
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function JournalScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Journal'>>();
  const { entries, saveEntry } = useJournalStore();

  const activeDate = route.params?.date ?? todayString();
  const activeEntry = entries.find(e => e.entryDate === activeDate);
  const today = todayString();
  const todayEntry = activeEntry;

  const [tab, setTab] = useState<Tab>('write');
  const [moodCollapsed, setMoodCollapsed] = useState(false);
  const [mood, setMood] = useState(todayEntry?.mood ?? 3);
  const [energy, setEnergy] = useState(todayEntry?.energy ?? 3);
  const [text, setText] = useState(() => todayEntry ? extractPlainText(todayEntry.textContent) : '');
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>(todayEntry?.drawingData ?? []);
  const [penColor, setPenColor] = useState(PEN_COLORS[0].value);
  const [penSize, setPenSize] = useState(1);
  const [saving, setSaving] = useState(false);

  const isSavingRef = useRef(false);

  // Light/dark mode
  const colorMode = useThemeStore(s => s.colorMode);
  const systemScheme = useColorScheme();
  const effectiveMode = colorMode === 'system' ? (systemScheme ?? 'dark') : colorMode;
  const isLight = effectiveMode === 'light';

  const paperBg      = isLight ? '#FEFEFE' : PAPER_BG;
  const paperLine    = isLight ? '#E5E7EB' : PAPER_LINE;
  const paperTextColor = isLight ? '#1A1A2E' : (PAPER_TEXT ?? '#E8D9C0');

  const isDirty = useMemo(() => {
    const originalText = todayEntry ? extractPlainText(todayEntry.textContent) : '';
    return (
      mood !== (todayEntry?.mood ?? 3) ||
      energy !== (todayEntry?.energy ?? 3) ||
      text !== originalText ||
      drawingPaths.length !== (todayEntry?.drawingData.length ?? 0)
    );
  }, [mood, energy, text, drawingPaths, todayEntry]);

  // Sync from store when entry loads
  useEffect(() => {
    if (todayEntry) {
      setMood(todayEntry.mood);
      setEnergy(todayEntry.energy);
      setText(extractPlainText(todayEntry.textContent));
      setDrawingPaths(todayEntry.drawingData);
    }
  }, [todayEntry?.id]);

  // Unsaved changes guard
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (isSavingRef.current) return; // intentional save — don't block
      if (!isDirty) return;
      e.preventDefault();
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Save before leaving?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: async () => {
            await saveEntry(activeDate, mood, energy, text, drawingPaths);
            navigation.dispatch(e.data.action);
          }},
        ]
      );
    });
    return unsubscribe;
  }, [navigation, isDirty, mood, energy, text, drawingPaths, saveEntry, activeDate]);

  const handleSave = useCallback(async () => {
    isSavingRef.current = true;
    setSaving(true);
    try {
      await saveEntry(activeDate, mood, energy, text, drawingPaths);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const jStreak = computeJournalStreak(useJournalStore.getState().entries);
      useBadgeStore.getState().checkAndAwardGlobal({ journalStreak: jStreak });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save journal entry.');
    } finally {
      setSaving(false);
    }
  }, [activeDate, mood, energy, text, drawingPaths, saveEntry, navigation]);

  const handleUndo = useCallback(() => setDrawingPaths(prev => prev.slice(0, -1)), []);

  const handleClear = useCallback(() => {
    Alert.alert('Clear canvas?', 'This will erase all drawings.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setDrawingPaths([]) },
    ]);
  }, []);

  const switchTab = async (newTab: Tab) => {
    if (newTab === tab) return;
    await saveEntry(activeDate, mood, energy, text, drawingPaths);
    setTab(newTab);
  };

  // Stats data
  const statsData = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
    const recent = sorted.slice(0, 14);

    let streak = 0;
    let d = today;
    for (const entry of sorted) {
      if (entry.entryDate === d) {
        streak++;
        d = addDays(d, -1);
      } else break;
    }

    const thisWeekEntries = sorted.filter(e => e.entryDate >= addDays(today, -6));
    const lastWeekEntries = sorted.filter(e => e.entryDate >= addDays(today, -13) && e.entryDate < addDays(today, -6));
    const avg = (arr: JournalEntry[], key: 'mood' | 'energy') =>
      arr.length ? (arr.reduce((s, e) => s + e[key], 0) / arr.length).toFixed(1) : '—';

    return { streak, recent, thisWeekMood: avg(thisWeekEntries, 'mood'), thisWeekEnergy: avg(thisWeekEntries, 'energy'), lastWeekMood: avg(lastWeekEntries, 'mood'), lastWeekEnergy: avg(lastWeekEntries, 'energy') };
  }, [entries, today]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg0 }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: Colors.textPrimary }]}>Journal</Text>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.accent }, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveBtnText, { color: Colors.textPrimary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabRow, { backgroundColor: Colors.bg1, borderBottomColor: Colors.border }]}>
        {(['write', 'draw', 'stats'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => switchTab(t)}>
            <Text style={[styles.tabText, { color: Colors.textSecondary }, tab === t && { color: Colors.accentBright, fontWeight: '700' }]}>
              {t === 'write' ? 'Write' : t === 'draw' ? 'Draw' : 'Stats'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Write tab */}
      {tab === 'write' && (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <View style={styles.flex}>
            {/* Journal header — mood, energy, date */}
            <View style={[styles.journalHeader, { borderBottomColor: Colors.border }]}>
              <TouchableOpacity
                style={styles.moodToggleRow}
                onPress={() => setMoodCollapsed(c => !c)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateLabel, { color: Colors.textSecondary }]}>{formatDisplayDate(activeDate)}</Text>
                <Ionicons
                  name={moodCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={14}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
              {!moodCollapsed && (
                <>
                  {/* Mood */}
                  <View style={styles.ratingSection}>
                    <Text style={[styles.ratingLabel, { color: Colors.textPrimary }]}>How are you feeling?</Text>
                    <View style={styles.emojiRow}>
                      {MOOD_EMOJIS.map((emoji, idx) => {
                        const val = idx + 1;
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[
                              styles.emojiBtn,
                              { borderColor: Colors.border, backgroundColor: Colors.bg1 },
                              mood === val && { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
                            ]}
                            onPress={() => setMood(val)}
                          >
                            <Text style={[styles.emoji, mood === val && styles.emojiSelected]}>{emoji}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Energy */}
                  <View style={styles.ratingSection}>
                    <Text style={[styles.ratingLabel, { color: Colors.textPrimary }]}>Energy level</Text>
                    <View style={styles.energyRow}>
                      {[1, 2, 3, 4, 5].map(val => (
                        <TouchableOpacity
                          key={val}
                          style={[
                            styles.energyBar,
                            { borderColor: Colors.border, backgroundColor: Colors.bg1 },
                            val <= energy && { borderColor: Colors.accent },
                          ]}
                          onPress={() => setEnergy(val)}
                        >
                          <View
                            style={[
                              styles.energyBarFill,
                              { height: [8, 16, 24, 32, 40][val - 1], backgroundColor: Colors.bg3 },
                              val <= energy && { backgroundColor: Colors.accent },
                            ]}
                          />
                        </TouchableOpacity>
                      ))}
                      <Text style={[styles.energyLabel, { color: Colors.textSecondary }]}>{energy}/5</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Paper — fills remaining space */}
            <View style={[styles.paperWrapper, { backgroundColor: paperBg }]}>
              {/* Paper lines */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {Array.from({ length: 40 }, (_, i) => (
                  <View key={i} style={[styles.paperLine, { top: Spacing.md + (i + 1) * LINE_H, backgroundColor: paperLine }]} />
                ))}
              </View>

              <TextInput
                style={[styles.paperInput, { color: paperTextColor }]}
                multiline
                value={text}
                onChangeText={setText}
                placeholder="Write something..."
                placeholderTextColor={Colors.textDisabled}
                selectionColor={Colors.accent}
                scrollEnabled={false}
                autoCorrect
                spellCheck
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Draw tab */}
      {tab === 'draw' && (
        <View style={styles.flex}>
          <View style={[styles.canvasWrapper, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <DrawingCanvas paths={drawingPaths} onPathsChange={setDrawingPaths} penColor={penColor} penWidth={PEN_SIZES[penSize]} style={styles.canvas} />
          </View>
          <View style={[styles.drawToolbar, { borderTopColor: Colors.border, backgroundColor: Colors.bg1 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.colorScroll} contentContainerStyle={styles.colorScrollContent}>
              {PEN_COLORS.map(c => (
                <TouchableOpacity key={c.value} style={[styles.colorSwatch, { backgroundColor: c.value }, penColor === c.value && styles.swatchSelected]} onPress={() => setPenColor(c.value)} />
              ))}
            </ScrollView>
            <View style={[styles.sizeBtns, { backgroundColor: Colors.bg2 }]}>
              {PEN_SIZES.map((size, idx) => (
                <TouchableOpacity key={size} style={[styles.sizeBtn, penSize === idx && { backgroundColor: Colors.bg3 }]} onPress={() => setPenSize(idx)}>
                  <View style={[styles.sizeDot, { width: size * 2, height: size * 2, borderRadius: size, backgroundColor: Colors.textSecondary }, penSize === idx && { backgroundColor: penColor }]} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.toolBtn} onPress={handleUndo} disabled={drawingPaths.length === 0}>
              <Ionicons name="arrow-undo" size={20} color={drawingPaths.length === 0 ? Colors.textDisabled : Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={handleClear} disabled={drawingPaths.length === 0}>
              <Ionicons name="trash-outline" size={20} color={drawingPaths.length === 0 ? Colors.textDisabled : Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats tab */}
      {tab === 'stats' && (
        <ScrollView contentContainerStyle={styles.statsContent}>
          <Text style={[styles.statsTitle, { color: Colors.textPrimary }]}>Mood & Energy Overview</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
              <Text style={[styles.statCardValue, { color: Colors.accentBright }]}>{statsData.streak}</Text>
              <Text style={[styles.statCardLabel, { color: Colors.textSecondary }]}>Day Streak</Text>
              <Ionicons name="flame" size={16} color={Colors.warning} style={{ marginTop: 2 }} />
            </View>
            <View style={[styles.statCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
              <Text style={[styles.statCardValue, { color: Colors.accentBright }]}>{entries.length}</Text>
              <Text style={[styles.statCardLabel, { color: Colors.textSecondary }]}>Total Entries</Text>
              <Ionicons name="book" size={16} color={Colors.accent} style={{ marginTop: 2 }} />
            </View>
          </View>

          <View style={[styles.compareCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <Text style={[styles.compareTitle, { color: Colors.textPrimary }]}>This Week vs Last Week</Text>
            <View style={styles.compareRow}>
              <Text style={[styles.compareLabel, { color: Colors.textSecondary }]}>😊 Mood</Text>
              <Text style={[styles.compareValue, { color: Colors.textPrimary }]}>{statsData.thisWeekMood}</Text>
              <Text style={[styles.compareArrow, { color: Colors.textDisabled }]}>→</Text>
              <Text style={[styles.compareValue, { color: Colors.textSecondary }]}>{statsData.lastWeekMood}</Text>
            </View>
            <View style={styles.compareRow}>
              <Text style={[styles.compareLabel, { color: Colors.textSecondary }]}>⚡ Energy</Text>
              <Text style={[styles.compareValue, { color: Colors.textPrimary }]}>{statsData.thisWeekEnergy}</Text>
              <Text style={[styles.compareArrow, { color: Colors.textDisabled }]}>→</Text>
              <Text style={[styles.compareValue, { color: Colors.textSecondary }]}>{statsData.lastWeekEnergy}</Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Last 14 Days</Text>
          <View style={styles.moodGrid}>
            {statsData.recent.map(e => (
              <View key={e.id} style={styles.moodGridDay}>
                <Text style={[styles.moodGridDate, { color: Colors.textDisabled }]}>{e.entryDate.slice(5)}</Text>
                <Text style={styles.moodGridEmoji}>{MOOD_EMOJIS[e.mood - 1]}</Text>
                <View style={[styles.moodEnergyBar, { backgroundColor: Colors.bg3 }]}>
                  <View style={[styles.moodEnergyFill, { height: (e.energy / 5) * 24, backgroundColor: Colors.accent }]} />
                </View>
              </View>
            ))}
            {statsData.recent.length === 0 && (
              <Text style={[styles.noData, { color: Colors.textDisabled }]}>No journal entries yet. Start writing!</Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  saveBtn: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: FontSize.sm, fontWeight: '700' },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  tabText: { fontSize: FontSize.md, fontWeight: '500' },

  // Journal header (mood/energy/date)
  journalHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  moodToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, width: '100%' },
  dateLabel: { fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center' },
  ratingSection: { gap: Spacing.xs, width: '100%' },
  ratingLabel: { fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center' },
  emojiRow: { flexDirection: 'row', gap: Spacing.xs, justifyContent: 'center' },
  emojiBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.md, borderWidth: 1,
  },
  emoji: { fontSize: 26 },
  emojiSelected: { fontSize: 28 },

  energyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, justifyContent: 'center' },
  energyBar: {
    width: 34, alignItems: 'center', justifyContent: 'flex-end',
    height: 44, borderRadius: Radius.sm, borderWidth: 1, overflow: 'hidden',
  },
  energyBarFill: { width: '100%', borderRadius: Radius.sm },
  energyLabel: { fontSize: FontSize.sm, minWidth: 24 },

  // Paper text area — fills remaining space
  paperWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  paperLine: { position: 'absolute', left: 0, right: 0, height: 1 },
  paperInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },

  // Draw tab
  canvasWrapper: { flex: 1, margin: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1 },
  canvas: { flex: 1 },
  drawToolbar: {
    flexDirection: 'row', alignItems: 'center', minHeight: 56,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    gap: Spacing.sm, borderTopWidth: 1, paddingTop: Spacing.sm,
  },
  colorScroll: { flex: 1 },
  colorScrollContent: { paddingHorizontal: 4 },
  colorSwatch: { width: 30, height: 30, borderRadius: Radius.full, marginRight: Spacing.xs, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: Colors.textPrimary, transform: [{ scale: 1.2 }] },
  sizeBtns: { flexDirection: 'row', gap: Spacing.xs, borderRadius: Radius.md, padding: Spacing.xs },
  sizeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  sizeDot: {},
  toolBtn: { padding: Spacing.xs },

  // Stats tab
  statsContent: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  statsTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1 },
  statCardValue: { fontSize: FontSize.xxxl, fontWeight: '800' },
  statCardLabel: { fontSize: FontSize.xs },
  compareCard: { borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1 },
  compareTitle: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  compareLabel: { fontSize: FontSize.sm, flex: 1 },
  compareValue: { fontSize: FontSize.lg, fontWeight: '700' },
  compareArrow: { fontSize: FontSize.sm },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  moodGridDay: { alignItems: 'center', gap: 2, width: 48 },
  moodGridDate: { fontSize: 9 },
  moodGridEmoji: { fontSize: 18 },
  moodEnergyBar: { width: 8, height: 24, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  moodEnergyFill: { width: '100%', borderRadius: 4 },
  noData: { fontSize: FontSize.sm, textAlign: 'center', width: '100%', padding: Spacing.xl },
});
