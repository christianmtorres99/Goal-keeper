import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { FontFamily, FontSize, hexAlpha, Radius, Spacing, TextStyle } from '../constants/theme';
import { Spring, Timing, Stagger } from '../constants/motion';
import AmbientBackground from '../components/common/AmbientBackground';
import { Elevation } from '../constants/elevation';
import AnimatedPressable from '../components/common/AnimatedPressable';
import { useColors } from '../hooks/useColors';
import { useGoalStore } from '../store/goalStore';
import { useLogStore } from '../store/logStore';
import { useTodoXPStore } from '../store/todoXPStore';
import { useJournalStore } from '../store/journalStore';
import { getPlayerStats } from '../logic/xpEngine';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { sumXP, formatStatValue } from '../utils/xpUtils';
import { getCategoryStats, CATEGORY_LABELS, CATEGORY_ICONS } from '../utils/categoryXP';
import HeatmapGrid from '../components/charts/HeatmapGrid';
import EmptyState from '../components/common/EmptyState';
import StreakFlame from '../components/common/StreakFlame';
import { todayString, addDays, formatShortDate } from '../utils/dateUtils';
import type { GoalCategory } from '../types';

const W = Dimensions.get('window').width - Spacing.md * 2;

type FilterMode = 'all' | 'goal' | 'category';

