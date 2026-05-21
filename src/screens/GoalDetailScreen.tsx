import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useGoalStore } from '../store/goalStore';
import { useLogStore } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { getPlayerStats } from '../logic/xpEngine';
import { BADGE_DEFINITIONS } from '../constants/badges';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { todayString, addDays, formatShortDate } from '../utils/dateUtils';

import XPBar from '../components/common/XPBar';
import BadgeItem from '../components/common/BadgeItem';
import HeatmapGrid from '../components/charts/HeatmapGrid';

type Route = RouteProp<RootStackParamList, 'GoalDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const W = Dimensions.get('window').width - Spacing.md * 2;

const chartConfig = {
  backgroundGradientFrom: Colors.bg1,
  backgroundGradientTo: Colors.bg1,
  color: (opacity = 1) => `rgba(155, 127, 212, ${opacity})`,
  labelColor: () => Colors.textSecondary,
  decimalPlaces: 0,
  propsForBackgroundLines: { strokeDasharray: '', stroke: Colors.bg3 },
  barPercentage: 0.6,
};

export default function GoalDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { goalId } = route.params;

  const goal = useGoalStore(s => s.goals.find(g => g.id === goalId));
  const archiveGoal = useGoalStore(s => s.archiveGoal);
  const deleteGoal = useGoalStore(s => s.deleteGoal);
  const { logs, graceStates } = useLogStore();
  const { earnedBadges } = useBadgeStore();

  const goalLogs = useMemo(() => logs.filter(l => l.goalId === goalId), [logs, goalId]);
  const grace = graceStates[goalId] ?? { graceDayUsed: false, graceDayRefillDate: null };
  const streakInfo = useMemo(() => computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate), [goalLogs, grace]);
  const totalXP = useMemo(() => goalLogs.reduce((s, l) => s + l.xpAwarded, 0), [goalLogs]);
  const playerStats = useMemo(() => getPlayerStats(totalXP), [totalXP]);

  // Weekly bar chart data — last 8 weeks
  const weeklyData = useMemo(() => {
    const today = todayString();
    const labels: string[] = [];
    const data: number[] = [];
    for (let w = 7; w >= 0; w--) {
      const weekEnd = addDays(today, -w * 7);
      const weekStart = addDays(weekEnd, -6);
      const count = goalLogs.filter(l => l.logDate >= weekStart && l.logDate <= weekEnd).length;
      labels.push(`W${8 - w}`);
      data.push(count);
    }
    return { labels, datasets: [{ data }] };
  }, [goalLogs]);

  const earnedGoalBadges = useMemo(() => {
    const earned = new Set(earnedBadges.filter(b => b.goalId === goalId || b.goalId === null).map(b => b.badgeId));
    const earnedAt: Record<string, string> = {};
    earnedBadges.forEach(b => { earnedAt[b.badgeId] = b.earnedAt; });
    return { earned, earnedAt };
  }, [earnedBadges, goalId]);

  const relevantBadges = BADGE_DEFINITIONS.filter(b => b.category === 'streak' || b.category === 'logs');

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Goal', 'This will permanently delete this goal and all its logs. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteGoal(goalId);
          navigation.goBack();
        }
      }
    ]);
  }, [goalId, deleteGoal, navigation]);

  if (!goal) return null;

  const progressPercent = goal.type === 'milestone' && goal.targetCount
    ? Math.min(goalLogs.length / goal.targetCount * 100, 100)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Goal header */}
        <View style={[styles.heroCard, { borderColor: goal.color + '55' }]}>
          <View style={styles.heroTop}>
            <View style={[styles.iconWrap, { backgroundColor: goal.color + '22' }]}>
              <Ionicons name={goal.icon as any} size={36} color={goal.color} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.goalName}>{goal.name}</Text>
              {goal.description ? <Text style={styles.goalDesc}>{goal.description}</Text> : null}
              <View style={[styles.typeBadge, { backgroundColor: goal.color + '22' }]}>
                <Text style={[styles.typeText, { color: goal.color }]}>
                  {goal.type === 'habit' ? 'Daily Habit' : 'Milestone'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('AddGoal', { goalId })}>
              <Ionicons name="create-outline" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Milestone progress */}
          {progressPercent !== null && (
            <View style={styles.milestoneSection}>
              <View style={styles.milestoneHeader}>
                <Text style={styles.milestoneLabel}>Progress</Text>
                <Text style={styles.milestoneValue}>{goalLogs.length} / {goal.targetCount} {goal.unit ?? ''}</Text>
              </View>
              <View style={styles.milestoneTrack}>
                <View style={[styles.milestoneFill, { width: `${progressPercent}%`, backgroundColor: goal.color }]} />
              </View>
            </View>
          )}

          <XPBar stats={playerStats} />
        </View>

        {/* Stats row */}
        <View style={styles.statRow}>
          {[
            { label: 'Streak', value: `${streakInfo.currentStreak}d` },
            { label: 'Best', value: `${streakInfo.longestStreak}d` },
            { label: 'Total Logs', value: goalLogs.length },
            { label: 'Total XP', value: totalXP },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Grace day indicator */}
        {grace.graceDayUsed && (
          <View style={styles.graceCard}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.warning} />
            <Text style={styles.graceText}>Grace day used — log today to maintain your streak!</Text>
          </View>
        )}

        {/* Weekly chart */}
        <Text style={styles.sectionLabel}>Weekly Activity</Text>
        <View style={styles.chartCard}>
          <BarChart
            data={weeklyData}
            width={W - Spacing.md * 2}
            height={160}
            chartConfig={{ ...chartConfig, color: (o = 1) => goal.color + Math.round(o * 255).toString(16).padStart(2,'0') }}
            style={styles.chart}
            fromZero
            showValuesOnTopOfBars
            yAxisLabel=""
            yAxisSuffix=""
          />
        </View>

        {/* Heatmap */}
        <Text style={styles.sectionLabel}>Activity Map</Text>
        <View style={styles.chartCard}>
          <HeatmapGrid logs={goalLogs} goalColor={goal.color} days={91} />
        </View>

        {/* Badges */}
        <Text style={styles.sectionLabel}>Badges</Text>
        <View style={styles.badgeGrid}>
          {relevantBadges.map(badge => (
            <BadgeItem
              key={badge.id}
              badge={badge}
              earned={earnedGoalBadges.earned.has(badge.id)}
              earnedAt={earnedGoalBadges.earnedAt[badge.id]}
            />
          ))}
        </View>

        {/* Recent logs */}
        <Text style={styles.sectionLabel}>Recent Logs</Text>
        {goalLogs.length === 0 ? (
          <Text style={styles.noLogs}>No logs yet — start logging today!</Text>
        ) : (
          [...goalLogs].reverse().slice(0, 20).map(log => (
            <View key={log.id} style={styles.logRow}>
              <Text style={styles.logDate}>{formatShortDate(log.logDate)}</Text>
              <Text style={styles.logXP}>+{log.xpAwarded} XP</Text>
              {log.note ? <Text style={styles.logNote}>{log.note}</Text> : null}
            </View>
          ))
        )}

        {/* Danger zone */}
        <View style={styles.dangerZone}>
          <TouchableOpacity style={styles.archiveBtn} onPress={() => { archiveGoal(goalId); navigation.goBack(); }}>
            <Ionicons name="archive-outline" size={16} color={Colors.warning} />
            <Text style={styles.archiveBtnText}>Archive Goal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>Delete Goal</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg0 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  heroCard: { backgroundColor: Colors.bg1, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1 },
  heroTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  iconWrap: { width: 60, height: 60, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, gap: 4 },
  goalName: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700' },
  goalDesc: { color: Colors.textSecondary, fontSize: FontSize.sm },
  typeBadge: { alignSelf: 'flex-start', borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  typeText: { fontSize: FontSize.xs, fontWeight: '700' },
  milestoneSection: { gap: Spacing.xs },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  milestoneLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  milestoneValue: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },
  milestoneTrack: { height: 8, backgroundColor: Colors.bg3, borderRadius: Radius.full, overflow: 'hidden' },
  milestoneFill: { height: '100%', borderRadius: Radius.full },
  statRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, backgroundColor: Colors.bg1, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { color: Colors.accentBright, fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  graceCard: { backgroundColor: Colors.warning + '22', borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.warning + '55' },
  graceText: { color: Colors.warning, fontSize: FontSize.sm, flex: 1 },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  chartCard: { backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  chart: { borderRadius: Radius.md, marginLeft: -Spacing.md },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  noLogs: { color: Colors.textDisabled, fontStyle: 'italic' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.bg3 },
  logDate: { color: Colors.textSecondary, fontSize: FontSize.sm, width: 70 },
  logXP: { color: Colors.accentBright, fontSize: FontSize.sm, fontWeight: '600' },
  logNote: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
  dangerZone: { gap: Spacing.sm, marginTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.bg3, paddingTop: Spacing.lg },
  archiveBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.warning + '55' },
  archiveBtnText: { color: Colors.warning, fontSize: FontSize.md },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.danger + '55' },
  deleteBtnText: { color: Colors.danger, fontSize: FontSize.md },
});
