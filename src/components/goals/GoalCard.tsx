import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import type { Goal, Log, StreakInfo } from '../../types';
import { getPlayerStats, getStreakMultiplier } from '../../logic/xpEngine';
import { sumXP } from '../../utils/xpUtils';
import XPBar from '../common/XPBar';
import { isAlreadyLoggedToday } from '../../logic/streakEngine';
import StreakFlame from '../common/StreakFlame';
import { useLogStore } from '../../store/logStore';
import { getNextStreakBadge, getNextLogBadge } from '../../utils/motivationUtils';

interface Props {
  goal: Goal;
  logs: Log[];
  streakInfo: StreakInfo;
  onPress: () => void;
  onLog: () => void;
  isDragging?: boolean;
  dragHandle?: React.ReactNode;
  isDailyDouble?: boolean;
}

export default function GoalCard({ goal, logs, streakInfo, onPress, onLog, isDragging, dragHandle, isDailyDouble }: Props) {
  const totalXP = sumXP(logs);
  const stats = getPlayerStats(totalXP);
  const loggedToday = isAlreadyLoggedToday(logs);
  const multiplier = getStreakMultiplier(streakInfo.currentStreak);
  const hour = new Date().getHours();
  const isAtRisk = goal.type === 'habit' && !loggedToday && hour >= 12;
  const graceState = useLogStore(s => s.graceStates[goal.id]);
  const graceUsed = graceState?.graceDayUsed ?? false;

  const nextStreakBadge = goal.type === 'habit' ? getNextStreakBadge(streakInfo.currentStreak) : null;
  const nextLogBadge = getNextLogBadge(logs.length);
  const nextBadge = nextStreakBadge ?? nextLogBadge;
  const nextBadgeLabel = nextStreakBadge
    ? `${nextStreakBadge.daysLeft}d to ${nextStreakBadge.name}`
    : nextLogBadge
    ? `${nextLogBadge.logsLeft} logs to ${nextLogBadge.name}`
    : null;

  const streakDisplay = streakInfo.currentStreak === 0 && goal.type === 'habit' && !loggedToday
    ? 'Start!'
    : `${streakInfo.currentStreak}d`;

  return (
    <Pressable
      style={[styles.card, isAtRisk && styles.cardAtRisk, isDragging && styles.cardDragging]}
      onPress={onPress}
    >
      <View style={[styles.colorBar, { backgroundColor: isAtRisk ? Colors.warning : goal.color }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.iconName}>
            <StreakFlame streak={streakInfo.currentStreak} size={34}>
              <Ionicons name={goal.icon as any} size={22} color={goal.color} />
            </StreakFlame>
            <Text style={styles.name} numberOfLines={1}>{goal.name}</Text>
          </View>
          <View style={styles.topRight}>
            {isDailyDouble && (
              <View style={styles.doubleBadge}>
                <Text style={styles.doubleText}>2× ⭐</Text>
              </View>
            )}
            {graceUsed && !isAtRisk && (
              <View style={styles.graceBadge}>
                <Ionicons name="shield-checkmark" size={11} color={Colors.warning} />
                <Text style={styles.graceBadgeText}>Grace</Text>
              </View>
            )}
            {isAtRisk && (
              <View style={styles.atRiskBadge}>
                <Ionicons name="warning" size={11} color={Colors.warning} />
                <Text style={styles.atRiskText}>Log today!</Text>
              </View>
            )}
            <View style={[styles.streakBadge, streakInfo.currentStreak === 0 && styles.streakBadgeInactive]}>
              <Ionicons
                name="flame"
                size={14}
                color={streakInfo.currentStreak > 0 ? Colors.warning : Colors.textDisabled}
              />
              <Text style={[styles.streakText, streakInfo.currentStreak === 0 && styles.streakTextInactive]}>
                {streakDisplay}
              </Text>
            </View>
          </View>
        </View>

        <XPBar stats={stats} compact />

        {nextBadgeLabel && (
          <View style={styles.nextBadgeRow}>
            <Ionicons name="flash" size={10} color={Colors.accentBright} />
            <Text style={styles.nextBadgeText}>{nextBadgeLabel}</Text>
          </View>
        )}

        <View style={styles.bottomRow}>
          {multiplier > 1 && (
            <Text style={styles.multiplier}>{multiplier}× XP</Text>
          )}
          {goal.type === 'milestone' && goal.targetCount && (
            <Text style={styles.milestoneText}>
              {logs.length}/{goal.targetCount} {goal.unit ?? ''}
            </Text>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.logBtn, loggedToday && !goal.allowMultiplePerDay && styles.logBtnDone]}
            onPress={onLog}
            disabled={loggedToday && !goal.allowMultiplePerDay}
          >
            <Ionicons
              name={loggedToday && !goal.allowMultiplePerDay ? 'checkmark-circle' : 'add'}
              size={18}
              color={loggedToday && !goal.allowMultiplePerDay ? Colors.success : Colors.textPrimary}
            />
            <Text style={[styles.logBtnText, loggedToday && !goal.allowMultiplePerDay && styles.logBtnTextDone]}>
              {goal.allowMultiplePerDay ? 'Log+' : loggedToday ? 'Done' : 'Log'}
            </Text>
          </TouchableOpacity>
          {dragHandle && <View style={styles.dragHandle}>{dragHandle}</View>}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardAtRisk: { borderColor: Colors.warning + '66' },
  cardDragging: { opacity: 0.9, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  colorBar: { width: 4 },
  body: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconName: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  name: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  atRiskBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.warning + '22', borderRadius: Radius.sm, paddingHorizontal: 5, paddingVertical: 2 },
  atRiskText: { color: Colors.warning, fontSize: 10, fontWeight: '700' },
  graceBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.warning + '18', borderRadius: Radius.sm, paddingHorizontal: 5, paddingVertical: 2 },
  graceBadgeText: { color: Colors.warning, fontSize: 10, fontWeight: '600' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.bg3, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  streakBadgeInactive: { backgroundColor: Colors.bg3 + '88' },
  streakText: { color: Colors.warning, fontSize: FontSize.sm, fontWeight: '700' },
  streakTextInactive: { color: Colors.textDisabled, fontWeight: '600' },
  nextBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextBadgeText: {
    color: Colors.accentBright,
    fontSize: 11,
    fontWeight: '600',
  },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  multiplier: { color: Colors.accentBright, fontSize: FontSize.xs, fontWeight: '700', backgroundColor: Colors.accentDim, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  milestoneText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  logBtnDone: { backgroundColor: Colors.success + '22', borderWidth: 1, borderColor: Colors.success + '55' },
  logBtnText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
  logBtnTextDone: { color: Colors.success },
  dragHandle: { marginLeft: Spacing.xs },
  doubleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B22', borderRadius: Radius.sm, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: '#F59E0B44' },
  doubleText: { color: '#F59E0B', fontSize: 10, fontWeight: '800' },
});