export default function StatsScreen() {
  const { colors: Colors } = useColors();
  const goals = useGoalStore(s => s.goals);
  const { logs, graceStates } = useLogStore();
  const todoXP = useTodoXPStore(s => s.totalXP);
  const { entries: journalEntries, loadEntries } = useJournalStore();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory>('other');

  // Section reveal animations
  const revealY0 = useSharedValue(12);
  const revealOp0 = useSharedValue(0);
  const revealY1 = useSharedValue(12);
  const revealOp1 = useSharedValue(0);
  const revealY2 = useSharedValue(12);
  const revealOp2 = useSharedValue(0);

  useEffect(() => {
    revealY0.value = withSpring(0, Spring.snappy);
    revealOp0.value = withTiming(1, { duration: Timing.fast });
    revealY1.value = withDelay(Stagger.section, withSpring(0, Spring.snappy));
    revealOp1.value = withDelay(Stagger.section, withTiming(1, { duration: Timing.fast }));
    revealY2.value = withDelay(Stagger.section * 2, withSpring(0, Spring.snappy));
    revealOp2.value = withDelay(Stagger.section * 2, withTiming(1, { duration: Timing.fast }));
  }, []);

  const reveal0 = useAnimatedStyle(() => ({ opacity: revealOp0.value, transform: [{ translateY: revealY0.value }] }));
  const reveal1 = useAnimatedStyle(() => ({ opacity: revealOp1.value, transform: [{ translateY: revealY1.value }] }));
  const reveal2 = useAnimatedStyle(() => ({ opacity: revealOp2.value, transform: [{ translateY: revealY2.value }] }));

  const chartConfig = useMemo(() => ({
    backgroundGradientFrom: Colors.bg1,
    backgroundGradientTo: Colors.bg1,
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => Colors.accentBright + Math.round(Math.max(opacity, 0.85) * 255).toString(16).padStart(2, '0'),
    labelColor: () => Colors.textSecondary,
    strokeWidth: 3,
    barPercentage: 0.6,
    propsForBackgroundLines: { strokeDasharray: '', stroke: Colors.bg3 },
    decimalPlaces: 0,
  }), [Colors]);

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
      labels.push(i % 7 === 0 ? formatShortDate(d) : '');
      moodData.push(entry?.mood ?? 0);
      energyData.push(entry?.energy ?? 0);
    }
    return {
      labels,
      datasets: [
        { data: moodData, color: (op = 1) => Colors.accent + Math.round(Math.max(op, 0.9) * 255).toString(16).padStart(2, '0'), strokeWidth: 3 },
        { data: energyData, color: (op = 1) => Colors.warning + Math.round(Math.max(op, 0.9) * 255).toString(16).padStart(2, '0'), strokeWidth: 3 },
      ],
      legend: ['Mood', 'Energy'],
    };
  }, [journalEntries, Colors]);

  const moodStats = useMemo(() => {
    const today = todayString();
    const last30: { date: string; mood: number; energy: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i);
      const entry = journalEntries.find(e => e.entryDate === d);
      last30.push({ date: d, mood: entry?.mood ?? 0, energy: entry?.energy ?? 0 });
    }
    const last30Labels = last30.map((item, i) => (i % 5 === 0 ? formatShortDate(item.date) : ''));
    const last30Mood = last30.map(item => item.mood);
    const last30Energy = last30.map(item => item.energy);

    const recentEntries = journalEntries.filter(e => e.entryDate >= addDays(today, -29) && e.entryDate <= today);
    const avgMood = recentEntries.length > 0
      ? (recentEntries.reduce((s, e) => s + e.mood, 0) / recentEntries.length).toFixed(1)
      : null;
    const avgEnergy = recentEntries.length > 0
      ? (recentEntries.reduce((s, e) => s + e.energy, 0) / recentEntries.length).toFixed(1)
      : null;

    let bestDay: { date: string; score: number } | null = null;
    let worstDay: { date: string; score: number } | null = null;
    recentEntries.forEach(e => {
      const score = e.mood + e.energy;
      if (!bestDay || score > bestDay.score) bestDay = { date: e.entryDate, score };
      if (!worstDay || score < worstDay.score) worstDay = { date: e.entryDate, score };
    });

    const moodDist: number[] = [0, 0, 0, 0, 0];
    recentEntries.forEach(e => {
      const idx = Math.min(Math.max(Math.round(e.mood), 1), 5) - 1;
      moodDist[idx]++;
    });

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
      if (i % 6 === 0) labels.push(formatShortDate(d));
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

  // Filtered goals sorted by streak descending for leaderboard
  const streakLeaderboard = useMemo(() => {
    const filtered = activeGoals.filter(goal =>
      filterMode === 'category'
        ? goal.category === selectedCategory
        : filterMode === 'goal'
        ? goal.id === selectedGoalId
        : true
    );
    return filtered
      .map(goal => {
        const goalLogs = logs.filter(l => l.goalId === goal.id);
        const grace = graceStates[goal.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
        const { currentStreak, longestStreak } = computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);
        return { goal, currentStreak, longestStreak };
      })
      .sort((a, b) => b.currentStreak - a.currentStreak);
  }, [activeGoals, logs, graceStates, filterMode, selectedGoalId, selectedCategory]);

  if (activeGoals.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]} edges={['top', 'left', 'right']}>
        <AmbientBackground />
        <Text style={[styles.title, { color: Colors.textPrimary, padding: Spacing.md }]}>Stats</Text>
        <EmptyState icon="bar-chart-outline" title="No stats yet" subtitle="Log your first goal to see stats here." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]} edges={['top', 'left', 'right']}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: Colors.textPrimary }]}>Stats</Text>

        {/* Section 0 — Global stats + filters */}
        <Animated.View style={[styles.sectionBlock, reveal0]}>
          <View style={styles.statRow}>
            {[
              { label: 'Level', value: formatStatValue(playerStats.level) },
              { label: 'Total XP', value: formatStatValue(totalXP) },
              { label: 'Total Logs', value: formatStatValue(totalLogs) },
              { label: 'Goals', value: formatStatValue(activeGoals.length) },
            ].map(s => (
              <View key={s.label} style={[styles.statBox, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
                <Text style={[styles.statValue, { color: Colors.accentBright }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Filter tabs */}
          <View style={styles.filterSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccentBar, { backgroundColor: Colors.accentBright }]} />
              <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Filter by Goal</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <AnimatedPressable
                style={[styles.filterBtn, { backgroundColor: Colors.bg2, borderColor: Colors.border }, filterMode === 'all' && { backgroundColor: Colors.accentDim, borderColor: Colors.accent }]}
                onPress={selectAll}
                hitSlop={{ top: 4, bottom: 4 }}
              >
                <Text style={[styles.filterText, { color: Colors.textSecondary }, filterMode === 'all' && { color: Colors.accentBright }]}>All</Text>
              </AnimatedPressable>
              {activeGoals.map(g => (
                <AnimatedPressable
                  key={g.id}
                  style={[
                    styles.filterBtn,
                    { backgroundColor: Colors.bg2, borderColor: Colors.border },
                    filterMode === 'goal' && selectedGoalId === g.id && { backgroundColor: hexAlpha(g.color, 0.20), borderColor: g.color },
                  ]}
                  onPress={() => selectGoal(g.id)}
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <Text style={[
                    styles.filterText,
                    { color: Colors.textSecondary },
                    filterMode === 'goal' && selectedGoalId === g.id && { color: g.color },
                  ]}>{g.name}</Text>
                </AnimatedPressable>
              ))}
            </ScrollView>

            {activeCategories.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: Spacing.sm }]}>
                  <View style={[styles.sectionAccentBar, { backgroundColor: Colors.accentBright }]} />
                  <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Filter by Category</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                  {activeCategories.map(cat => (
                    <AnimatedPressable
                      key={cat}
                      style={[
                        styles.filterBtn,
                        styles.categoryFilterBtn,
                        { backgroundColor: Colors.bg2, borderColor: Colors.border },
                        filterMode === 'category' && selectedCategory === cat && { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
                      ]}
                      onPress={() => selectCategory(cat)}
                      hitSlop={{ top: 4, bottom: 4 }}
                    >
                      <Ionicons
                        name={CATEGORY_ICONS[cat] as any}
                        size={13}
                        color={filterMode === 'category' && selectedCategory === cat ? Colors.accentBright : Colors.textSecondary}
                      />
                      <Text style={[
                        styles.filterText,
                        { color: Colors.textSecondary },
                        filterMode === 'category' && selectedCategory === cat && { color: Colors.accentBright },
                      ]}>{CATEGORY_LABELS[cat]}</Text>
                    </AnimatedPressable>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </Animated.View>

        {/* Section 1 — Charts + Mood */}
        <Animated.View style={[styles.sectionBlock, reveal1]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccentBar, { backgroundColor: Colors.accentBright }]} />
            <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Last 7 Days</Text>
          </View>
          <View style={[styles.chartCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
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

          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccentBar, { backgroundColor: Colors.accentBright }]} />
            <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>XP Growth (30 days)</Text>
          </View>
          <View style={[styles.chartCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
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
              <Text style={[styles.noData, { color: Colors.textDisabled }]}>Log some activities to see XP growth</Text>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccentBar, { backgroundColor: Colors.accentBright }]} />
            <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Activity Heatmap (90 days)</Text>
          </View>
          <View style={[styles.chartCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <HeatmapGrid logs={filteredLogs} goalColor={heatColor} days={91} containerWidth={W - Spacing.md * 2} />
          </View>

          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccentBar, { backgroundColor: Colors.accentBright }]} />
            <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Mood &amp; Energy</Text>
          </View>
          {journalEntries.length === 0 ? (
            <View style={[styles.chartCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
              <Text style={[styles.noData, { color: Colors.textDisabled }]}>No journal entries yet</Text>
            </View>
          ) : (
            <>
              <View style={styles.statRow}>
                <View style={[styles.statBox, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
                  <Text style={[styles.statValue, { color: Colors.accentBright }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{moodStats.avgMood ?? '—'}</Text>
                  <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Avg Mood</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
                  <Text style={[styles.statValue, { color: Colors.accentBright }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{moodStats.avgEnergy ?? '—'}</Text>
                  <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Avg Energy</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
                  <Text style={[styles.statValue, { color: Colors.accentBright }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{moodStats.journalStreak}</Text>
                  <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Journal Streak</Text>
                </View>
              </View>

              <View style={[styles.chartCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
                <View style={styles.moodLegend}>
                  <View style={styles.moodLegendItem}>
                    <View style={[styles.moodLegendDot, { backgroundColor: Colors.accent }]} />
                    <Text style={[styles.moodLegendText, { color: Colors.textSecondary }]}>Mood</Text>
                  </View>
                  <View style={styles.moodLegendItem}>
                    <View style={[styles.moodLegendDot, { backgroundColor: Colors.warning }]} />
                    <Text style={[styles.moodLegendText, { color: Colors.textSecondary }]}>Energy</Text>
                  </View>
                </View>
                {moodStats.last30Mood.some(v => v > 0) ? (
                  <LineChart
                    data={{
                      labels: moodStats.last30Labels,
                      datasets: [
                        { data: moodStats.last30Mood, color: (op = 1) => Colors.accent + Math.round(Math.max(op, 0.9) * 255).toString(16).padStart(2, '0'), strokeWidth: 3 },
                        { data: moodStats.last30Energy, color: (op = 1) => Colors.warning + Math.round(Math.max(op, 0.9) * 255).toString(16).padStart(2, '0'), strokeWidth: 3 },
                      ],
                    }}
                    width={W}
                    height={180}
                    chartConfig={chartConfig}
                    bezier
                    withDots={false}
                    style={{ borderRadius: Radius.md, marginLeft: -Spacing.lg }}
                    fromZero
                    yAxisSuffix=""
                    yAxisLabel=""
                  />
                ) : (
                  <Text style={[styles.noData, { color: Colors.textDisabled }]}>Need more data</Text>
                )}
              </View>

              {(moodStats.bestDay || moodStats.worstDay) && (
                <View style={[styles.chartCard, { backgroundColor: Colors.bg1, borderColor: Colors.border, flexDirection: 'row', gap: Spacing.md }]}>
                  {moodStats.bestDay && (
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={[styles.moodLegendText, { color: Colors.textSecondary }]}>Best Day</Text>
                      <Text style={[styles.statValue, { color: Colors.success, fontSize: FontSize.md, textAlign: 'center' }]}>{formatShortDate((moodStats.bestDay as any).date)}</Text>
                      <Text style={[styles.statLabel, { color: Colors.textSecondary, textAlign: 'center' }]}>score {(moodStats.bestDay as any).score}</Text>
                    </View>
                  )}
                  {moodStats.worstDay && (
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={[styles.moodLegendText, { color: Colors.textSecondary }]}>Worst Day</Text>
                      <Text style={[styles.statValue, { color: Colors.danger, fontSize: FontSize.md, textAlign: 'center' }]}>{formatShortDate((moodStats.worstDay as any).date)}</Text>
                      <Text style={[styles.statLabel, { color: Colors.textSecondary, textAlign: 'center' }]}>score {(moodStats.worstDay as any).score}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={[styles.chartCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
                <Text style={[styles.moodLegendText, { color: Colors.textSecondary, marginBottom: Spacing.sm }]}>Mood Distribution</Text>
                {(['Low', 'Meh', 'Okay', 'Good', 'Great'] as const).map((label, idx) => {
                  const count = moodStats.moodDist[idx];
                  const total = moodStats.moodDist.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? count / total : 0;
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs }}>
                      <Text style={{ width: 32, fontSize: 11, color: Colors.textSecondary }}>{label}</Text>
                      <View style={{ flex: 1, height: 10, backgroundColor: Colors.bg3, borderRadius: 5, overflow: 'hidden' }}>
                        <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', backgroundColor: Colors.accent, borderRadius: 5 }} />
                      </View>
                      <Text style={[styles.statLabel, { color: Colors.textSecondary, width: 24, textAlign: 'right' }]}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </Animated.View>

        {/* Section 2 — Flame Leaderboard */}
        <Animated.View style={[styles.sectionBlock, reveal2]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccentBar, { backgroundColor: Colors.accentBright }]} />
            <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Current Streaks</Text>
          </View>
          {streakLeaderboard.map(({ goal, currentStreak, longestStreak }, rankIdx) => (
            <View
              key={goal.id}
              style={[
                styles.streakLeaderRow,
                {
                  backgroundColor: Colors.bg1,
                  borderColor: hexAlpha(goal.color, currentStreak >= 7 ? 0.35 : 0.18),
                },
                currentStreak >= 30 && Elevation.low,
              ]}
            >
              <Text style={[styles.streakRank, { color: Colors.textDisabled }]}>{rankIdx + 1}</Text>
              <View style={[styles.streakRowIcon, { backgroundColor: hexAlpha(goal.color, 0.15) }]}>
                <Ionicons name={goal.icon as any} size={18} color={goal.color} />
              </View>
              <View style={styles.streakRowInfo}>
                <Text style={[styles.streakRowName, { color: Colors.textPrimary }]}>{goal.name}</Text>
                <Text style={[styles.streakRowBest, { color: Colors.textDisabled }]}>best {longestStreak}d</Text>
              </View>
              <View style={styles.streakRowHero}>
                <StreakFlame streak={currentStreak} size={30} />
                <Text style={[styles.streakHeroNum, { color: currentStreak > 0 ? Colors.warning : Colors.textDisabled }]}>
                  {currentStreak}d
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  title: { fontSize: FontSize.xxl, fontFamily: FontFamily.bold },

  sectionBlock: { gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionAccentBar: { width: 3, height: 16, borderRadius: Radius.full },
  sectionLabel: { ...TextStyle.label },

  statRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, textAlign: 'center' },
  statLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },

  filterSection: { gap: Spacing.xs },
  filterRow: { flexGrow: 0 },
  filterBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, marginRight: Spacing.xs },
  categoryFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  filterText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },

  chartCard: { borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, overflow: 'hidden' },
  chart: { borderRadius: Radius.md, marginLeft: -Spacing.md },
  noData: { textAlign: 'center', padding: Spacing.xl, fontFamily: FontFamily.regular },

  moodLegend: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  moodLegendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  moodLegendDot: { width: 10, height: 10, borderRadius: 5 },
  moodLegendText: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },

  // Flame leaderboard
  streakLeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  streakRank: { width: 24, textAlign: 'center', fontSize: FontSize.sm, fontFamily: FontFamily.bold },
  streakRowIcon: { width: 34, height: 34, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  streakRowInfo: { flex: 1, gap: 2 },
  streakRowName: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  streakRowBest: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  streakRowHero: { alignItems: 'center', gap: 2 },
  streakHeroNum: { fontSize: FontSize.lg, fontFamily: FontFamily.extraBold },
});
