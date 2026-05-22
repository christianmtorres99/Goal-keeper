import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, Modal, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useGoalStore } from '../store/goalStore';
import { useLogStore } from '../store/logStore';
import type { LogEvent } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { getPlayerStats } from '../logic/xpEngine';
import { sumXP } from '../utils/xpUtils';
import { todayString, getWeekStart } from '../utils/dateUtils';
import { getTimeGreeting, getUndoToastMessage } from '../utils/motivationUtils';
import type { Goal } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { BadgeDefinition } from '../types';

import GoalCard from '../components/goals/GoalCard';
import XPBar from '../components/common/XPBar';
import EmptyState from '../components/common/EmptyState';
import BadgeModal from '../components/common/BadgeModal';
import LogNoteModal from '../components/common/LogNoteModal';
import UndoToast from '../components/common/UndoToast';
import WeeklyReviewScreen from './WeeklyReviewScreen';
import LevelLadderModal from '../components/common/LevelLadderModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const WEEKLY_REVIEW_KEY = 'weeklyReviewLastShown';

const TAB_BAR_HEIGHT = 56;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const goals = useGoalStore(s => s.goals);
  const { reorderGoals, loadGoals } = useGoalStore();
  const { logs, graceStates, addLog, removeLog, loadLogs } = useLogStore();
  const { earnedBadges, checkAndAward, loadBadges } = useBadgeStore();

  const [pendingBadges, setPendingBadges] = useState<BadgeDefinition[]>([]);
  const [pendingBonusXP, setPendingBonusXP] = useState(0);
  const [pendingEvents, setPendingEvents] = useState<LogEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Log note modal
  const [logModalGoalId, setLogModalGoalId] = useState<string | null>(null);

  // Undo toast
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoLogId, setUndoLogId] = useState<string | null>(null);
  const [undoMessage, setUndoMessage] = useState('');

  // Weekly review
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);

  // Level ladder modal
  const [levelLadderVisible, setLevelLadderVisible] = useState(false);

  const activeGoals = useMemo(() => goals.filter(g => !g.isArchived), [goals]);
  const hasArchived = useMemo(() => goals.some(g => g.isArchived), [goals]);

  const totalXP = useMemo(() => sumXP(logs), [logs]);
  const playerStats = useMemo(() => getPlayerStats(totalXP), [totalXP]);

  const todayLogged = useMemo(() => {
    const today = todayString();
    return new Set(logs.filter(l => l.logDate === today).map(l => l.goalId));
  }, [logs]);

  // Check if weekly review should auto-show (Sunday)
  useEffect(() => {
    const checkWeeklyReview = async () => {
      const day = new Date().getDay();
      if (day !== 0) return; // Only Sunday
      const lastShown = await AsyncStorage.getItem(WEEKLY_REVIEW_KEY);
      const thisWeek = getWeekStart(todayString());
      if (lastShown !== thisWeek) {
        setShowWeeklyReview(true);
        await AsyncStorage.setItem(WEEKLY_REVIEW_KEY, thisWeek);
      }
    };
    checkWeeklyReview();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGoals();
    await loadLogs();
    await loadBadges();
    setRefreshing(false);
  }, []);

  const handleLogPress = useCallback((goalId: string) => {
    setLogModalGoalId(goalId);
  }, []);

  const handleLogConfirm = useCallback(async (note?: string) => {
    const goalId = logModalGoalId;
    setLogModalGoalId(null);
    if (!goalId) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await addLog(goalId, note, undefined, goals.find(g => g.id === goalId)?.allowMultiplePerDay);
    if (!result) return;

    // Undo toast — event-specific message
    const goalName = goals.find(g => g.id === goalId)?.name ?? '';
    setUndoLogId(result.log.id);
    setUndoMessage(getUndoToastMessage(goalName, result.log.xpAwarded + result.bonusXP, result.events));
    setUndoVisible(true);

    const goalLogs = logs.filter(l => l.goalId === goalId);
    const grace = graceStates[goalId] ?? { graceDayUsed: false, graceDayRefillDate: null };
    const streakInfo = computeStreakWithGrace([...goalLogs, result.log], grace.graceDayUsed, grace.graceDayRefillDate);

    const newBadges = await checkAndAward({
      goalId,
      currentStreak: streakInfo.currentStreak,
      totalLogs: goalLogs.length + 1,
      playerLevel: playerStats.level,
      isPerfectWeek: result.events.includes('perfectWeek'),
      isPerfectMonth: result.events.includes('perfectMonth'),
      isComeback: result.events.includes('comeback'),
      isNewBest: result.events.includes('newBest'),
    });

    if (newBadges.length > 0 || result.bonusXP > 0) {
      setPendingBadges(newBadges);
      setPendingBonusXP(result.bonusXP);
      setPendingEvents(result.events);
    }
  }, [logModalGoalId, logs, graceStates, playerStats, addLog, checkAndAward, goals]);

  const handleUndo = useCallback(async () => {
    if (undoLogId) {
      await removeLog(undoLogId);
      setUndoLogId(null);
    }
  }, [undoLogId, removeLog]);

  const handleDragEnd = useCallback(({ data }: { data: Goal[] }) => {
    reorderGoals(data.map(g => g.id));
  }, [reorderGoals]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const allDone = activeGoals.length > 0 && todayLogged.size >= activeGoals.length;
  const greeting = allDone ? 'All done today! 🔥' : getTimeGreeting();

  const logModalGoal = logModalGoalId ? goals.find(g => g.id === logModalGoalId) : null;
  const logModalStreakInfo = logModalGoalId
    ? (() => {
        const gl = logs.filter(l => l.goalId === logModalGoalId);
        const grace = graceStates[logModalGoalId] ?? { graceDayUsed: false, graceDayRefillDate: null };
        return computeStreakWithGrace(gl, grace.graceDayUsed, grace.graceDayRefillDate);
      })()
    : null;

  const renderItem = useCallback(({ item: goal, drag, isActive }: RenderItemParams<Goal>) => {
    const goalLogs = logs.filter(l => l.goalId === goal.id);
    const grace = graceStates[goal.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
    const streakInfo = computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);

    return (
      <ScaleDecorator>
        <GoalCard
          goal={goal}
          logs={goalLogs}
          streakInfo={streakInfo}
          onPress={() => navigation.navigate('GoalDetail', { goalId: goal.id })}
          onLog={() => handleLogPress(goal.id)}
          isDragging={isActive}
          dragHandle={
            <TouchableOpacity onPressIn={drag} hitSlop={12} style={{ padding: 4 }}>
              <Ionicons name="reorder-two" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          }
        />
      </ScaleDecorator>
    );
  }, [logs, graceStates, navigation, handleLogPress]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <DraggableFlatList
        data={activeGoals}
        keyExtractor={g => g.id}
        onDragEnd={handleDragEnd}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.date}>{today}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setShowWeeklyReview(true)}>
                  <Ionicons name="stats-chart" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                {hasArchived && (
                  <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('ArchivedGoals')}>
                    <Ionicons name="archive-outline" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddGoal', {})}>
                  <Ionicons name="add" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Global XP */}
            <TouchableOpacity style={styles.xpCard} onPress={() => setLevelLadderVisible(true)} activeOpacity={0.8}>
              <XPBar stats={playerStats} />
              <Text style={styles.xpCaption}>Global Level — all goals combined</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionLabel, allDone && styles.sectionLabelDone]}>
              {allDone
                ? `Perfect day — ${todayLogged.size}/${activeGoals.length} logged`
                : `Today — ${todayLogged.size}/${activeGoals.length} logged`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="flag-outline" title="No goals yet" subtitle="Tap + to add your first goal" />
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      />

      {/* Modals & toasts */}
      {logModalGoal && logModalStreakInfo && (
        <LogNoteModal
          visible={!!logModalGoalId}
          goalName={logModalGoal.name}
          goalColor={logModalGoal.color}
          currentStreak={logModalStreakInfo.currentStreak}
          onConfirm={handleLogConfirm}
          onCancel={() => setLogModalGoalId(null)}
        />
      )}

      <UndoToast
        visible={undoVisible}
        message={undoMessage}
        onUndo={handleUndo}
        onDismiss={() => setUndoVisible(false)}
        bottomOffset={TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 8}
      />

      <BadgeModal
        badges={pendingBadges}
        bonusXP={pendingBonusXP}
        events={pendingEvents}
        visible={pendingBadges.length > 0 || pendingBonusXP > 0}
        onClose={() => { setPendingBadges([]); setPendingBonusXP(0); setPendingEvents([]); }}
      />

      <Modal visible={showWeeklyReview} animationType="slide" onRequestClose={() => setShowWeeklyReview(false)}>
        <WeeklyReviewScreen onClose={() => setShowWeeklyReview(false)} />
      </Modal>

      <LevelLadderModal
        visible={levelLadderVisible}
        currentLevel={playerStats.level}
        onClose={() => setLevelLadderVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  headerSection: { gap: Spacing.md, marginBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700' },
  date: { color: Colors.textSecondary, fontSize: FontSize.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBtn: { padding: Spacing.sm },
  addBtn: { backgroundColor: Colors.accent, borderRadius: Radius.full, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  xpCard: { backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  xpCaption: { color: Colors.textDisabled, fontSize: FontSize.xs },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionLabelDone: { color: Colors.success },
});
