import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useGoalStore } from '../store/goalStore';
import { useLogStore } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { getPlayerStats } from '../logic/xpEngine';
import { todayString } from '../utils/dateUtils';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { BadgeDefinition } from '../types';

import GoalCard from '../components/goals/GoalCard';
import XPBar from '../components/common/XPBar';
import EmptyState from '../components/common/EmptyState';
import BadgeModal from '../components/common/BadgeModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const goals = useGoalStore(s => s.goals);
  const { logs, graceStates, addLog } = useLogStore();
  const { earnedBadges, checkAndAward } = useBadgeStore();

  const [pendingBadges, setPendingBadges] = useState<BadgeDefinition[]>([]);
  const [pendingBonusXP, setPendingBonusXP] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { loadGoals } = useGoalStore();
  const { loadLogs } = useLogStore();
  const { loadBadges } = useBadgeStore();

  const activeGoals = useMemo(() => goals.filter(g => !g.isArchived), [goals]);

  const totalXP = useMemo(() => {
    return logs.reduce((sum, l) => sum + l.xpAwarded, 0);
  }, [logs]);

  const playerStats = useMemo(() => getPlayerStats(totalXP), [totalXP]);

  const todayLogged = useMemo(() => {
    const today = todayString();
    return new Set(logs.filter(l => l.logDate === today).map(l => l.goalId));
  }, [logs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGoals();
    await loadLogs();
    await loadBadges();
    setRefreshing(false);
  }, []);

  const handleLog = useCallback(async (goalId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await addLog(goalId);
    if (!result) return;

    const goalLogs = logs.filter(l => l.goalId === goalId);
    const grace = graceStates[goalId] ?? { graceDayUsed: false, graceDayRefillDate: null };
    const streakInfo = computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);

    const newBadges = await checkAndAward({
      goalId,
      currentStreak: streakInfo.currentStreak,
      totalLogs: goalLogs.length + 1,
      playerLevel: playerStats.level,
      isPerfectWeek: result.events.includes('perfectWeek'),
      isComeback: result.events.includes('comeback'),
      isNewBest: result.events.includes('newBest'),
    });

    if (newBadges.length > 0 || result.bonusXP > 0) {
      setPendingBadges(newBadges);
      setPendingBonusXP(result.bonusXP);
    }
  }, [logs, graceStates, playerStats, addLog, checkAndAward]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Goal Keeper</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddGoal', {})}>
            <Ionicons name="add" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Global XP */}
        <View style={styles.xpCard}>
          <XPBar stats={playerStats} />
          <Text style={styles.xpCaption}>Global Level — all goals combined</Text>
        </View>

        {/* Today's progress */}
        <Text style={styles.sectionLabel}>
          Today — {todayLogged.size}/{activeGoals.length} logged
        </Text>

        {activeGoals.length === 0 ? (
          <EmptyState
            icon="flag-outline"
            title="No goals yet"
            subtitle="Tap + to add your first goal"
          />
        ) : (
          <View style={styles.goalList}>
            {activeGoals.map(goal => {
              const goalLogs = logs.filter(l => l.goalId === goal.id);
              const grace = graceStates[goal.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
              const streakInfo = computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);
              const goalXP = goalLogs.reduce((sum, l) => sum + l.xpAwarded, 0);
              return (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  logs={goalLogs}
                  streakInfo={streakInfo}
                  totalXP={goalXP}
                  onPress={() => navigation.navigate('GoalDetail', { goalId: goal.id })}
                  onLog={() => handleLog(goal.id)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      <BadgeModal
        badges={pendingBadges}
        bonusXP={pendingBonusXP}
        visible={pendingBadges.length > 0 || pendingBonusXP > 0}
        onClose={() => { setPendingBadges([]); setPendingBonusXP(0); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg0 },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700' },
  date: { color: Colors.textSecondary, fontSize: FontSize.sm },
  addBtn: { backgroundColor: Colors.accent, borderRadius: Radius.full, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  xpCard: { backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  xpCaption: { color: Colors.textDisabled, fontSize: FontSize.xs },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  goalList: { gap: Spacing.sm },
});
