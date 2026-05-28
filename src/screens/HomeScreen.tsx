import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
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
import { useGameStore } from '../store/gameStore';
import { useQuestStore } from '../store/questStore';
import { useTodoStore } from '../store/todoStore';
import { useTodoXPStore } from '../store/todoXPStore';
import { useRestDayStore } from '../store/restDayStore';
import { useJournalStore } from '../store/journalStore';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { getPlayerStats } from '../logic/xpEngine';
import { sumXP } from '../utils/xpUtils';
import { todayString, getWeekStart } from '../utils/dateUtils';
import { getTimeGreeting, getUndoToastMessage } from '../utils/motivationUtils';
import { shouldShowRestDayPrompt } from '../utils/restDayEngine';
import { detectMoodSuggestion } from '../utils/moodSuggestions';
import { HOT_STREAK_MIN_DAYS } from '../constants/xp';
import type { Goal } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { BadgeDefinition } from '../types';

import GoalCard from '../components/goals/GoalCard';
import XPBar from '../components/common/XPBar';
import EmptyState from '../components/common/EmptyState';
import BadgeModal from '../components/common/BadgeModal';
import LogNoteModal from '../components/common/LogNoteModal';
import LogCountModal from '../components/common/LogCountModal';
import UndoToast from '../components/common/UndoToast';
import WeeklyReviewScreen from './WeeklyReviewScreen';
import LevelLadderModal from '../components/common/LevelLadderModal';
import LevelUpModal from '../components/common/LevelUpModal';
import DailyQuestsCard from '../components/common/DailyQuestsCard';
import TodoSection from '../components/todos/TodoSection';
import RestDayModal from '../components/home/RestDayModal';
import MoodSuggestionCard from '../components/home/MoodSuggestionCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const WEEKLY_REVIEW_KEY = 'weeklyReviewLastShown';
const TAB_BAR_HEIGHT = 56;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const goals = useGoalStore(s => s.goals);
  const { reorderGoals, loadGoals } = useGoalStore();
  const { logs, graceStates, addLog, removeLog, loadLogs, addBonusXP } = useLogStore();
  const { checkAndAward, loadBadges } = useBadgeStore();
  const dailyDoubleGoalId = useGameStore(s => s.dailyDoubleGoalId);
  const quests = useQuestStore(s => s.quests);

  const [pendingBadges, setPendingBadges] = useState<BadgeDefinition[]>([]);
  const [pendingBonusXP, setPendingBonusXP] = useState(0);
  const [pendingEvents, setPendingEvents] = useState<LogEvent[]>([]);
  const [pendingLevelUp, setPendingLevelUp] = useState<{ oldLevel: number; newLevel: number } | null>(null);
  const [logModalGoalId, setLogModalGoalId] = useState<string | null>(null);
  const [countModalGoalId, setCountModalGoalId] = useState<string | null>(null);

  const [undoVisible, setUndoVisible] = useState(false);
  const [undoLogId, setUndoLogId] = useState<string | null>(null);
  const [undoMessage, setUndoMessage] = useState('');

  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [levelLadderVisible, setLevelLadderVisible] = useState(false);

  const todoXP = useTodoXPStore(s => s.totalXP);

  const restDayStore = useRestDayStore();
  const { bankedRestDays, activeRestDate, dismissCount, loadRestDay, activateRestDay, dismissPrompt } = restDayStore;
  const [restDayModalVisible, setRestDayModalVisible] = useState(false);
  const restDayModalShown = useRef(false);

  const journalEntries = useJournalStore(s => s.entries);
  const [dismissedSuggestionId, setDismissedSuggestionId] = useState<string | null>(null);

  const activeGoals = useMemo(() => goals.filter(g => !g.isArchived), [goals]);
  const hasArchived = useMemo(() => goals.some(g => g.isArchived), [goals]);

  const totalXP = useMemo(() => sumXP(logs) + todoXP, [logs, todoXP]);
  const playerStats = useMemo(() => getPlayerStats(totalXP), [totalXP]);

  const todayLogged = useMemo(() => {
    const today = todayString();
    return new Set(logs.filter(l => l.logDate === today).map(l => l.goalId));
  }, [logs]);

  const questsEarned = useMemo(
    () => quests.filter(q => q.completed).reduce((s, q) => s + q.xpReward, 0),
    [quests],
  );
  const questsAvailable = useMemo(
    () => quests.reduce((s, q) => s + q.xpReward, 0),
    [quests],
  );

  const prevLevelRef = useRef<number>(-1);

  // Detect level-up on XP change
  useEffect(() => {
    if (prevLevelRef.current === -1) {
      prevLevelRef.current = playerStats.level;
      return;
    }
    if (playerStats.level > prevLevelRef.current) {
      setPendingLevelUp({ oldLevel: prevLevelRef.current, newLevel: playerStats.level });
    }
    prevLevelRef.current = playerStats.level;
  }, [playerStats.level]);

  // On mount: claim login bonus, refresh daily double, generate quests, load todos
  useEffect(() => {
    const init = async () => {
      const gs = useGameStore.getState();
      if (gs.checkAndClaimLoginBonus() > 0) {
        await gs.markLoginClaimed();
      }

      const activeIds = useGoalStore.getState().goals.filter(g => !g.isArchived);
      await gs.refreshDailyDouble(activeIds.map(g => g.id));

      await useQuestStore.getState().loadOrGenerate(
        activeIds.map(g => g.id),
        activeIds.map(g => g.name),
      );

      await useTodoStore.getState().loadTodos();
      await useTodoXPStore.getState().load();
      await loadRestDay();
      await useJournalStore.getState().loadEntries();
      const storedDismiss = await AsyncStorage.getItem('moodSuggestionDismissed');
      setDismissedSuggestionId(storedDismiss);
    };
    init();
  }, [loadRestDay]);

  // Auto-show weekly review on Sundays
  useEffect(() => {
    const check = async () => {
      if (new Date().getDay() !== 0) return;
      const lastShown = await AsyncStorage.getItem(WEEKLY_REVIEW_KEY);
      const thisWeek = getWeekStart(todayString());
      if (lastShown !== thisWeek) {
        setShowWeeklyReview(true);
        await AsyncStorage.setItem(WEEKLY_REVIEW_KEY, thisWeek);
      }
    };
    check();
  }, []);

  // Compute max streak across all active goals
  const maxStreak = useMemo(() => {
    return activeGoals.reduce((max, goal) => {
      const goalLogs = logs.filter(l => l.goalId === goal.id);
      const grace = graceStates[goal.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
      const streakInfo = computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);
      return Math.max(max, streakInfo.currentStreak);
    }, 0);
  }, [activeGoals, logs, graceStates]);

  // Auto-show rest day modal once per session when conditions are met
  useEffect(() => {
    if (restDayModalShown.current) return;
    const show = shouldShowRestDayPrompt({
      currentStreak: maxStreak,
      bankedRestDays,
      activeRestDate,
      dismissCount,
    });
    if (show) {
      restDayModalShown.current = true;
      setRestDayModalVisible(true);
    }
  }, [maxStreak, bankedRestDays, activeRestDate, dismissCount]);

  const handleRestDayActivate = useCallback(async () => {
    setRestDayModalVisible(false);
    await activateRestDay();
    const xp = Math.floor(Math.random() * 51) + 100; // 100–150 XP
    setUndoMessage(`Rest Day activated! +${xp} XP — your streak is safe 😌`);
    setUndoVisible(true);
  }, [activateRestDay]);

  const handleRestDayDismiss = useCallback(async () => {
    setRestDayModalVisible(false);
    await dismissPrompt();
  }, [dismissPrompt]);

  const handleLogPress = useCallback((goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal?.type === 'count') {
      setCountModalGoalId(goalId);
    } else {
      setLogModalGoalId(goalId);
    }
  }, [goals]);

  const handleLogConfirm = useCallback(async (note?: string) => {
    const goalId = logModalGoalId;
    setLogModalGoalId(null);
    if (!goalId) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await addLog(goalId, note, undefined, goals.find(g => g.id === goalId)?.allowMultiplePerDay);
    if (!result) return;

    const goalName = goals.find(g => g.id === goalId)?.name ?? '';
    const extraEvents: LogEvent[] = [...result.events];
    let extraXP = 0;
    const gs = useGameStore.getState();
    const qs = useQuestStore.getState();

    // Streak rebuild bonus (1.5× = +50% for 7 days after a broken streak)
    if (result.events.includes('comeback')) {
      await gs.startRebuild(goalId);
    }
    if (gs.isInRebuild(goalId)) {
      const rebuildBonus = Math.round(result.log.xpAwarded * 0.5);
      if (rebuildBonus > 0) {
        await addBonusXP(result.log.id, rebuildBonus);
        extraXP += rebuildBonus;
        if (!extraEvents.includes('streakRebuild')) extraEvents.push('streakRebuild');
      }
    }

    // Apply deferred login bonus to first log of the day
    const loginXP = gs.pendingLoginXP;
    if (loginXP > 0) {
      await addBonusXP(result.log.id, loginXP);
      extraXP += loginXP;
      await useGameStore.getState().clearPendingLoginXP();
    }

    // Daily double bonus (2× = +100% of base XP)
    if (gs.dailyDoubleGoalId === goalId) {
      const ddBonus = result.log.xpAwarded;
      if (ddBonus > 0) {
        await addBonusXP(result.log.id, ddBonus);
        extraXP += ddBonus;
        if (!extraEvents.includes('dailyDouble')) extraEvents.push('dailyDouble');
      }
    }

    // Hot streak bonus: if streak was already active from prior days, +50% per log
    const today = todayString();
    const hotStreakWasActive = gs.hotStreakDays >= HOT_STREAK_MIN_DAYS && gs.lastPerfectDate !== today;
    const todayLoggedAfter = new Set([...logs.filter(l => l.logDate === today).map(l => l.goalId), goalId]);
    const allGoalsLoggedToday = activeGoals.length > 0 && activeGoals.every(g => todayLoggedAfter.has(g.id));
    await gs.checkHotStreak(allGoalsLoggedToday);
    if (hotStreakWasActive) {
      const hotBonus = Math.round(result.log.xpAwarded * 0.5);
      if (hotBonus > 0) {
        await addBonusXP(result.log.id, hotBonus);
        extraXP += hotBonus;
        if (!extraEvents.includes('hotStreak')) extraEvents.push('hotStreak');
      }
    }

    // Update XP streak
    await gs.onXpEarned();

    // Quest progress
    const hour = new Date().getHours();
    qs.markProgress('log_any', goalId);
    if (note?.trim()) qs.markProgress('use_note');
    if (hour < 10) qs.markProgress('early_log');

    // Update log_all quest with the real unique goal count for today
    const uniqueGoalsToday = todayLoggedAfter.size;
    qs.markAllGoals(uniqueGoalsToday);

    // Complete newly satisfied quests and award XP
    const freshQuests = useQuestStore.getState().quests;
    let questXP = 0;
    for (const quest of freshQuests) {
      if (!quest.completed && quest.progress >= quest.target) {
        const reward = qs.complete(quest.id);
        if (reward) questXP += reward.xp;
      }
    }
    if (questXP > 0) {
      await addBonusXP(result.log.id, questXP);
      extraXP += questXP;
    }

    // Badge check
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

    // Undo toast with final XP total
    const totalDisplayXP = result.log.xpAwarded + result.bonusXP + extraXP;
    setUndoLogId(result.log.id);
    setUndoMessage(getUndoToastMessage(goalName, totalDisplayXP, extraEvents));
    setUndoVisible(true);

    if (newBadges.length > 0 || result.bonusXP > 0 || extraXP > 0) {
      setPendingBadges(newBadges);
      setPendingBonusXP(result.bonusXP + extraXP);
      setPendingEvents(extraEvents);
    }
  }, [logModalGoalId, logs, graceStates, playerStats, addLog, addBonusXP, checkAndAward, goals, activeGoals]);

  const handleUndo = useCallback(async () => {
    if (undoLogId) {
      await removeLog(undoLogId);
      setUndoLogId(null);
    }
  }, [undoLogId, removeLog]);

  const handleDragEnd = useCallback(({ data }: { data: Goal[] }) => {
    reorderGoals(data.map(g => g.id));
  }, [reorderGoals]);

  const moodSuggestion = useMemo(() => detectMoodSuggestion(journalEntries), [journalEntries]);
  const showMoodCard = moodSuggestion !== null && moodSuggestion.id !== dismissedSuggestionId;

  const handleDismissMoodSuggestion = useCallback(async () => {
    if (!moodSuggestion) return;
    setDismissedSuggestionId(moodSuggestion.id);
    await AsyncStorage.setItem('moodSuggestionDismissed', moodSuggestion.id);
  }, [moodSuggestion]);

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const allDone = activeGoals.length > 0 && todayLogged.size >= activeGoals.length;
  const greeting = allDone ? 'All done today! 🔥' : getTimeGreeting();

  const todayStr = todayString();
  const countModalGoal = countModalGoalId ? goals.find(g => g.id === countModalGoalId) : null;
  const todayCountTotal = countModalGoalId
    ? logs
        .filter(l => l.goalId === countModalGoalId && l.logDate === todayStr)
        .reduce((sum, l) => sum + ((l as any).count ?? 1), 0)
    : 0;

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
          isDailyDouble={goal.id === dailyDoubleGoalId}
          dragHandle={
            <TouchableOpacity onLongPress={drag} delayLongPress={250} hitSlop={12} style={{ padding: 4 }}>
              <Ionicons name="reorder-two" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          }
        />
      </ScaleDecorator>
    );
  }, [logs, graceStates, navigation, handleLogPress, dailyDoubleGoalId]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]} edges={['top', 'left', 'right']}>
      <DraggableFlatList
        data={activeGoals}
        keyExtractor={g => g.id}
        onDragEnd={handleDragEnd}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.date}>{todayLabel}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Journal')}>
                  <Ionicons name="journal-outline" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
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

            <TouchableOpacity style={styles.xpCard} onPress={() => setLevelLadderVisible(true)} activeOpacity={0.8}>
              <XPBar stats={playerStats} />
              <Text style={styles.xpCaption}>Global Level — all goals combined</Text>
            </TouchableOpacity>

            {showMoodCard && moodSuggestion && (
              <MoodSuggestionCard
                suggestion={moodSuggestion}
                onDismiss={handleDismissMoodSuggestion}
                onOpenJournal={() => navigation.navigate('Journal')}
              />
            )}

            {quests.length > 0 && (
              <DailyQuestsCard
                quests={quests}
                totalEarned={questsEarned}
                totalAvailable={questsAvailable}
              />
            )}

            <TodoSection />

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

      {countModalGoal && (
        <LogCountModal
          visible={!!countModalGoalId}
          goalName={countModalGoal.name}
          goalColor={countModalGoal.color}
          targetCount={(countModalGoal as any).targetCount ?? 1}
          unit={(countModalGoal as any).unit ?? ''}
          todayTotal={todayCountTotal}
          onConfirm={async (count: number, note?: string) => {
            if (!countModalGoalId) return;
            setCountModalGoalId(null);
            await addLog(countModalGoalId, note, undefined, true, count);
          }}
          onCancel={() => setCountModalGoalId(null)}
        />
      )}

      <UndoToast
        visible={undoVisible}
        message={undoMessage}
        onUndo={handleUndo}
        onDismiss={() => setUndoVisible(false)}
        topOffset={insets.top + 8}
      />

      <BadgeModal
        badges={pendingBadges}
        bonusXP={pendingBonusXP}
        events={pendingEvents}
        visible={pendingBadges.length > 0 || pendingBonusXP > 0}
        onClose={() => { setPendingBadges([]); setPendingBonusXP(0); setPendingEvents([]); }}
      />

      <LevelUpModal
        visible={!!pendingLevelUp}
        oldLevel={pendingLevelUp?.oldLevel ?? 0}
        newLevel={pendingLevelUp?.newLevel ?? 1}
        onClose={() => setPendingLevelUp(null)}
      />

      <Modal visible={showWeeklyReview} animationType="slide" onRequestClose={() => setShowWeeklyReview(false)}>
        <WeeklyReviewScreen onClose={() => setShowWeeklyReview(false)} />
      </Modal>

      <LevelLadderModal
        visible={levelLadderVisible}
        currentLevel={playerStats.level}
        onClose={() => setLevelLadderVisible(false)}
      />

      <RestDayModal
        visible={restDayModalVisible}
        streak={maxStreak}
        bankedDays={bankedRestDays}
        dismissCount={dismissCount}
        onActivate={handleRestDayActivate}
        onClose={handleRestDayDismiss}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
