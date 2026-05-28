import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useLogStore } from '../store/logStore';
import { useGoalStore } from '../store/goalStore';
import { useJournalStore } from '../store/journalStore';
import { sumXP } from '../utils/xpUtils';
import { getMonthDays, getMonthName, todayString, dateFromString, formatDisplayDate, daysBetween } from '../utils/dateUtils';
import EmptyState from '../components/common/EmptyState';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { DrawingPath } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOW_LONG  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SCREEN_W = Dimensions.get('window').width;
const CELL_W = Math.floor(SCREEN_W / 7);
const CELL_H = Math.floor(CELL_W * 1.25);

const MOOD_EMOJIS = ['😔', '😕', '😐', '🙂', '😄'];
const THUMB_SIZE = 80;

export default function CalendarScreen() {
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
    const m: Record<string, { color: string; name: string; icon: string }> = {};
    goals.forEach(g => { m[g.id] = { color: g.color, name: g.name, icon: g.icon }; });
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

  // Pad to Monday-aligned grid
  const firstDow = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return (d.getDay() + 6) % 7; // Mon=0 … Sun=6
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
      counts[(d.getDay() + 6) % 7]++;
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

  // Best week (Mon–Sun with most logs)
  const bestWeek = useMemo(() => {
    const weekCounts: Record<string, number> = {};
    monthLogs.forEach(l => {
      const d = dateFromString(l.logDate);
      const dow = (d.getDay() + 6) % 7;
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
    if (completionPct === 100 && elapsedDays > 5) msgs.push('Perfect month so far — every day logged! 🔥');
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

  // Logs for selected day (with note + XP)
  const selectedDayLogs = useMemo(
    () => selectedDay ? monthLogs.filter(l => l.logDate === selectedDay) : [],
    [selectedDay, monthLogs]
  );

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
          <TouchableOpacity onPress={prevMonth} style={styles.arrow}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{getMonthName(month)} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.arrow}>
            <Ionicons name="chevron-forward" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <EmptyState icon="calendar-outline" title="Nothing logged yet" subtitle="Start logging your goals to see them here" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]} edges={['top', 'left', 'right']}>
      {/* Fixed header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.arrow}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{getMonthName(month)} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.arrow}>
          <Ionicons name="chevron-forward" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Fixed DOW labels */}
      <View style={styles.dowRow}>
        {DOW_SHORT.map(d => <Text key={d} style={styles.dowLabel}>{d}</Text>)}
      </View>

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
              <TouchableOpacity
                key={dateStr}
                style={[styles.cell, isToday && styles.cellToday, isPerfect && styles.cellPerfect]}
                onPress={() => isInteractive ? setSelectedDay(dateStr) : null}
                disabled={!isInteractive}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayNum,
                  isToday && styles.dayNumToday,
                  isFuture && styles.dayNumFuture,
                ]}>
                  {parseInt(dateStr.split('-')[2])}
                </Text>
                <View style={styles.dots}>
                  {goalIds.slice(0, 3).map(gid => (
                    <View key={gid} style={[styles.dot, { backgroundColor: goalMap[gid]?.color ?? Colors.accent }]} />
                  ))}
                  {goalIds.length > 3 && (
                    <View style={[styles.dot, { backgroundColor: Colors.textDisabled }]} />
                  )}
                  {hasJournal && (
                    <View style={[styles.dot, styles.journalDot]} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Stats section ── */}
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Month Stats</Text>

          {/* Progress bar */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>{loggedDayCount} / {elapsedDays} days logged</Text>
              <Text style={[styles.progressPct, { color: completionPct >= 80 ? Colors.success : completionPct >= 50 ? Colors.warning : Colors.textSecondary }]}>
                {completionPct}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
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

          {/* Insights */}
          {insights.length > 0 && (
            <View style={styles.insightsCard}>
              <View style={styles.insightsHeader}>
                <Ionicons name="bulb-outline" size={16} color={Colors.warning} />
                <Text style={styles.insightsTitle}>Insights</Text>
              </View>
              {insights.map((msg, i) => (
                <View key={i} style={styles.insightRow}>
                  <View style={styles.insightDot} />
                  <Text style={styles.insightText}>{msg}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Goal legend */}
          {activeGoals.length > 0 && (
            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>Goals</Text>
              <View style={styles.legendRow}>
                {activeGoals.map(g => (
                  <View key={g.id} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: g.color }]} />
                    <Text style={styles.legendLabel} numberOfLines={1}>{g.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Day detail modal */}
      <Modal visible={!!selectedDay} transparent animationType="fade" onRequestClose={() => setSelectedDay(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedDay(null)}>
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheet}
            scrollEnabled
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetDate}>
              {selectedDay ? formatDisplayDate(selectedDay) : ''}
            </Text>

            {/* Goal logs */}
            {selectedDayLogs.map(log => {
              const g = goalMap[log.goalId];
              return (
                <View key={log.id} style={styles.logRow}>
                  <View style={[styles.logIconWrap, { backgroundColor: (g?.color ?? Colors.accent) + '22' }]}>
                    <Ionicons name={(g?.icon ?? 'flag') as any} size={18} color={g?.color ?? Colors.accent} />
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={styles.logGoalName}>{g?.name ?? 'Unknown'}</Text>
                    {log.note ? <Text style={styles.logNote}>{log.note}</Text> : null}
                  </View>
                  <View style={styles.logXPBadge}>
                    <Text style={styles.logXP}>+{log.xpAwarded + log.bonusXp} XP</Text>
                  </View>
                </View>
              );
            })}

            {/* Journal entry section */}
            {selectedDayJournal && (
              <TouchableOpacity
                style={styles.journalSection}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedDay(null);
                  navigation.navigate('Journal', { date: selectedDay! });
                }}
              >
                <View style={styles.journalSectionHeader}>
                  <Ionicons name="journal-outline" size={14} color={Colors.accentBright} />
                  <Text style={styles.journalSectionTitle}>Journal Entry</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textDisabled} />
                </View>
                <View style={styles.journalSectionBody}>
                  {/* Mood + energy */}
                  <View style={styles.journalMoodRow}>
                    <Text style={styles.journalMoodEmoji}>
                      {MOOD_EMOJIS[selectedDayJournal.mood - 1]}
                    </Text>
                    <View style={styles.journalEnergyBars}>
                      {[1, 2, 3, 4, 5].map(v => (
                        <View
                          key={v}
                          style={[
                            styles.journalEnergyBar,
                            { height: [4, 7, 10, 13, 16][v - 1] },
                            v <= selectedDayJournal.energy && styles.journalEnergyBarActive,
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.journalEnergyLabel}>{selectedDayJournal.energy}/5</Text>
                  </View>

                  {/* Text excerpt + drawing thumbnail */}
                  <View style={styles.journalContentRow}>
                    {selectedDayJournal.textContent ? (
                      <Text style={styles.journalExcerpt} numberOfLines={3}>
                        {selectedDayJournal.textContent.startsWith('{"t":')
                          ? (() => { try { return JSON.parse(selectedDayJournal.textContent).t ?? ''; } catch { return selectedDayJournal.textContent; } })()
                          : selectedDayJournal.textContent}
                      </Text>
                    ) : (
                      <Text style={styles.journalExcerptEmpty}>No text written.</Text>
                    )}
                    {selectedDayJournal.drawingData.length > 0 && (
                      <View style={styles.journalThumb}>
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
              </TouchableOpacity>
            )}
          </ScrollView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ icon, iconColor, label, value, sub }: {
  icon: string; iconColor: string; label: string; value: string; sub: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={16} color={iconColor} />
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  arrow: { padding: Spacing.sm },
  monthTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700' },

  dowRow: { flexDirection: 'row', paddingHorizontal: 0 },
  dowLabel: { width: CELL_W, textAlign: 'center', color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', paddingBottom: Spacing.xs },

  scroll: { paddingBottom: Spacing.xxl },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL_W, height: CELL_H, alignItems: 'center', paddingTop: Spacing.xs },
  cellToday: { backgroundColor: Colors.accentDim + '55', borderRadius: Radius.sm },
  cellPerfect: { backgroundColor: Colors.success + '18' },
  dayNum: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '500', marginBottom: 4 },
  dayNumToday: { color: Colors.accentBright, fontWeight: '800' },
  dayNumFuture: { color: Colors.textDisabled },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center', maxWidth: CELL_W - 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Stats section
  statsSection: { padding: Spacing.md, gap: Spacing.md },
  statsTitle: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  progressCard: { backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  progressPct: { fontSize: FontSize.lg, fontWeight: '800' },
  progressBarBg: { height: 8, backgroundColor: Colors.bg3, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, borderRadius: 4 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: { flex: 1, minWidth: '44%', maxWidth: '49%', backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.sm, gap: 2, borderWidth: 1, borderColor: Colors.border },
  statValue: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '800' },
  statLabel: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600' },
  statSub: { color: Colors.textSecondary, fontSize: FontSize.xs - 1 },

  insightsCard: { backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.sm, gap: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  insightsTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  insightDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.warning, marginTop: 5 },
  insightText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 17 },

  legendCard: { backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  legendTitle: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: Colors.textPrimary, fontSize: FontSize.sm },

  journalDot: { backgroundColor: Colors.accentBright, borderWidth: 1.5, borderColor: Colors.bg0 },

  // Day modal
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetScroll: { maxHeight: '80%' },
  sheet: { backgroundColor: Colors.bg1, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.bg3, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  sheetDate: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Spacing.md },
  logIconWrap: { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  logInfo: { flex: 1 },
  logGoalName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  logNote: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  logXPBadge: { backgroundColor: Colors.accentDim, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  logXP: { color: Colors.accentBright, fontSize: FontSize.sm, fontWeight: '700' },

  // Journal section in modal
  journalSection: { backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.accentDim },
  journalSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  journalSectionTitle: { flex: 1, color: Colors.accentBright, fontSize: FontSize.sm, fontWeight: '700' },
  journalSectionBody: { gap: Spacing.sm },
  journalMoodRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  journalMoodEmoji: { fontSize: 22 },
  journalEnergyBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  journalEnergyBar: { width: 6, borderRadius: 2, backgroundColor: Colors.bg3 },
  journalEnergyBarActive: { backgroundColor: Colors.success },
  journalEnergyLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  journalContentRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  journalExcerpt: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 18 },
  journalExcerptEmpty: { flex: 1, color: Colors.textDisabled, fontSize: FontSize.sm, fontStyle: 'italic' },
  journalThumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: Radius.sm, backgroundColor: Colors.bg3, overflow: 'hidden' },
});
