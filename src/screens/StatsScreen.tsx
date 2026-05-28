import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useGoalStore } from '../store/goalStore';
import { useLogStore } from '../store/logStore';
import { useTodoXPStore } from '../store/todoXPStore';
import { useJournalStore } from '../store/journalStore';
import { getPlayerStats } from '../logic/xpEngine';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { sumXP } from '../utils/xpUtils';
import { getCategoryStats, CATEGORY_LABELS, CATEGORY_ICONS } from '../utils/categoryXP';
import HeatmapGrid from '../components/charts/HeatmapGrid';
import EmptyState from '../components/common/EmptyState';
import { todayString, addDays } from '../utils/dateUtils';
import type { GoalCategory } from '../types';

const W = Dimensions.get('window').width - Spacing.md * 2;

const chartConfig = {
  backgroundGradientFrom: Colors.bg1,
  backgroundGradientTo: Colors.bg1,
  color: (opacity = 1) => `rgba(168, 85, 247, ${Math.max(opacity, 0.85)})`,
  labelColor: () => Colors.textSecondary,
  strokeWidth: 3,
  barPercentage: 0.6,
  propsForBackgroundLines: { strokeDasharray: '', stroke: Colors.bg3 },
  decimalPlaces: 0,
};

type FilterMode = 'all' | 'goal' | 'category';

