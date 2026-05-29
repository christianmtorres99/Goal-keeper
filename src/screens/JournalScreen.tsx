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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useJournalStore } from '../store/journalStore';
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

const TEXT_COLORS = ['#E8D9C0', '#EF4444', '#F59E0B', '#22C55E', '#38BDF8', '#A855F7'];
const SIZE_OPTIONS: { label: string; size: number }[] = [
  { label: 'S', size: 12 },
  { label: 'M', size: 15 },
  { label: 'L', size: 19 },
  { label: 'XL', size: 24 },
];

const PAPER_BG    = '#111111';
const PAPER_LINE  = '#1A1A1A';
const PAPER_MARGIN = '#CC2222';
const PAPER_TEXT = '#E8D9C0';
const LINE_H = FontSize.md * 1.8;

// ── Rich-text segment helpers (module-level) ──────────────────────────────────

interface RichSeg {
  text: string;
  bold: boolean;
  italic: boolean;
  color: string;
  size: number;
}

function mergeAdjacentSegs(segments: RichSeg[]): RichSeg[] {
  const result: RichSeg[] = [];
  for (const seg of segments) {
    const last = result[result.length - 1];
    if (last && last.bold === seg.bold && last.italic === seg.italic &&
        last.color === seg.color && last.size === seg.size) {
      result[result.length - 1] = { ...last, text: last.text + seg.text };
    } else {
      result.push(seg);
    }
  }
  return result;
}

function insertTextIntoSegments(
  segments: RichSeg[],
  insertAt: number,
  insertedText: string,
  formats: { bold: boolean; italic: boolean; color: string; size: number }
): RichSeg[] {
  const newSeg: RichSeg = { text: insertedText, ...formats };
  let pos = 0;
  const result: RichSeg[] = [];
  let inserted = false;
  for (const seg of segments) {
    const segEnd = pos + seg.text.length;
    if (!inserted && insertAt <= segEnd) {
      const splitAt = insertAt - pos;
      const before = seg.text.slice(0, splitAt);
      const after = seg.text.slice(splitAt);
      if (before) result.push({ ...seg, text: before });
      result.push(newSeg);
      if (after) result.push({ ...seg, text: after });
      inserted = true;
    } else {
      result.push(seg);
    }
    pos = segEnd;
  }
  if (!inserted) result.push(newSeg);
  return mergeAdjacentSegs(result);
}

function deleteFromSegments(segments: RichSeg[], deleteStart: number, deleteCount: number): RichSeg[] {
  const deleteEnd = deleteStart + deleteCount;
  let pos = 0;
  const result: RichSeg[] = [];
  for (const seg of segments) {
    const segStart = pos;
    const segEnd = pos + seg.text.length;
    if (segEnd <= deleteStart || segStart >= deleteEnd) {
      result.push(seg);
    } else {
      const keepBefore = seg.text.slice(0, Math.max(0, deleteStart - segStart));
      const keepAfter = seg.text.slice(Math.max(0, deleteEnd - segStart));
      if (keepBefore) result.push({ ...seg, text: keepBefore });
      if (keepAfter) result.push({ ...seg, text: keepAfter });
    }
    pos = segEnd;
  }
  return mergeAdjacentSegs(result.filter((s: RichSeg) => s.text.length > 0));
}

function segsToPlainText(segments: RichSeg[]): string {
  return segments.map(s => s.text).join('');
}

// ── Legacy span types kept for backward-compat parse/serialize ────────────────

export interface RichSpan {
  start: number;
  end: number;
  bold?: boolean;
  italic?: boolean;
  size?: number;
  color?: string;
}

