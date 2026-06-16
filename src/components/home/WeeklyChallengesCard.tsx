import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, hexAlpha, Radius, Spacing } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';
import { useLogStore } from '../../store/logStore';
import { useGoalStore } from '../../store/goalStore';
import { useLogStore as _useLogStore } from '../../store/logStore';
import { computeStreakWithGrace } from '../../logic/streakEngine';
import { todayString, addDays, getWeekStart, getISOWeekNumber, getWeekId } from '../../utils/dateUtils';
import { getWeeklySet } from '../../constants/weeklyChallenges';
import { useWeeklyChallengeStore } from '../../store/weeklyChallengeStore';
import { useCoinStore } from '../../store/coinStore';
import { COIN_WEEKLY_CHALLENGE, COIN_WEEKLY_ALL } from '../../constants/xp';
import AnimatedPressable from '../common/AnimatedPressable';
import type { WeeklyChallengeDefinition } from '../../types';

const CHALLENGE_ICONS: Record<string, string> = {
  log_days:      'calendar-outline',
  streak_reach:  'flame-outline',
  log_total:     'flash-outline',
  category_logs: 'grid-outline',
  quit_checkin:  'shield-checkmark-outline',
};

export default function WeeklyChallengesCard() {
  const { colors: Colors } = useColors();
  const [expanded, setExpanded] = useState(true);

  const logs = useLogStore(s => s.logs);
  const graceStates = useLogStore(s => s.graceStates);
  const goals = useGoalStore(s => s.goals);
  const { claimChallenge, hasClaimedChallenge, hasClaimedAll } = useWeeklyChallengeStore();
  const addCoins = useCoinStore(s => s.addCoins);

  const today = todayString();
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 6);
  const weekId = getWeekId(today);
  const weekNum = getISOWeekNumber(today);
  const weekSet = getWeeklySet(weekNum);
  const challenges = weekSet.challenges;

  const daysLeft = Math.max(0, 7 - Math.round((new Date(today).getTime() - new Date(weekStart).getTime()) / 86400000));

  const activeGoals = useMemo(() => goals.filter(g => !g.isArchived), [goals]);

  const progresses = useMemo<Record<string, number>>(() => {
    const weekLogs = logs.filter(l => l.logDate >= weekStart && l.logDate <= weekEnd);

    const distinctDays = new Set(weekLogs.map(l => l.logDate)).size;

    const maxStreak = activeGoals.reduce((max, goal) => {
      const goalLogs = logs.filter(l => l.goalId === goal.id);
      const grace = graceStates[goal.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
      const info = computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);
      return Math.max(max, info.currentStreak);
    }, 0);

    const totalLogs = weekLogs.filter(l => !l.isRelapse).length;

    const result: Record<string, number> = {};
    for (const ch of challenges) {
      if (ch.type === 'log_days') {
        result[ch.id] = distinctDays;
      } else if (ch.type === 'streak_reach') {
        result[ch.id] = maxStreak;
      } else if (ch.type === 'log_total') {
        result[ch.id] = totalLogs;
      } else if (ch.type === 'category_logs') {
        const catGoalIds = new Set(
          activeGoals.filter(g => g.category === ch.category).map(g => g.id)
        );
        result[ch.id] = weekLogs.filter(l => catGoalIds.has(l.goalId) && !l.isRelapse).length;
      } else if (ch.type === 'quit_checkin') {
        const quitGoalIds = new Set(activeGoals.filter(g => g.type === 'quit').map(g => g.id));
        result[ch.id] = weekLogs.filter(l => quitGoalIds.has(l.goalId) && !l.isRelapse).length;
      }
    }
    return result;
  }, [logs, graceStates, activeGoals, challenges, weekStart, weekEnd]);

  const allChallengeIds = challenges.map(c => c.id);
  const allClaimed = hasClaimedAll(weekId, allChallengeIds);
  const allComplete = challenges.every(c => (progresses[c.id] ?? 0) >= c.target);
  const claimedCount = allChallengeIds.filter(id => hasClaimedChallenge(weekId, id)).length;

  const handleClaim = async (ch: WeeklyChallengeDefinition) => {
    if (hasClaimedChallenge(weekId, ch.id)) return;
    await claimChallenge(weekId, ch.id);
    await addCoins(COIN_WEEKLY_CHALLENGE, 'weekly_challenge');
  };

  const handleClaimAll = async () => {
    if (allClaimed) return;
    await claimChallenge(weekId, 'bonus');
    await addCoins(COIN_WEEKLY_ALL, 'weekly_bonus');
  };

  return (
    <View style={[styles.card, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Ionicons name="ribbon-outline" size={16} color={Colors.accentBright} />
          <Text style={[styles.headerTitle, { color: Colors.textPrimary }]}>Weekly Challenges</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.headerSub, { color: Colors.accentBright }]}>
            {expanded ? `${daysLeft}d left` : `${claimedCount}/${challenges.length} · ${daysLeft}d left`}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {expanded && challenges.map(ch => {
        const progress = progresses[ch.id] ?? 0;
        const complete = progress >= ch.target;
        const claimed = hasClaimedChallenge(weekId, ch.id);
        const pct = Math.min(1, progress / ch.target);
        const icon = CHALLENGE_ICONS[ch.type] ?? 'star-outline';

        return (
          <View
            key={ch.id}
            style={[
              styles.row,
              { backgroundColor: Colors.bg2, borderColor: Colors.border },
              claimed && { borderColor: hexAlpha(Colors.success, 0.27), backgroundColor: hexAlpha(Colors.success, 0.04) },
            ]}
          >
            <View style={[
              styles.icon,
              { backgroundColor: Colors.accentDim },
              claimed && { backgroundColor: hexAlpha(Colors.success, 0.13) },
            ]}>
              <Ionicons
                name={(claimed ? 'checkmark' : icon) as any}
                size={16}
                color={claimed ? Colors.success : Colors.accentBright}
              />
            </View>
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={[styles.rowLabel, { color: claimed ? Colors.textDisabled : Colors.textPrimary }]} numberOfLines={1}>
                  {ch.label}
                </Text>
                <Text style={[styles.rowCoins, { color: claimed ? Colors.success : Colors.accentBright }]}>
                  {claimed ? '✓' : `+${COIN_WEEKLY_CHALLENGE} 🪙`}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: Colors.bg3 }]}>
                <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: complete ? Colors.success : Colors.accentBright }]} />
              </View>
              <Text style={[styles.progressLabel, { color: Colors.textDisabled }]}>
                {Math.min(progress, ch.target)}/{ch.target}
              </Text>
            </View>
            {complete && !claimed && (
              <AnimatedPressable
                scale={0.92}
                style={[styles.claimBtn, { backgroundColor: Colors.accent }]}
                onPress={() => handleClaim(ch)}
              >
                <Text style={[styles.claimBtnText, { color: Colors.textPrimary }]}>Claim</Text>
              </AnimatedPressable>
            )}
          </View>
        );
      })}

      {expanded && allComplete && !allClaimed && (
        <AnimatedPressable
          scale={0.97}
          style={[styles.bonusBtn, { backgroundColor: hexAlpha(Colors.warning, 0.13), borderColor: hexAlpha(Colors.warning, 0.35) }]}
          onPress={handleClaimAll}
        >
          <Ionicons name="trophy-outline" size={16} color={Colors.warning} />
          <Text style={[styles.bonusBtnText, { color: Colors.warning }]}>
            Complete all 3 — Claim +{COIN_WEEKLY_ALL} 🪙
          </Text>
        </AnimatedPressable>
      )}

      {expanded && allClaimed && (
        <View style={[styles.allDoneBanner, { backgroundColor: hexAlpha(Colors.success, 0.09) }]}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={[styles.allDoneText, { color: Colors.success }]}>All challenges claimed this week!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerSub: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  rowLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, flex: 1 },
  rowCoins: { fontSize: FontSize.xs, fontFamily: FontFamily.bold },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { fontSize: 9, fontFamily: FontFamily.regular },
  claimBtn: { borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  claimBtnText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold },
  bonusBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1 },
  bonusBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, flex: 1 },
  allDoneBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.sm, padding: Spacing.sm },
  allDoneText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold },
});