export default function StatsScreen() {
  const goals = useGoalStore(s => s.goals);
  const { logs, graceStates } = useLogStore();
  const todoXP = useTodoXPStore(s => s.totalXP);
  const { entries: journalEntries, loadEntries } = useJournalStore();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory>('other');

  const activeGoals = useMemo(() => goals.filter(g => !g.isArchived), [goals]);
  const categoryStats = useMemo(() => getCategoryStats(goals, logs), [goals, logs]);
  const activeCategories = useMemo(
    () => Object.keys(categoryStats) as GoalCategory[],
    [categoryStats]
  );

  const filteredLogs = useMemo(() => {
    if (filterMode === 'goal' && selectedGoalId) {
      return logs.filter(l => l.goalId === selectedGoalId);
    }
    if (filterMode === 'category') {
      const catGoalIds = new Set(
        activeGoals.filter(g => g.category === selectedCategory).map(g => g.id)
      );
      return logs.filter(l => catGoalIds.has(l.goalId));
    }
    return logs;
  }, [logs, filterMode, selectedGoalId, selectedCategory, activeGoals]);

  const totalXP = useMemo(() => sumXP(logs) + todoXP, [logs, todoXP]);
  const playerStats = useMemo(() => getPlayerStats(totalXP), [totalXP]);

  useEffect(() => {
    loadEntries();
  }, []);

  // Mood & energy chart — last 30 days
  const moodEnergyData = useMemo(() => {
    const today = todayString();
    const labels: string[] = [];
    const moodData: number[] = [];
    const energyData: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i);
      const entry = journalEntries.find(e => e.entryDate === d);
      labels.push(i % 7 === 0 ? d.slice(5) : '');
      moodData.push(entry?.mood ?? 0);
      energyData.push(entry?.energy ?? 0);
    }
    return {
      labels,
      datasets: [
        { data: moodData, color: (op = 1) => Colors.accent + Math.round(Math.max(op, 0.9) * 255).toString(16).padStart(2, '0'), strokeWidth: 3 },
        { data: energyData, color: (op = 1) => Colors.success + Math.round(Math.max(op, 0.9) * 255).toString(16).padStart(2, '0'), strokeWidth: 3 },
      ],
      legend: ['Mood', 'Energy'],
    };
  }, [journalEntries]);

  const hasMoodData = useMemo(() => journalEntries.length > 0, [journalEntries]);

  const moodStats = useMemo(() => {
    const today = todayString();
    // Build last-30-days arrays
    const last30: { date: string; mood: number; energy: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i);
      const entry = journalEntries.find(e => e.entryDate === d);
      last30.push({ date: d, mood: entry?.mood ?? 0, energy: entry?.energy ?? 0 });
    }
    const last30Labels = last30.map((item, i) => (i % 5 === 0 ? item.date.slice(5) : ''));
    const last30Mood = last30.map(item => item.mood);
    const last30Energy = last30.map(item => item.energy);

    // Averages (only entries with data)
    const recentEntries = journalEntries.filter(e => e.entryDate >= addDays(today, -29) && e.entryDate <= today);
    const avgMood = recentEntries.length > 0
      ? (recentEntries.reduce((s, e) => s + e.mood, 0) / recentEntries.length).toFixed(1)
      : null;
    const avgEnergy = recentEntries.length > 0
      ? (recentEntries.reduce((s, e) => s + e.energy, 0) / recentEntries.length).toFixed(1)
      : null;

    // Best and worst day
    let bestDay: { date: string; score: number } | null = null;
    let worstDay: { date: string; score: number } | null = null;
    recentEntries.forEach(e => {
      const score = e.mood + e.energy;
      if (!bestDay || score > bestDay.score) bestDay = { date: e.entryDate, score };
      if (!worstDay || score < worstDay.score) worstDay = { date: e.entryDate, score };
    });

    // Mood distribution 1-5
    const moodDist: number[] = [0, 0, 0, 0, 0];
    recentEntries.forEach(e => {
      const idx = Math.min(Math.max(Math.round(e.mood), 1), 5) - 1;
      moodDist[idx]++;
    });

    // Journal streak (consecutive days with entries ending today)
    const sortedDates = [...new Set(journalEntries.map(e => e.entryDate))].sort();
    let streak = 0;
    let cursor = today;
    while (sortedDates.includes(cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
    }

    return { last30Labels, last30Mood, last30Energy, avgMood, avgEnergy, bestDay, worstDay, moodDist, journalStreak: streak };
  }, [journalEntries]);

  // Daily activity — last 7 days
  const weeklyData = useMemo(() => {
    const today = todayString();
    const labels: string[] = [];
    const data: number[] = [];
    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const day = addDays(today, -i);
      const count = filteredLogs.filter(l => l.logDate === day).length;
      const d = new Date(day + 'T00:00:00');
      labels.push(DOW[d.getDay()]);
      data.push(count);
    }
    return { labels, datasets: [{ data }] };
  }, [filteredLogs]);

  // XP growth — last 30 days
  const xpGrowthData = useMemo(() => {
    const today = todayString();
    const labels: string[] = [];
    const data: number[] = [];
    let cumXP = 0;
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i);
      const dayXP = filteredLogs.filter(l => l.logDate === d).reduce((s, l) => s + l.xpAwarded + l.bonusXp, 0);
      cumXP += dayXP;
      if (i % 6 === 0) labels.push(d.slice(5));
      else labels.push('');
      data.push(cumXP);
    }
    return { labels, datasets: [{ data }] };
  }, [filteredLogs]);

  const totalLogs = filteredLogs.length;

  const selectedGoal = filterMode === 'goal' ? goals.find(g => g.id === selectedGoalId) : undefined;
  const heatColor = selectedGoal?.color ?? Colors.accent;

  const selectGoal = (id: string) => {
    setSelectedGoalId(id);
    setFilterMode('goal');
  };

  const selectCategory = (cat: GoalCategory) => {
    setSelectedCategory(cat);
    setFilterMode('category');
  };

  const selectAll = () => {
    setFilterMode('all');
  };

  if (activeGoals.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]} edges={['top', 'left', 'right']}>
        <Text style={[styles.title, { padding: Spacing.md }]}>Stats</Text>
        <EmptyState icon="bar-chart-outline" title="No stats yet" subtitle="Add a goal and start logging to see your stats" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Stats</Text>

        {/* Global stats */}
        <View style={styles.statRow}>
          {[
            { label: 'Level', value: playerStats.level },
            { label: 'Total XP', value: totalXP },
            { label: 'Total Logs', value: totalLogs },
            { label: 'Goals', value: activeGoals.length },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Filter tabs */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionLabel}>Filter by Goal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterBtn, filterMode === 'all' && styles.filterBtnActive]}
              onPress={selectAll}
            >
              <Text style={[styles.filterText, filterMode === 'all' && styles.filterTextActive]}>All</Text>
            </TouchableOpacity>
            {activeGoals.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.filterBtn,
                  filterMode === 'goal' && selectedGoalId === g.id && { backgroundColor: g.color + '33', borderColor: g.color },
                ]}
                onPress={() => selectGoal(g.id)}
              >
                <Text style={[
                  styles.filterText,
                  filterMode === 'goal' && selectedGoalId === g.id && { color: g.color },
                ]}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activeCategories.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: Spacing.sm }]}>Filter by Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                {activeCategories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.filterBtn,
                      styles.categoryFilterBtn,
                      filterMode === 'category' && selectedCategory === cat && styles.categoryFilterBtnActive,
                    ]}
                    onPress={() => selectCategory(cat)}
                  >
                    <Ionicons
                      name={CATEGORY_ICONS[cat] as any}
                      size={13}
                      color={filterMode === 'category' && selectedCategory === cat ? Colors.accentBright : Colors.textSecondary}
                    />
                    <Text style={[
                      styles.filterText,
                      filterMode === 'category' && selectedCategory === cat && styles.filterTextActive,
                    ]}>{CATEGORY_LABELS[cat]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* Daily logs bar chart */}
        <Text style={styles.sectionLabel}>Last 7 Days</Text>
        <View style={styles.chartCard}>
          <BarChart
            data={weeklyData}
            width={W}
            height={180}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
            showValuesOnTopOfBars
            yAxisLabel=""
            yAxisSuffix=""
          />
        </View>

        {/* XP growth line chart */}
        <Text style={styles.sectionLabel}>XP Growth (30 days)</Text>
        <View style={styles.chartCard}>
          {xpGrowthData.datasets[0].data.some(v => v > 0) ? (
            <LineChart
              data={xpGrowthData}
              width={W}
              height={180}
              chartConfig={chartConfig}
              style={styles.chart}
              bezier
              withDots={false}
            />
          ) : (
            <Text style={styles.noData}>Log some activities to see XP growth</Text>
          )}
        </View>

        {/* Heatmap */}
        <Text style={styles.sectionLabel}>Activity Heatmap (90 days)</Text>
        <View style={styles.chartCard}>
          <HeatmapGrid logs={filteredLogs} goalColor={heatColor} days={91} containerWidth={W - Spacing.md * 2} />
        </View>

        {/* Mood & Energy — comprehensive section */}
        <Text style={styles.sectionLabel}>Mood &amp; Energy</Text>
        {journalEntries.length === 0 ? (
          <View style={styles.chartCard}>
            <Text style={styles.noData}>No journal entries yet</Text>
          </View>
        ) : (
          <>
            {/* Avg tiles */}
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{moodStats.avgMood ?? '—'}</Text>
                <Text style={styles.statLabel}>Avg Mood</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{moodStats.avgEnergy ?? '—'}</Text>
                <Text style={styles.statLabel}>Avg Energy</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{moodStats.journalStreak}</Text>
                <Text style={styles.statLabel}>Journal Streak</Text>
              </View>
            </View>

            {/* 30-day line chart */}
            <View style={styles.chartCard}>
              <View style={styles.moodLegend}>
                <View style={styles.moodLegendItem}>
                  <View style={[styles.moodLegendDot, { backgroundColor: Colors.accent }]} />
                  <Text style={styles.moodLegendText}>Mood</Text>
                </View>
                <View style={styles.moodLegendItem}>
                  <View style={[styles.moodLegendDot, { backgroundColor: Colors.success }]} />
                  <Text style={styles.moodLegendText}>Energy</Text>
                </View>
              </View>
              {moodStats.last30Mood.some(v => v > 0) ? (
                <LineChart
                  data={{
                    labels: moodStats.last30Labels,
                    datasets: [
                      { data: moodStats.last30Mood, color: (op = 1) => Colors.accent + Math.round(Math.max(op, 0.9) * 255).toString(16).padStart(2, '0'), strokeWidth: 3 },
                      { data: moodStats.last30Energy, color: (op = 1) => Colors.success + Math.round(Math.max(op, 0.9) * 255).toString(16).padStart(2, '0'), strokeWidth: 3 },
                    ],
                  }}
                  width={W}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  withDots={false}
                  style={styles.chart}
                  fromZero
                  yAxisSuffix=""
                  yAxisLabel=""
                />
              ) : (
                <Text style={styles.noData}>Need more data</Text>
              )}
            </View>

            {/* Best / Worst day */}
            {(moodStats.bestDay || moodStats.worstDay) && (
              <View style={[styles.chartCard, { flexDirection: 'row', gap: Spacing.md }]}>
                {moodStats.bestDay && (
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.moodLegendText}>Best Day</Text>
                    <Text style={[styles.statValue, { color: Colors.success, fontSize: FontSize.md }]}>{(moodStats.bestDay as any).date}</Text>
                    <Text style={styles.statLabel}>score {(moodStats.bestDay as any).score}</Text>
                  </View>
                )}
                {moodStats.worstDay && (
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.moodLegendText}>Worst Day</Text>
                    <Text style={[styles.statValue, { color: Colors.danger, fontSize: FontSize.md }]}>{(moodStats.worstDay as any).date}</Text>
                    <Text style={styles.statLabel}>score {(moodStats.worstDay as any).score}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Mood distribution */}
            <View style={styles.chartCard}>
              <Text style={[styles.moodLegendText, { marginBottom: Spacing.sm }]}>Mood Distribution</Text>
              {(['😞', '😕', '😐', '🙂', '😄'] as const).map((emoji, idx) => {
                const count = moodStats.moodDist[idx];
                const total = moodStats.moodDist.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? count / total : 0;
                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 }}>
                    <Text style={{ width: 24, textAlign: 'center' }}>{emoji}</Text>
                    <View style={{ flex: 1, height: 10, backgroundColor: Colors.bg3, borderRadius: 5, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', backgroundColor: Colors.accent, borderRadius: 5 }} />
                    </View>
                    <Text style={[styles.statLabel, { width: 24, textAlign: 'right' }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Per-goal streaks */}
        <Text style={styles.sectionLabel}>Current Streaks</Text>
        {activeGoals
          .filter(goal =>
            filterMode === 'category'
              ? goal.category === selectedCategory
              : filterMode === 'goal'
              ? goal.id === selectedGoalId
              : true
          )
          .map(goal => {
            const goalLogs = logs.filter(l => l.goalId === goal.id);
            const grace = graceStates[goal.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
            const { currentStreak, longestStreak } = computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);
            return (
              <View key={goal.id} style={[styles.streakCard, { borderLeftColor: goal.color }]}>
                <Text style={styles.streakGoalName}>{goal.name}</Text>
                <View style={styles.streakNums}>
                  <View style={styles.streakNum}>
                    <Text style={[styles.streakValue, { color: goal.color }]}>{currentStreak}</Text>
                    <Text style={styles.streakLabel}>current</Text>
                  </View>
                  <View style={styles.streakNum}>
                    <Text style={styles.streakValue}>{longestStreak}</Text>
                    <Text style={styles.streakLabel}>best</Text>
                  </View>
                </View>
              </View>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, backgroundColor: Colors.bg1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { color: Colors.accentBright, fontSize: FontSize.xl, fontWeight: '700' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  filterSection: { gap: Spacing.xs },
  filterRow: { flexGrow: 0 },
  filterBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, backgroundColor: Colors.bg2, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.xs },
  filterBtnActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  categoryFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryFilterBtnActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  filterText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  filterTextActive: { color: Colors.accentBright },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  chartCard: { backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  chart: { borderRadius: Radius.md, marginLeft: -Spacing.md },
  noData: { color: Colors.textDisabled, textAlign: 'center', padding: Spacing.xl },
  streakCard: { backgroundColor: Colors.bg1, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streakGoalName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  streakNums: { flexDirection: 'row', gap: Spacing.lg },
  streakNum: { alignItems: 'center' },
  streakValue: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700' },
  streakLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  moodLegend: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  moodLegendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  moodLegendDot: { width: 10, height: 10, borderRadius: 5 },
  moodLegendText: { color: Colors.textSecondary, fontSize: FontSize.xs },
});