function parseContent(raw: string): { segs: RichSeg[] } {
  const defaultSeg = (text: string): RichSeg => ({
    text,
    bold: false,
    italic: false,
    color: TEXT_COLORS[0],
    size: FontSize.md,
  });

  if (raw.startsWith('{"t":')) {
    try {
      const p = JSON.parse(raw);
      const text: string = p.t ?? '';
      const spans: RichSpan[] = p.s ?? [];
      if (spans.length === 0) {
        return { segs: text ? [defaultSeg(text)] : [] };
      }
      // Convert span-based format to segment-based
      const segs: RichSeg[] = [];
      let i = 0;
      while (i < text.length) {
        const active = spans.filter(s => s.start <= i && s.end > i);
        const span = active[0];
        const nextBoundary = spans
          .filter(s => s.start > i)
          .reduce((m, s) => Math.min(m, s.start), text.length);
        const endPos = span ? Math.min(span.end, nextBoundary) : nextBoundary;
        segs.push({
          text: text.slice(i, endPos),
          bold: span?.bold ?? false,
          italic: span?.italic ?? false,
          size: span?.size ?? FontSize.md,
          color: span?.color ?? TEXT_COLORS[0],
        });
        i = endPos;
      }
      return { segs: mergeAdjacentSegs(segs) };
    } catch { /* fall through */ }
  }
  if (raw.startsWith('{"segs":')) {
    try {
      const p = JSON.parse(raw);
      return { segs: p.segs ?? [] };
    } catch { /* fall through */ }
  }
  return { segs: raw ? [defaultSeg(raw)] : [] };
}

function serializeContent(segs: RichSeg[]): string {
  if (segs.length === 0) return '';
  const text = segsToPlainText(segs);
  const allDefault = segs.every(s =>
    !s.bold && !s.italic && s.color === TEXT_COLORS[0] && s.size === FontSize.md
  );
  if (allDefault) return text;
  return JSON.stringify({ segs });
}

// ── RichTextView ──────────────────────────────────────────────────────────────

interface RichTextViewProps {
  segs: RichSeg[];
  onPress: () => void;
}

