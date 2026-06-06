import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { FontFamily, FontSize, hexAlpha, Radius, Spacing, TextStyle } from '../constants/theme';
import AnimatedPressable from '../components/common/AnimatedPressable';
import { useColors } from '../hooks/useColors';
import { useLogStore } from '../store/logStore';
import { useGoalStore } from '../store/goalStore';
import { useJournalStore } from '../store/journalStore';
import { sumXP } from '../utils/xpUtils';
import { getMonthDays, getMonthName, todayString, dateFromString, formatDisplayDate, daysBetween } from '../utils/dateUtils';
import EmptyState from '../components/common/EmptyState';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { DrawingPath } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SCREEN_W = Dimensions.get('window').width;
const CELL_W = Math.floor(SCREEN_W / 7);
const CELL_H = Math.floor(CELL_W * 1.25);

const MOOD_DOT_COLORS = ['#DC4545', '#D98A1A', '#888898', '#22A37A', '#22C98A'];
const THUMB_SIZE = 80;

export default function CalendarScreen() {
  const { colors: Colors } = useColors();
  const navigation = useNavigation<NavProp>();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { getLogsForMonth, logs: allLogs } = useLogStore();
  const goals = useGoalStore(s => s.goals);
  const { entries: journalEntries } = useJournalStore();

  const monthLogs = useMemo(() => getLogsForMonth(year, month), [year, month, allLogs]);
  const activeGoals = useMemo(() => goals.filter(g => !g.isArchived), [goals]);

  const goalMap = useMemo(() => {
    const m: Record<string, { color: string; name: string; icon: string; type: string; targetCount?: number; unit?: string }> = {};
    goals.forEach(g => { m[g.id] = { color: g.color, name: g.name, icon: g.icon, type: g.type, targetCount: g.targetCount ?? undefined, unit: g.unit ?? undefined }; });
    return m;
  }, [goals]);

  // date → goalIds logged that day
  const dayActivities = useMemo(() => {
    const acts: Record<string, string[]> = {};
    monthLogs.forEach(log => {
      if (!acts[log.logDate]) acts[log.logDate] = [];
      if (!acts[log.logDate].includes(log.goalId)) acts[log.logDate].push(log.goalId);
    });
    return acts;
  }, [monthLogs]);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  // Pad to Sunday-aligned grid
  const firstDow = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return d.getDay(); // Sun=0 … Sat=6
  }, [year, month]);

  const todayStr = todayString();
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const isCurrentMonth = todayStr.startsWith(monthPrefix);

  // ── Stats ──────────────────────────
  const elapsedDays = useMemo(() => {
    if (!isCurrentMonth) return days.length;
    return parseInt(todayStr.split('-')[2]);
  }, [isCurrentMonth, days.length, todayStr]);

  const loggedDayCount = useMemo(() => Object.keys(dayActivities).length, [dayActivities]);

  const completionPct = elapsedDays > 0 ? Math.round((loggedDayCount / elapsedDays) * 100) : 0;

  const perfectDayCount = useMemo(() => {
    if (activeGoals.length === 0) return 0;
    return Object.values(dayActivities).filter(ids => ids.length >= activeGoals.length).length;
  }, [dayActivities, activeGoals]);

  const monthXP = useMemo(() => sumXP(monthLogs), [monthLogs]);

  // Most active day of week
  const mostActiveDOW = useMemo(() => {
    const counts = Array(7).fill(0);
    monthLogs.forEach(l => {
      const d = dateFromString(l.logDate);
      counts[d.getDay()]++;
    });
    const max = Math.max(...counts);
    return max > 0 ? DOW_LONG[counts.indexOf(max)] : null;
  }, [monthLogs]);

  // Favorite goal (most logs this month)
  const favoriteGoal = useMemo(() => {
    const counts: Record<string, number> = {};
    monthLogs.forEach(l => { counts[l.goalId] = (counts[l.goalId] ?? 0) + 1; });
    const topId = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0];
    return topId ? { ...goalMap[topId], id: topId, count: counts[topId] } : null;
  }, [monthLogs, goalMap]);

  // Best week (Sun–Sat with most logs)
  const bestWeek = useMemo(() => {
    const weekCounts: Record<string, number> = {};
    monthLogs.forEach(l => {
      const d = dateFromString(l.logDate);
      const dow = d.getDay();
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - dow);
      const key = `${weekStart.getFullYear()}-${String(weekStart.getMonth()+1).padStart(2,'0')}-${String(weekStart.getDate()).padStart(2,'0')}`;
      weekCounts[key] = (weekCounts[key] ?? 0) + 1;
    });
    const top = Object.entries(weekCounts).sort(([, a], [, b]) => b - a)[0];
    if (!top) return null;
    const [dateStr, count] = top;
    const d = dateFromString(dateStr);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { label, count };
  }, [monthLogs]);

  // Longest gap between logs this month
  const longestGap = useMemo(() => {
    const sortedDates = Object.keys(dayActivities).sort();
    if (sortedDates.length < 2) return null;
    let max = 0;
    for (let i = 1; i < sortedDates.length; i++) {
      const gap = daysBetween(sortedDates[i - 1], sortedDates[i]) - 1;
      if (gap > max) max = gap;
    }
    return max > 0 ? max : null;
  }, [dayActivities]);

  // Insights (dynamic messages)
  const insights = useMemo(() => {
    const msgs: string[] = [];
    if (mostActiveDOW) msgs.push(`You log most on ${mostActiveDOW}s`);
    if (perfectDayCount > 0) msgs.push(`${perfectDayCount} perfect day${perfectDayCount > 1 ? 's' : ''} — every goal logged`);
    if (bestWeek && bestWeek.count >= 5) msgs.push(`Best week started ${bestWeek.label} with ${bestWeek.count} logs`);
    if (longestGap && longestGap >= 3) msgs.push(`Longest gap between logs: ${longestGap} days`);
    if (completionPct === 100 && elapsedDays > 5) msgs.push('Perfect month so far — every day logged.');
    else if (completionPct >= 80) msgs.push('Excellent consistency this month!');
    else if (completionPct >= 50) msgs.push('Good momentum — keep pushing!');
    else if (loggedDayCount === 0) msgs.push('No logs yet this month — start today!');
    return msgs.slice(0, 3);
  }, [mostActiveDOW, perfectDayCount, bestWeek, longestGap, completionPct, elapsedDays, loggedDayCount]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-40, 40])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      if (e.translationX < -60) runOnJS(nextMonth)();
      else if (e.translationX > 60) runOnJS(prevMonth)();
    });

  // Grouped logs for selected day
  const selectedDayGrouped = useMemo(() => {
    if (!selectedDay) return [];
    const dayLogs = monthLogs.filter(l => l.logDate === selectedDay);
    const groupMap: Record<string, { goalId: string; logCount: number; totalCount: number; totalXP: number }> = {};
    dayLogs.forEach(log => {
      if (!groupMap[log.goalId]) {
        groupMap[log.goalId] = { goalId: log.goalId, logCount: 0, totalCount: 0, totalXP: 0 };
      }
      groupMap[log.goalId].logCount++;
      groupMap[log.goalId].totalCount += log.count ?? 1;
      groupMap[log.goalId].totalXP += log.xpAwarded + (log.bonusXp ?? 0);
    });
    return Object.values(groupMap);
  }, [selectedDay, monthLogs]);

  // Journal entry for selected day
  const selectedDayJournal = useMemo(
    () => selectedDay ? journalEntries.find(e => e.entryDate === selectedDay) ?? null : null,
    [selectedDay, journalEntries]
  );

  // Set of days that have journal entries (for this month)
  const journalDays = useMemo(() => {
    const s = new Set<string>();
    journalEntries.forEach(e => { if (e.entryDate.startsWith(monthPrefix)) s.add(e.entryDate); });
    return s;
  }, [journalEntries, monthPrefix]);

  if (activeGoals.length === 0 && monthLogs.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <AnimatedPressable onPress={prevMonth} style={styles.arrow}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </AnimatedPressable>
          <Text style={[styles.monthTitle, { color: Colors.textPrimary }]}>{getMonthName(month)} {year}</Text>
          <AnimatedPressable onPress={nextMonth} style={styles.arrow}>
            <Ionicons name="chevron-forward" size={22} color={Colors.textPrimary} />
          </AnimatedPressable>
        </View>
        <EmptyState icon="calendar-outline" title="Nothing logged yet" subtitle="Log your first goal to begin." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]} edges={['top', 'left', 'right']}>
      {/* Fixed header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={prevMonth} style={styles.arrow}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </AnimatedPressable>
        <Text style={[styles.monthTitle, { color: Colors.textPrimary }]}>{getMonthName(month)} {year}</Text>
        <AnimatedPressable onPress={nextMonth} style={styles.arrow}>
          <Ionicons name="chevron-forward" size={22} color={Colors.textPrimary} />
        </AnimatedPressable>
      </View>

      {/* Fixed DOW labels */}
      <View style={styles.dowRow}>
        {DOW_SHORT.map(d => <Text key={d} style={[styles.dowLabel, { color: Colors.textSecondary }]}>{d}</Text>)}
      </View>

      <GestureDetector gesture={swipeGesture}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Calendar grid */}
        <View style={styles.grid}>
          {Array.from({ length: firstDow }).map((_, i) => (
            <View key={`pad-${i}`} style={styles.cell} />
          ))}
          {days.map(dateStr => {
            const goalIds = dayActivities[dateStr] ?? [];
            const hasJournal = journalDays.has(dateStr);
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const isPerfect = activeGoals.length > 0 && goalIds.length >= activeGoals.length;
            const isInteractive = !isFuture && (goalIds.length > 0 || hasJournal);
            return (
              <AnimatedPressable
                key={dateStr}
                style={[
                  styles.cell,
                  isPerfect && { backgroundColor: hexAlpha(Colors.success, 0.09) },
                ]}
                onPress={() => isInteractive ? setSelectedDay(dateStr) : null}
                disabled={!isInteractive}
              >
                <View style={styles.dayNumWrap}>
                  {isToday && <View style={[styles.todayRing, { backgroundColor: Colors.accentBright }]} />}
                  <Text style={[
                    styles.dayNum,
                    { color: Colors.textPrimary },
                    isToday && [styles.dayNumToday, { color: Colors.bg0 }],
                    isFuture && { color: Colors.textDisabled },
                  ]}>
                    {parseInt(dateStr.split('-')[2])}
                  </Text>
                </View>
                <View style={styles.dots}>
                  {goalIds.slice(0, 3).map(gid => (
                    <View key={gid} style={[styles.dot, { backgroundColor: goalMap[gid]?.color ?? Colors.accent }]} />
                  ))}
                  {goalIds.length > 3 && (
                    <View style={[styles.dot, { backgroundColor: Colors.textDisabled }]} />
                  )}
                  {hasJournal && (
                    <View style={[styles.dot, styles.journalDot, { backgroundColor: Colors.accentBright, borderColor: Colors.bg0 }]} />
                  )}
                </View>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* ── Stats section ── */}
        <View style={styles.statsSection}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccentBar, { backgroundColor: Colors.accentBright }]} />
            <Text style={[styles.statsTitle, { color: Colors.textSecondary }]}>Month Stats</Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressText, { color: Colors.textPrimary }]}>{loggedDayCount} / {elapsedDays} days logged</Text>
              <Text style={[styles.progressPct, { color: completionPct >= 80 ? Colors.success : completionPct >= 50 ? Colors.warning : Colors.textSecondary }]}>
                {completionPct}%
              </Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: Colors.bg3 }]}>
              <View style={[styles.progressBarFill, {
                width: `${completionPct}%` as any,
                backgroundColor: completionPct >= 80 ? Colors.success : completionPct >= 50 ? Colors.warning : Colors.accent,
              }]} />
            </View>
          </View>

          {/* 2-col stat grid */}
          <View style={styles.statGrid}>
            <StatCard
              icon="calendar"
              iconColor={Colors.warning}
              label="Best Day"
              value={mostActiveDOW ? mostActiveDOW.slice(0, 3) : '—'}
              sub={mostActiveDOW ? 'most active' : 'log to see'}
            />
            <StatCard
              icon="checkmark-circle"
              iconColor={Colors.success}
              label="Perfect Days"
              value={perfectDayCount.toString()}
              sub="all goals logged"
            />
            <StatCard
              icon="trophy"
              iconColor={favoriteGoal?.color ?? Colors.textDisabled}
              label="Top Goal"
              value={favoriteGoal ? favoriteGoal.name : '—'}
              sub={favoriteGoal ? `${favoriteGoal.count} log${favoriteGoal.count !== 1 ? 's' : ''}` : 'no logs yet'}
            />
            <StatCard
              icon="flash"
              iconColor={Colors.accentBright}
              label="Month XP"
              value={monthXP.toLocaleString()}
              sub="XP earned"
            />
            {bestWeek && (
              <StatCard
                icon="bar-chart"
                iconColor="#06B6D4"
                label="Best Week"
                value={`${bestWeek.count} logs`}
                sub={`wk of ${bestWeek.label}`}
              />
            )}
            {insights.length > 0 && (
              <StatCard
                icon="bulb-outline"
                iconColor={Colors.warning}
                label="Insight"
                value={`${insights.length}`}
                sub={insights[0].length > 38 ? insights[0].slice(0, 38) + '…' : insights[0]}
              />
            )}
            {longestGap !== null && (
              <StatCard
                icon="time"
                iconColor={longestGap >= 3 ? Colors.danger : Colors.textSecondary}
                label="Longest Gap"
                value={`${longestGap}d`}
                sub="days between logs"
              />
            )}
          </View>

          {/* Goal legend */}
          {activeGoals.length > 0 && (
            <View style={[styles.legendCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
              <Text style={[styles.legendTitle, { color: Colors.textSecondary }]}>Goals</Text>
              <View style={styles.legendRow}>
                {activeGoals.map(g => (
                  <View key={g.id} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: g.color }]} />
                    <Text style={[styles.legendLabel, { color: Colors.textPrimary }]} numberOfLines={1}>{g.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      </GestureDetector>

      {/* Day detail modal */}
      <Modal visible={!!selectedDay} transparent animationType="fade" onRequestClose={() => setSelectedDay(null)}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
          onPress={() => setSelectedDay(null)}
        />
        <View style={styles.centeredModalWrap}>
          <View style={[styles.centeredModal, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <View style={[styles.sheetHandle, { backgroundColor: Colors.bg3 }]} />
            <Text style={[styles.sheetDate, { color: Colors.textPrimary }]}>
              {selectedDay ? formatDisplayDate(selectedDay) : ''}
            </Text>
            <ScrollView
              style={styles.centeredModalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.centeredModalContent}
            >
              {/* Goal logs */}
              {selectedDayGrouped.map(group => {
                const g = goalMap[group.goalId];
                const isCount = g?.type === 'count';
                const nameLabel = group.logCount > 1
                  ? `${g?.name ?? 'Unknown'} ×${group.logCount}`
                  : (g?.name ?? 'Unknown');
                const subLabel = isCount
                  ? `${group.totalCount.toLocaleString()} / ${g.targetCount?.toLocaleString() ?? '?'} ${g.unit ?? ''}`
                  : null;
                return (
                  <View key={group.goalId} style={[styles.logRow, { backgroundColor: Colors.bg2 }]}>
                    <View style={[styles.logIconWrap, { backgroundColor: hexAlpha(g?.color ?? Colors.accent, 0.13) }]}>
                      <Ionicons name={(g?.icon ?? 'flag') as any} size={18} color={g?.color ?? Colors.accent} />
                    </View>
                    <View style={styles.logInfo}>
                      <Text style={[styles.logGoalName, { color: Colors.textPrimary }]}>{nameLabel}</Text>
                      {subLabel ? <Text style={[styles.logNote, { color: Colors.textSecondary }]}>{subLabel}</Text> : null}
                    </View>
                    <View style={[styles.logXPBadge, { backgroundColor: Colors.accentDim }]}>
                      <Text style={[styles.logXP, { color: Colors.accentBright }]}>+{Math.round(group.totalXP)} XP</Text>
                    </View>
                  </View>
                );
              })}

              {/* Journal entry section */}
              {selectedDayJournal && (
                <AnimatedPressable
                  style={[styles.journalSection, { backgroundColor: Colors.bg2, borderColor: Colors.accentDim }]}
                  onPress={() => {
                    setSelectedDay(null);
                    navigation.navigate('Journal', { date: selectedDay! });
                  }}
                >
                  <View style={styles.journalSectionHeader}>
                    <Ionicons name="journal-outline" size={14} color={Colors.accentBright} />
                    <Text style={[styles.journalSectionTitle, { color: Colors.accentBright }]}>Journal Entry</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textDisabled} />
                  </View>
                  <View style={styles.journalSectionBody}>
                    {/* Mood + energy */}
                    <View style={styles.journalMoodRow}>
                      <View style={[styles.journalMoodDot, { backgroundColor: MOOD_DOT_COLORS[selectedDayJournal.mood - 1] }]} />
                      <View style={styles.journalEnergyBars}>
                        {[1, 2, 3, 4, 5].map(v => (
                          <View
                            key={v}
                            style={[
                              styles.journalEnergyBar,
                              { height: [4, 7, 10, 13, 16][v - 1], backgroundColor: Colors.bg3 },
                              v <= selectedDayJournal.energy && [styles.journalEnergyBarActive, { backgroundColor: Colors.success }],
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={[styles.journalEnergyLabel, { color: Colors.textSecondary }]}>{selectedDayJournal.energy}/5</Text>
                    </View>

                    {/* Text excerpt + drawing thumbnail */}
                    <View style={styles.journalContentRow}>
                      {selectedDayJournal.textContent ? (
                        <Text style={[styles.journalExcerpt, { color: Colors.textSecondary }]} numberOfLines={3}>
                          {selectedDayJournal.textContent.startsWith('{"t":')
                            ? (() => { try { return JSON.parse(selectedDayJournal.textContent).t ?? ''; } catch { return selectedDayJournal.textContent; } })()
                            : selectedDayJournal.textContent}
                        </Text>
                      ) : (
                        <Text style={[styles.journalExcerptEmpty, { color: Colors.textDisabled }]}>No text written.</Text>
                      )}
                      {selectedDayJournal.drawingData.length > 0 && (
                        <View style={[styles.journalThumb, { backgroundColor: Colors.bg3 }]}>
                          <Svg width={THUMB_SIZE} height={THUMB_SIZE} viewBox="0 0 300 500">
                            {selectedDayJournal.drawingData.map((p: DrawingPath, i: number) => (
                              <SvgPath
                                key={i}
                                d={p.d}
                                stroke={p.color}
                                strokeWidth={p.strokeWidth}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            ))}
                          </Svg>
                        </View>
                      )}
                    </View>
                  </View>
                </AnimatedPressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ icon, iconColor, label, value, sub }: {
  icon: string; iconColor: string; label: string; value: string; sub: string;
}) {
  const { colors: Colors } = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
      <Ionicons name={icon as any} size={16} color={iconColor} />
      <Text style={[styles.statValue, { color: Colors.textPrimary }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statLabel, { color: Colors.textPrimary }]}>{label}</Text>
      <Text style={[styles.statSub, { color: Colors.textSecondary }]} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  arrow: { padding: Spacing.sm },
  monthTitle: { fontSize: FontSize.xl, fontFamily: FontFamily.bold },

  dowRow: { flexDirection: 'row', paddingHorizontal: 0 },
  dowLabel: { width: CELL_W, textAlign: 'center', fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, paddingBottom: Spacing.xs },

  scroll: { paddingBottom: Spacing.xxl },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL_W, height: CELL_H, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayNumWrap: { width: CELL_W - 10, height: CELL_W - 10, alignItems: 'center', justifyContent: 'center' },
  todayRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: Radius.full },
  dayNum: { fontSize: FontSize.sm, fontFamily: FontFamily.medium },
  dayNumToday: { fontFamily: FontFamily.extraBold },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center', maxWidth: CELL_W - 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Stats section
  statsSection: { padding: Spacing.md, gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionAccentBar: { width: 3, height: 16, borderRadius: Radius.full },
  statsTitle: { ...TextStyle.label },

  progressCard: { borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  progressPct: { fontSize: FontSize.lg, fontFamily: FontFamily.extraBold },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, borderRadius: 4 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: { flex: 1, minWidth: '44%', maxWidth: '49%', borderRadius: Radius.lg, padding: Spacing.sm, gap: 2, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, textAlign: 'center' },
  statLabel: { ...TextStyle.label, textAlign: 'center' },
  statSub: { fontSize: FontSize.xs - 1, fontFamily: FontFamily.regular, textAlign: 'center' },

  legendCard: { borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1 },
  legendTitle: { ...TextStyle.label },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },

  journalDot: { borderWidth: 1.5 },

  // Day modal
  centeredModalWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  centeredModal: { borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', maxHeight: '75%', gap: Spacing.md, borderWidth: 1 },
  centeredModalScroll: { flexGrow: 0 },
  centeredModalContent: { gap: Spacing.md },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  sheetDate: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, padding: Spacing.md },
  logIconWrap: { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  logInfo: { flex: 1 },
  logGoalName: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  logNote: { fontSize: FontSize.sm, marginTop: 2, fontFamily: FontFamily.regular },
  logXPBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  logXP: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },

  // Journal section in modal
  journalSection: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1 },
  journalSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  journalSectionTitle: { flex: 1, fontSize: FontSize.sm, fontFamily: FontFamily.bold },
  journalSectionBody: { gap: Spacing.sm },
  journalMoodRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  journalMoodDot: { width: 14, height: 14, borderRadius: 7 },
  journalEnergyBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  journalEnergyBar: { width: 6, borderRadius: 2 },
  journalEnergyBarActive: {},
  journalEnergyLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  journalContentRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  journalExcerpt: { flex: 1, fontSize: FontSize.sm, lineHeight: 18, fontFamily: FontFamily.regular },
  journalExcerptEmpty: { flex: 1, fontSize: FontSize.sm, fontStyle: 'italic', fontFamily: FontFamily.regular },
  journalThumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: Radius.sm, overflow: 'hidden' },
});
