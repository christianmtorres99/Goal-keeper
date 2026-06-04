import React, { useMemo, useCallback, useRef, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

import { FontFamily, FontSize, hexAlpha, Radius, Spacing } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import { useGoalStore } from '../store/goalStore';
import { useLogStore } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { getPlayerStats } from '../logic/xpEngine';
import { sumXP } from '../utils/xpUtils';
import { makeChartConfig, hexToRgba } from '../utils/colorUtils';
import { shareViewAsImage } from '../utils/shareUtils';
import { BADGE_DEFINITIONS } from '../constants/badges';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { todayString, addDays, formatShortDate, formatCompactDate, dateFromString } from '../utils/dateUtils';

import XPBar from '../components/common/XPBar';
import BadgeItem from '../components/common/BadgeItem';
import HeatmapGrid from '../components/charts/HeatmapGrid';
import MilestoneCompleteModal from '../components/common/MilestoneCompleteModal';
import ShareCard from '../components/common/ShareCard';
import LogNoteModal from '../components/common/LogNoteModal';

type Route = RouteProp<RootStackParamList, 'GoalDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const W = Dimensions.get('window').width - Spacing.md * 2;
const BADGE_COLS = 4;
const BADGE_SIZE = Math.floor((W - Spacing.md * (BADGE_COLS - 1)) / BADGE_COLS);

export default function GoalDetailScreen() {
  const { colors: Colors, isLight } = useColors();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { goalId } = route.params;

  const goal = useGoalStore(s => s.goals.find(g => g.id === goalId));
  const { archiveGoal, deleteGoal, updateGoal, resetMilestoneLogs } = useGoalStore();
  const { logs, graceStates, removeLog, loadLogs, addLog } = useLogStore();
  const { earnedBadges, checkAndAward } = useBadgeStore();

  const shareCardRef = useRef<View>(null);
  const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);

  useLayoutEffect(() => {
    if (!goal) return;
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={goal.icon as any} size={20} color={goal.color} />
          <Text style={{ color: Colors.textPrimary, fontSize: FontSize.lg, fontFamily: FontFamily.semiBold }}>Details</Text>
        </View>
      ),
    });
  }, [goal, navigation, Colors.textPrimary]);

  // Past-day logging
  const [pastPickerVisible, setPastPickerVisible] = useState(false);
  const [pendingPastDate, setPendingPastDate] = useState<string | null>(null);

  const goalLogs = useMemo(() => logs.filter(l => l.goalId === goalId), [logs, goalId]);
  const grace = graceStates[goalId] ?? { graceDayUsed: false, graceDayRefillDate: null };
  const streakInfo = useMemo(() => computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate), [goalLogs, grace]);
  const totalXP = useMemo(() => sumXP(goalLogs), [goalLogs]);
  const playerStats = useMemo(() => getPlayerStats(totalXP), [totalXP]);

  // Detect milestone completion
  const isMilestoneComplete = !!(
    goal?.type === 'milestone' &&
    goal.targetCount &&
    goalLogs.length >= goal.targetCount &&
    !goal.completedAt
  );

  // Auto-show milestone modal on first completion detection
  React.useEffect(() => {
    if (isMilestoneComplete) {
      updateGoal(goalId, { completedAt: todayString() });
      setMilestoneModalVisible(true);
    }
  }, [isMilestoneComplete]);

  const weeklyData = useMemo(() => {
    const today = todayString();
    const d = dateFromString(today);
    const dow = (d.getDay() + 6) % 7; // Mon=0, Sun=6
    const weekStart = addDays(today, -dow);
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return goalLogs.some(l => l.logDate === date) ? 1 : 0;
    });
    return { labels, datasets: [{ data }] };
  }, [goalLogs]);

  const xpGrowthData = useMemo(() => {
    const today = todayString();
    const DAYS = 30;
    const labels: string[] = [];
    const data: number[] = [];
    let cumXP = 0;
    // Sort logs oldest first for cumulative sum
    const sortedLogs = [...goalLogs].sort((a, b) => a.logDate.localeCompare(b.logDate));
    for (let i = DAYS - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      const dayXP = sortedLogs.filter(l => l.logDate === date).reduce((s, l) => s + l.xpAwarded + l.bonusXp, 0);
      cumXP += dayXP;
      labels.push(i % 10 === 0 ? formatShortDate(date).split(' ')[1] : '');
      data.push(cumXP);
    }
    return { labels, datasets: [{ data, color: (opacity = 1) => hexToRgba(goal?.color ?? '#7B5EA7', opacity), strokeWidth: 2 }] };
  }, [goalLogs, goal?.color]);

  const earnedGoalBadges = useMemo(() => {
    const earned = new Set(earnedBadges.filter(b => b.goalId === goalId || b.goalId === null).map(b => b.badgeId));
    const earnedAt: Record<string, string> = {};
    earnedBadges.forEach(b => { earnedAt[b.badgeId] = b.earnedAt; });
    return { earned, earnedAt };
  }, [earnedBadges, goalId]);

  const earnedBadgeCount = useMemo(() =>
    earnedBadges.filter(b => b.goalId === goalId).length,
    [earnedBadges, goalId]
  );

  const relevantBadges = BADGE_DEFINITIONS.filter(b => b.category === 'streak' || b.category === 'logs' || b.category === 'cycle');

  // Next badge progress per category
  const nextBadgeProgress = useMemo(() => {
    const streakBadges = BADGE_DEFINITIONS.filter(b => b.category === 'streak').sort((a, b) => a.threshold - b.threshold);
    const logsBadges = BADGE_DEFINITIONS.filter(b => b.category === 'logs').sort((a, b) => a.threshold - b.threshold);
    const earned = new Set(earnedBadges.filter(b => b.goalId === goalId).map(b => b.badgeId));

    const nextStreak = streakBadges.find(b => !earned.has(b.id));
    const nextLogs = logsBadges.find(b => !earned.has(b.id));

    return {
      streak: nextStreak ? { badge: nextStreak, current: streakInfo.currentStreak, pct: Math.min(streakInfo.currentStreak / nextStreak.threshold, 1) } : null,
      logs: nextLogs ? { badge: nextLogs, current: goalLogs.length, pct: Math.min(goalLogs.length / nextLogs.threshold, 1) } : null,
    };
  }, [earnedBadges, goalId, streakInfo.currentStreak, goalLogs.length]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Goal', 'This will permanently delete this goal and all its logs. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteGoal(goalId); navigation.goBack(); } },
    ]);
  }, [goalId, deleteGoal, navigation]);

  const handleDeleteLog = useCallback((logId: string) => {
    Alert.alert('Delete Log', 'Remove this log entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeLog(logId) },
    ]);
  }, [removeLog]);

  const handleShare = useCallback(async () => {
    try {
      await shareViewAsImage(shareCardRef);
    } catch (e) {
      Alert.alert('Share failed', 'Could not share at this time.');
    }
  }, []);

  const handleMilestoneRestart = useCallback(async (newTarget: number) => {
    setMilestoneModalVisible(false);
    await resetMilestoneLogs(goalId);
    await updateGoal(goalId, {
      targetCount: newTarget,
      completedAt: undefined,
      cycleCount: (goal?.cycleCount ?? 0) + 1,
    });
    await loadLogs();
  }, [goalId, goal, resetMilestoneLogs, updateGoal, loadLogs]);

  const pastDays = useMemo(() => {
    const today = todayString();
    return Array.from({ length: 30 }, (_, i) => addDays(today, -(i + 1))).reverse();
  }, []);

  const handlePastDayConfirm = useCallback(async (note?: string) => {
    const date = pendingPastDate;
    setPendingPastDate(null);
    if (!date || !goalId) return;
    const result = await addLog(goalId, note, date);
    if (!result) return;
    await checkAndAward({
      goalId,
      currentStreak: streakInfo.currentStreak,
      totalLogs: goalLogs.length + 1,
      playerLevel: playerStats.level,
      isPerfectWeek: false,
      isPerfectMonth: false,
      isComeback: false,
      isNewBest: false,
    });
  }, [pendingPastDate, goalId, addLog, checkAndAward, streakInfo, goalLogs, playerStats]);

  if (!goal) return null;

  const progressPercent = goal.type === 'milestone' && goal.targetCount
    ? Math.min(goalLogs.length / goal.targetCount * 100, 100)
    : null;

  // Guard: goal was deleted while screen is still mounted during navigation
  if (!goal) return null;

  const chartConfig = makeChartConfig(goal.color, Colors.bg1, Colors);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]}>
      {/* Hidden ShareCard for image capture */}
      <View style={styles.offscreen}>
        <ShareCard
          ref={shareCardRef}
          goal={goal}
          streakInfo={streakInfo}
          stats={playerStats}
          earnedBadgeCount={earnedBadgeCount}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Goal header */}
        <View style={[styles.heroCard, { backgroundColor: Colors.bg1, borderColor: hexAlpha(goal.color, 0.33) }]}>
          <View style={styles.heroTop}>
            <View style={[styles.iconWrap, { backgroundColor: hexAlpha(goal.color, 0.13) }]}>
              <Ionicons name={goal.icon as any} size={36} color={goal.color} />
            </View>
            <View style={styles.heroText}>
              <Text style={[styles.goalName, { color: Colors.textPrimary }]}>{goal.name}</Text>
              {goal.description ? <Text style={[styles.goalDesc, { color: Colors.textSecondary }]}>{goal.description}</Text> : null}
              <View style={styles.tagRow}>
                <View style={[styles.typeBadge, { backgroundColor: hexAlpha(goal.color, 0.13) }]}>
                  <Text style={[styles.typeText, { color: goal.color }]}>
                    {goal.type === 'habit' ? 'Daily Habit' : 'Milestone'}
                  </Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: Colors.bg3 }]}>
                  <Ionicons name={require('../utils/categoryXP').CATEGORY_ICONS[goal.category] as any} size={10} color={Colors.textSecondary} />
                  <Text style={[styles.categoryText, { color: Colors.textSecondary }]}>{goal.category}</Text>
                </View>
              </View>
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
                <Ionicons name="share-social-outline" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('AddGoal', { goalId })} style={styles.headerBtn}>
                <Ionicons name="create-outline" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {progressPercent !== null && (
            <View style={styles.milestoneSection}>
              <View style={styles.milestoneHeader}>
                <Text style={[styles.milestoneLabel, { color: Colors.textSecondary }]}>Progress{goal.cycleCount > 0 ? ` · Cycle ${goal.cycleCount + 1}` : ''}</Text>
                <Text style={[styles.milestoneValue, { color: Colors.textPrimary }]}>{goalLogs.length} / {goal.targetCount} {goal.unit ?? ''}</Text>
              </View>
              <View style={[styles.milestoneTrack, { backgroundColor: Colors.bg3 }]}>
                <View style={[styles.milestoneFill, { width: `${progressPercent}%`, backgroundColor: goal.color }]} />
              </View>
            </View>
          )}

          <XPBar stats={playerStats} />
        </View>

        {/* Stats */}
        <View style={styles.statRow}>
          {[
            { label: 'Streak', value: `${streakInfo.currentStreak}d` },
            { label: 'Best', value: `${streakInfo.longestStreak}d` },
            { label: 'Total Logs', value: goalLogs.length },
            { label: 'Total XP', value: totalXP },
          ].map(s => (
            <View key={s.label} style={[styles.statBox, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
              <Text style={[styles.statValue, { color: Colors.accentBright }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {grace.graceDayUsed && (
          <View style={[styles.graceCard, { backgroundColor: hexAlpha(Colors.warning, 0.13), borderColor: hexAlpha(Colors.warning, 0.33) }]}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.warning} />
            <Text style={[styles.graceText, { color: Colors.warning }]}>Grace day used — log today to maintain your streak!</Text>
          </View>
        )}

        {/* Weekly chart */}
        <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>This Week</Text>
        <View style={[styles.chartCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
          <BarChart
            data={weeklyData}
            width={W - Spacing.md * 2}
            height={160}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
            showValuesOnTopOfBars
            yAxisLabel=""
            yAxisSuffix=""
          />
        </View>

        {/* Heatmap */}
        <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Activity Map</Text>
        <View style={[styles.chartCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
          <HeatmapGrid logs={goalLogs} goalColor={goal.color} days={91} containerWidth={W - Spacing.md * 2} />
        </View>

        {/* XP Growth */}
        <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>XP Growth (30 days)</Text>
        <View style={[styles.chartCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
          <LineChart
            data={xpGrowthData}
            width={W - Spacing.md * 2}
            height={140}
            chartConfig={chartConfig}
            style={styles.chart}
            withDots={false}
            withInnerLines={false}
            bezier
            yAxisLabel=""
            yAxisSuffix=" XP"
          />
        </View>

        {/* Badge progress */}
        <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Badges</Text>
        {(nextBadgeProgress.streak || nextBadgeProgress.logs) && (
          <View style={[styles.badgeProgressCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            {nextBadgeProgress.streak && (
              <View style={styles.badgeProgressRow}>
                <Ionicons name={nextBadgeProgress.streak.badge.icon as any} size={16} color={goal.color} />
                <View style={styles.badgeProgressInfo}>
                  <View style={styles.badgeProgressHeader}>
                    <Text style={[styles.badgeProgressLabel, { color: Colors.textPrimary }]}>{nextBadgeProgress.streak.badge.label}</Text>
                    <Text style={[styles.badgeProgressValue, { color: Colors.textSecondary }]}>{nextBadgeProgress.streak.current}/{nextBadgeProgress.streak.badge.threshold}d</Text>
                  </View>
                  <View style={[styles.badgeProgressTrack, { backgroundColor: Colors.bg3 }]}>
                    <View style={[styles.badgeProgressFill, { width: `${nextBadgeProgress.streak.pct * 100}%`, backgroundColor: goal.color }]} />
                  </View>
                </View>
              </View>
            )}
            {nextBadgeProgress.logs && (
              <View style={styles.badgeProgressRow}>
                <Ionicons name={nextBadgeProgress.logs.badge.icon as any} size={16} color={Colors.accentBright} />
                <View style={styles.badgeProgressInfo}>
                  <View style={styles.badgeProgressHeader}>
                    <Text style={[styles.badgeProgressLabel, { color: Colors.textPrimary }]}>{nextBadgeProgress.logs.badge.label}</Text>
                    <Text style={[styles.badgeProgressValue, { color: Colors.textSecondary }]}>{nextBadgeProgress.logs.current}/{nextBadgeProgress.logs.badge.threshold} logs</Text>
                  </View>
                  <View style={[styles.badgeProgressTrack, { backgroundColor: Colors.bg3 }]}>
                    <View style={[styles.badgeProgressFill, { width: `${nextBadgeProgress.logs.pct * 100}%`, backgroundColor: Colors.accentBright }]} />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
        <View style={styles.badgeGrid}>
          {relevantBadges.map(badge => (
            <BadgeItem
              key={badge.id}
              badge={badge}
              earned={earnedGoalBadges.earned.has(badge.id)}
              earnedAt={earnedGoalBadges.earnedAt[badge.id]}
              size={BADGE_SIZE}
            />
          ))}
        </View>

        {/* Log history */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Recent Logs</Text>
          <TouchableOpacity style={[styles.pastDayBtn, { backgroundColor: hexAlpha(Colors.accentDim, 0.33), borderColor: hexAlpha(Colors.accentBright, 0.27) }]} onPress={() => setPastPickerVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="calendar-outline" size={14} color={Colors.accentBright} />
            <Text style={[styles.pastDayBtnText, { color: Colors.accentBright }]}>Log past day</Text>
          </TouchableOpacity>
        </View>
        {goalLogs.length === 0
          ? <Text style={[styles.noLogs, { color: Colors.textDisabled }]}>No logs yet — start logging today!</Text>
          : [...goalLogs].reverse().slice(0, 30).map(log => (
            <View key={log.id} style={[styles.logRow, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
              <Text style={[styles.logDate, { color: Colors.textSecondary }]}>{formatShortDate(log.logDate)}</Text>
              <Text style={[styles.logXP, { color: Colors.accentBright }]}>+{log.xpAwarded + log.bonusXp} XP</Text>
              {log.bonusXp > 0 && <Text style={[styles.logBonus, { color: Colors.success }]}>+{log.bonusXp} bonus</Text>}
              {log.note ? <Text style={[styles.logNote, { color: Colors.textSecondary }]} numberOfLines={1}>{log.note}</Text> : null}
              <TouchableOpacity onPress={() => handleDeleteLog(log.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={14} color={Colors.textDisabled} />
              </TouchableOpacity>
            </View>
          ))
        }

        {/* Danger zone */}
        <View style={[styles.dangerZone, { borderTopColor: Colors.bg3 }]}>
          <TouchableOpacity style={[styles.archiveBtn, { borderColor: hexAlpha(Colors.warning, 0.33) }]} onPress={() => { archiveGoal(goalId); navigation.goBack(); }}>
            <Ionicons name="archive-outline" size={16} color={Colors.warning} />
            <Text style={[styles.archiveBtnText, { color: Colors.warning }]}>Archive Goal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.deleteBtn, { borderColor: hexAlpha(Colors.danger, 0.33) }]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text style={[styles.deleteBtnText, { color: Colors.danger }]}>Delete Goal</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <MilestoneCompleteModal
        visible={milestoneModalVisible}
        goalName={goal.name}
        goalColor={goal.color}
        totalLogs={goalLogs.length}
        currentTarget={goal.targetCount ?? 10}
        cycleCount={goal.cycleCount}
        onRestart={handleMilestoneRestart}
        onArchive={() => { setMilestoneModalVisible(false); archiveGoal(goalId); navigation.goBack(); }}
      />

      {/* Past-day picker modal */}
      <Modal visible={pastPickerVisible} transparent animationType="fade" onRequestClose={() => setPastPickerVisible(false)}>
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setPastPickerVisible(false)} />
          <View style={[styles.pickerSheet, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <View style={[styles.pickerHandle, { backgroundColor: Colors.bg3 }]} />
            <Text style={[styles.pickerTitle, { color: Colors.textPrimary }]}>Log a Past Day</Text>
            <Text style={[styles.pickerSubtitle, { color: Colors.textSecondary }]}>Tap a day you forgot to log</Text>
            <FlatList
              data={pastDays}
              keyExtractor={d => d}
              numColumns={7}
              scrollEnabled={false}
              renderItem={({ item: dateStr }) => {
                const logged = goalLogs.some(l => l.logDate === dateStr);
                const [, , dd] = dateStr.split('-');
                return (
                  <TouchableOpacity
                    style={[styles.dayCell, { backgroundColor: Colors.bg2, borderColor: Colors.border }, logged && { backgroundColor: hexAlpha(goal.color, 0.20), borderColor: goal.color }]}
                    onPress={() => {
                      if (!logged) {
                        setPastPickerVisible(false);
                        setPendingPastDate(dateStr);
                      }
                    }}
                    disabled={logged}
                  >
                    <Text style={[styles.dayCellNum, { color: Colors.textPrimary }, logged && { color: goal.color }]}>{parseInt(dd, 10)}</Text>
                    {logged && <View style={[styles.dayCellDot, { backgroundColor: goal.color }]} />}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={[styles.pickerCancelBtn, { backgroundColor: Colors.bg2, borderColor: Colors.border }]} onPress={() => setPastPickerVisible(false)}>
              <Text style={[styles.pickerCancelText, { color: Colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Note modal for past-day log */}
      {pendingPastDate && (
        <LogNoteModal
          visible={!!pendingPastDate}
          goalName={goal.name}
          goalColor={goal.color}
          currentStreak={streakInfo.currentStreak}
          pastDate={pendingPastDate}
          onConfirm={handlePastDayConfirm}
          onCancel={() => setPendingPastDate(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  offscreen: { position: 'absolute', top: -9999, left: -9999 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  heroCard: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1 },
  heroTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  iconWrap: { width: 60, height: 60, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, gap: Spacing.xs },
  goalName: { fontSize: FontSize.xl, fontFamily: FontFamily.bold },
  goalDesc: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  tagRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  typeText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold },
  categoryText: { fontSize: FontSize.xs, textTransform: 'capitalize', fontFamily: FontFamily.regular },
  heroActions: { flexDirection: 'row', gap: Spacing.xs },
  headerBtn: { padding: Spacing.sm },
  milestoneSection: { gap: Spacing.xs },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  milestoneLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  milestoneValue: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  milestoneTrack: { height: 8, borderRadius: Radius.full, overflow: 'hidden' },
  milestoneFill: { height: '100%', borderRadius: Radius.full },
  statRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  statLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  graceCard: { borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', borderWidth: 1 },
  graceText: { fontSize: FontSize.sm, flex: 1, fontFamily: FontFamily.regular },
  sectionLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  chartCard: { borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, overflow: 'hidden' },
  chart: { borderRadius: Radius.md, marginLeft: -Spacing.md },
  badgeProgressCard: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md, borderWidth: 1 },
  badgeProgressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badgeProgressInfo: { flex: 1, gap: Spacing.xs },
  badgeProgressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  badgeProgressLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  badgeProgressValue: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  badgeProgressTrack: { height: 6, borderRadius: Radius.full, overflow: 'hidden' },
  badgeProgressFill: { height: '100%', borderRadius: Radius.full },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pastDayBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: 4, paddingHorizontal: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1 },
  pastDayBtnText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold },
  noLogs: { fontStyle: 'italic', fontFamily: FontFamily.regular },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.md, marginBottom: 4, borderWidth: 1 },
  logDate: { fontSize: FontSize.sm, width: 66, fontFamily: FontFamily.regular },
  logXP: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  logBonus: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  logNote: { fontSize: FontSize.sm, flex: 1, fontFamily: FontFamily.regular },
  // Past-day picker styles
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerSheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, borderTopWidth: 1 },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  pickerTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  pickerSubtitle: { fontSize: FontSize.sm, marginBottom: Spacing.sm, fontFamily: FontFamily.regular },
  dayCell: { flex: 1, aspectRatio: 1, margin: 3, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dayCellNum: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  dayCellDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  pickerCancelBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, marginTop: Spacing.sm },
  pickerCancelText: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  dangerZone: { gap: Spacing.sm, marginTop: Spacing.lg, borderTopWidth: 1, paddingTop: Spacing.lg },
  archiveBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  archiveBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.regular },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  deleteBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.regular },
});