function RichTextView({ segs, onPress }: RichTextViewProps) {
  const hasText = segs.some(s => s.text.length > 0);
  if (!hasText) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.richEmpty}>
        <Text style={styles.richPlaceholder}>Write your thoughts...</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.richViewWrapper}>
      <Text style={styles.richViewBase}>
        {segs.map((seg, idx) => (
          <Text
            key={idx}
            style={{
              fontWeight: seg.bold ? '700' : '400',
              fontStyle: seg.italic ? 'italic' : 'normal',
              fontSize: seg.size,
              color: seg.color,
              lineHeight: seg.size * 1.8,
            }}
          >
            {seg.text}
          </Text>
        ))}
      </Text>
    </TouchableOpacity>
  );
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
  const initialParsed = activeEntry ? parseContent(activeEntry.textContent) : { segs: [] as RichSeg[] };

  const [tab, setTab] = useState<Tab>('write');
  const [mood, setMood] = useState(todayEntry?.mood ?? 3);
  const [energy, setEnergy] = useState(todayEntry?.energy ?? 3);
  const [richSegments, setRichSegments] = useState<RichSeg[]>(initialParsed.segs);
  const [rawText, setRawText] = useState(() => segsToPlainText(initialParsed.segs));
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>(todayEntry?.drawingData ?? []);
  const [penColor, setPenColor] = useState(PEN_COLORS[0].value);
  const [penSize, setPenSize] = useState(1);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeBold, setActiveBold] = useState(false);
  const [activeItalic, setActiveItalic] = useState(false);
  const [activeSizeIdx, setActiveSizeIdx] = useState(1);
  const [activeColor, setActiveColor] = useState(TEXT_COLORS[0]);

  const textInputRef = useRef<TextInput>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const isToolbarPressRef = useRef(false);

  const isDirty = useMemo(() => {
    const originalText = segsToPlainText(initialParsed.segs);
    return (
      mood !== (todayEntry?.mood ?? 3) ||
      energy !== (todayEntry?.energy ?? 3) ||
      rawText !== originalText ||
      drawingPaths.length !== (todayEntry?.drawingData.length ?? 0)
    );
  }, [mood, energy, rawText, drawingPaths, todayEntry]);

  // Sync from store when entry loads
  useEffect(() => {
    if (todayEntry) {
      const c = parseContent(todayEntry.textContent);
      setMood(todayEntry.mood);
      setEnergy(todayEntry.energy);
      setRichSegments(c.segs);
      setRawText(segsToPlainText(c.segs));
      setDrawingPaths(todayEntry.drawingData);
    }
  }, [todayEntry?.id]);

  // Unsaved changes guard
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!isDirty) return;
      e.preventDefault();
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Save before leaving?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: async () => {
            await saveEntry(activeDate, mood, energy, serializeContent(richSegments), drawingPaths);
            navigation.dispatch(e.data.action);
          }},
        ]
      );
    });
    return unsubscribe;
  }, [navigation, isDirty, mood, energy, richSegments, drawingPaths, saveEntry, activeDate]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveEntry(activeDate, mood, energy, serializeContent(richSegments), drawingPaths);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save journal entry.');
    } finally {
      setSaving(false);
    }
  }, [activeDate, mood, energy, richSegments, drawingPaths, saveEntry, navigation]);

  const handleUndo = useCallback(() => setDrawingPaths(prev => prev.slice(0, -1)), []);

  const handleClear = useCallback(() => {
    Alert.alert('Clear canvas?', 'This will erase all drawings.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setDrawingPaths([]) },
    ]);
  }, []);

  const switchTab = async (newTab: Tab) => {
    if (newTab === tab) return;
    setIsEditing(false);
    await saveEntry(activeDate, mood, energy, serializeContent(richSegments), drawingPaths);
    setTab(newTab);
  };

  // Toggle-mode text change handler
  const handleTextChange = useCallback((newText: string) => {
    const oldLen = rawText.length;
    const newLen = newText.length;
    const currentSize = SIZE_OPTIONS[activeSizeIdx]?.size ?? FontSize.md;

    if (newLen > oldLen) {
      const curPos = selectionRef.current.start;
      const insertedLen = newLen - oldLen;
      const insertStart = Math.max(0, curPos - insertedLen);
      const insertedText = newText.slice(insertStart, insertStart + insertedLen);
      const newSegs = insertTextIntoSegments(richSegments, insertStart, insertedText, {
        bold: activeBold,
        italic: activeItalic,
        color: activeColor,
        size: currentSize,
      });
      setRichSegments(newSegs);
    } else if (newLen < oldLen) {
      const curPos = selectionRef.current.start;
      const deleteCount = oldLen - newLen;
      const newSegs = deleteFromSegments(richSegments, curPos, deleteCount);
      setRichSegments(newSegs);
    }
    setRawText(newText);
  }, [rawText, richSegments, activeBold, activeItalic, activeColor, activeSizeIdx]);

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal</Text>
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(['write', 'draw', 'stats'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => switchTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
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
            <View style={styles.journalHeader}>
              <Text style={styles.dateLabel}>{formatDisplayDate(activeDate)}</Text>

              {/* Mood */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingLabel}>How are you feeling?</Text>
                <View style={styles.emojiRow}>
                  {MOOD_EMOJIS.map((emoji, idx) => {
                    const val = idx + 1;
                    return (
                      <TouchableOpacity key={idx} style={[styles.emojiBtn, mood === val && styles.emojiBtnActive]} onPress={() => setMood(val)}>
                        <Text style={[styles.emoji, mood === val && styles.emojiSelected]}>{emoji}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Energy */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingLabel}>Energy level</Text>
                <View style={styles.energyRow}>
                  {[1, 2, 3, 4, 5].map(val => (
                    <TouchableOpacity key={val} style={[styles.energyBar, val <= energy && styles.energyBarActive]} onPress={() => setEnergy(val)}>
                      <View style={[styles.energyBarFill, { height: [6, 14, 21, 28, 35][val - 1] }, val <= energy && styles.energyBarFillActive]} />
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.energyLabel}>{energy}/5</Text>
                </View>
              </View>
            </View>

            {/* Paper — fills remaining space */}
            <View style={styles.paperWrapper}>
              {/* Paper lines */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {Array.from({ length: 40 }, (_, i) => (
                  <View key={i} style={[styles.paperLine, { top: Spacing.md + (i + 1) * LINE_H }]} />
                ))}
                <View style={styles.paperMarginLine} />
              </View>

              {isEditing ? (
                <TextInput
                  ref={textInputRef}
                  style={styles.paperInput}
                  value={rawText}
                  onChangeText={handleTextChange}
                  onSelectionChange={e => {
                    const sel = e.nativeEvent.selection;
                    selectionRef.current = sel;
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!isToolbarPressRef.current) setIsEditing(false);
                      isToolbarPressRef.current = false;
                    }, 150);
                  }}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                  selectionColor={Colors.accentBright}
                />
              ) : (
                <RichTextView
                  segs={richSegments}
                  onPress={() => { setIsEditing(true); setTimeout(() => textInputRef.current?.focus(), 50); }}
                />
              )}
            </View>
          </View>

          {/* Formatting toolbar — pinned at bottom */}
          <View style={styles.formatToolbar}>
            <TouchableOpacity
              style={[styles.formatBtn, activeBold && styles.formatBtnActive]}
              onPressIn={() => { isToolbarPressRef.current = true; }}
              onPress={() => { setActiveBold(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={[styles.formatBtnText, activeBold && styles.formatBtnTextActive]}>B</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formatBtn, activeItalic && styles.formatBtnActive]}
              onPressIn={() => { isToolbarPressRef.current = true; }}
              onPress={() => { setActiveItalic(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={[styles.formatBtnText, styles.italicText, activeItalic && styles.formatBtnTextActive]}>I</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {SIZE_OPTIONS.map((opt, idx) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.formatBtn, activeSizeIdx === idx && styles.formatBtnActive]}
                onPressIn={() => { isToolbarPressRef.current = true; }}
                onPress={() => { setActiveSizeIdx(idx); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={[styles.formatBtnText, activeSizeIdx === idx && styles.formatBtnTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            {TEXT_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, activeColor === c && styles.colorDotActive]}
                onPressIn={() => { isToolbarPressRef.current = true; }}
                onPress={() => { setActiveColor(c); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              />
            ))}
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Draw tab */}
      {tab === 'draw' && (
        <View style={styles.flex}>
          <View style={styles.canvasWrapper}>
            <DrawingCanvas paths={drawingPaths} onPathsChange={setDrawingPaths} penColor={penColor} penWidth={PEN_SIZES[penSize]} style={styles.canvas} />
          </View>
          <View style={styles.drawToolbar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
              {PEN_COLORS.map(c => (
                <TouchableOpacity key={c.value} style={[styles.colorSwatch, { backgroundColor: c.value }, penColor === c.value && styles.swatchSelected]} onPress={() => setPenColor(c.value)} />
              ))}
            </ScrollView>
            <View style={styles.sizeBtns}>
              {PEN_SIZES.map((size, idx) => (
                <TouchableOpacity key={size} style={[styles.sizeBtn, penSize === idx && styles.sizeBtnActive]} onPress={() => setPenSize(idx)}>
                  <View style={[styles.sizeDot, { width: size * 2, height: size * 2, borderRadius: size }, penSize === idx && { backgroundColor: penColor }]} />
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
          <Text style={styles.statsTitle}>Mood & Energy Overview</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statCardValue}>{statsData.streak}</Text>
              <Text style={styles.statCardLabel}>Day Streak</Text>
              <Ionicons name="flame" size={16} color={Colors.warning} style={{ marginTop: 2 }} />
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardValue}>{entries.length}</Text>
              <Text style={styles.statCardLabel}>Total Entries</Text>
              <Ionicons name="book" size={16} color={Colors.accent} style={{ marginTop: 2 }} />
            </View>
          </View>

          <View style={styles.compareCard}>
            <Text style={styles.compareTitle}>This Week vs Last Week</Text>
            <View style={styles.compareRow}>
              <Text style={styles.compareLabel}>😊 Mood</Text>
              <Text style={styles.compareValue}>{statsData.thisWeekMood}</Text>
              <Text style={styles.compareArrow}>→</Text>
              <Text style={[styles.compareValue, { color: Colors.textSecondary }]}>{statsData.lastWeekMood}</Text>
            </View>
            <View style={styles.compareRow}>
              <Text style={styles.compareLabel}>⚡ Energy</Text>
              <Text style={styles.compareValue}>{statsData.thisWeekEnergy}</Text>
              <Text style={styles.compareArrow}>→</Text>
              <Text style={[styles.compareValue, { color: Colors.textSecondary }]}>{statsData.lastWeekEnergy}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Last 14 Days</Text>
          <View style={styles.moodGrid}>
            {statsData.recent.map(e => (
              <View key={e.id} style={styles.moodGridDay}>
                <Text style={styles.moodGridDate}>{e.entryDate.slice(5)}</Text>
                <Text style={styles.moodGridEmoji}>{MOOD_EMOJIS[e.mood - 1]}</Text>
                <View style={styles.moodEnergyBar}>
                  <View style={[styles.moodEnergyFill, { height: (e.energy / 5) * 24, backgroundColor: Colors.accent }]} />
                </View>
              </View>
            ))}
            {statsData.recent.length === 0 && (
              <Text style={styles.noData}>No journal entries yet. Start writing!</Text>
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
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },

  tabRow: { flexDirection: 'row', backgroundColor: Colors.bg1, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  tabText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '500' },
  tabTextActive: { color: Colors.accentBright, fontWeight: '700' },

  // Journal header (mood/energy/date) — centered
  journalHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center' },
  ratingSection: { gap: Spacing.xs, width: '100%' },
  ratingLabel: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center' },
  emojiRow: { flexDirection: 'row', gap: Spacing.xs, justifyContent: 'center' },
  emojiBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg1 },
  emojiBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
  emoji: { fontSize: 20 },
  emojiSelected: { fontSize: 22 },

  energyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, justifyContent: 'center' },
  energyBar: { width: 34, alignItems: 'center', justifyContent: 'flex-end', height: 35, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg1, overflow: 'hidden' },
  energyBarActive: { borderColor: Colors.accent },
  energyBarFill: { width: '100%', backgroundColor: Colors.bg3, borderRadius: Radius.sm },
  energyBarFillActive: { backgroundColor: Colors.accent },
  energyLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, minWidth: 24 },

  // Paper text area — fills remaining space
  paperWrapper: {
    flex: 1,
    backgroundColor: PAPER_BG,
    overflow: 'hidden',
  },
  paperLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: PAPER_LINE },
  paperMarginLine: { position: 'absolute', top: 0, bottom: 0, left: 44, width: 1.5, backgroundColor: PAPER_MARGIN },
  paperInput: {
    flex: 1,
    color: PAPER_TEXT,
    fontSize: FontSize.md,
    lineHeight: LINE_H,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 44 - 8,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  richViewWrapper: {
    flex: 1,
  },
  richViewBase: {
    color: PAPER_TEXT,
    fontSize: FontSize.md,
    lineHeight: LINE_H,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 44 - 8,
  },
  richEmpty: { padding: Spacing.md, paddingLeft: Spacing.md + 44 - 8, flex: 1, justifyContent: 'flex-start' },
  richPlaceholder: { color: '#4A4A4A', fontSize: FontSize.md },

  // Formatting toolbar — pinned at bottom
  formatToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    backgroundColor: Colors.bg1,
    padding: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  formatBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm, backgroundColor: Colors.bg2 },
  formatBtnActive: { backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accent },
  formatBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: FontSize.sm },
  formatBtnTextActive: { color: Colors.accentBright },
  italicText: { fontStyle: 'italic' },
  divider: { width: 1, height: 20, backgroundColor: Colors.border, marginHorizontal: 2 },
  colorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: Colors.textPrimary, transform: [{ scale: 1.2 }] },

  // Draw tab
  canvasWrapper: { flex: 1, backgroundColor: Colors.bg1, margin: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  canvas: { flex: 1 },
  drawToolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, backgroundColor: Colors.bg1 },
  colorScroll: { flexGrow: 0, flexShrink: 1 },
  colorSwatch: { width: 26, height: 26, borderRadius: Radius.full, marginRight: Spacing.xs, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: Colors.textPrimary, transform: [{ scale: 1.2 }] },
  sizeBtns: { flexDirection: 'row', gap: Spacing.xs, backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Spacing.xs },
  sizeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  sizeBtnActive: { backgroundColor: Colors.bg3 },
  sizeDot: { backgroundColor: Colors.textSecondary },
  toolBtn: { padding: Spacing.xs },

  // Stats tab
  statsContent: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  statsTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  statCardValue: { color: Colors.accentBright, fontSize: FontSize.xxxl, fontWeight: '800' },
  statCardLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  compareCard: { backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  compareTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  compareLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
  compareValue: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  compareArrow: { color: Colors.textDisabled, fontSize: FontSize.sm },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  moodGridDay: { alignItems: 'center', gap: 2, width: 48 },
  moodGridDate: { color: Colors.textDisabled, fontSize: 9 },
  moodGridEmoji: { fontSize: 18 },
  moodEnergyBar: { width: 8, height: 24, backgroundColor: Colors.bg3, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  moodEnergyFill: { width: '100%', borderRadius: 4 },
  noData: { color: Colors.textDisabled, fontSize: FontSize.sm, textAlign: 'center', width: '100%', padding: Spacing.xl },
});
