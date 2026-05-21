import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import type { Goal, Log, StreakInfo } from '../../types';
import { getPlayerStats, getStreakMultiplier } from '../../logic/xpEngine';
import XPBar from '../common/XPBar';
import { isAlreadyLoggedToday } from '../../logic/streakEngine';

interface Props {
  goal: Goal;
  logs: Log[];
  streakInfo: StreakInfo;
  totalXP: number;
  onPress: () => void;
  onLog: () => void;
}

export default function GoalCard({ goal, logs, streakInfo, totalXP, onPress, onLog }: Props) {
  const stats = getPlayerStats(totalXP);
  const loggedToday = isAlreadyLoggedToday(logs);
  const multiplier = getStreakMultiplier(streakInfo.currentStreak);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.colorBar, { backgroundColor: goal.color }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.iconName}>
            <Ionicons name={goal.icon as any} size={22} color={goal.color} />
            <Text style={styles.name} numberOfLines={1}>{goal.name}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color={Colors.warning} />
            <Text style={styles.streakText}>{streakInfo.currentStreak}d</Text>
          </View>
        </View>

        <XPBar stats={stats} compact />

        <View style={styles.bottomRow}>
          {multiplier > 1 && (
            <Text style={styles.multiplier}>{multiplier}× XP</Text>
          )}
          <View style={{ flex: 1 }} />
          {goal.type === 'milestone' && goal.targetCount && (
            <Text style={styles.milestoneText}>
              {logs.length}/{goal.targetCount} {goal.unit ?? ''}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.logBtn, loggedToday && styles.logBtnDone]}
            onPress={onLog}
            disabled={loggedToday}
          >
            <Ionicons
              name={loggedToday ? 'checkmark' : 'add'}
              size={18}
              color={loggedToday ? Colors.success : Colors.textPrimary}
            />
            <Text style={[styles.logBtnText, loggedToday && styles.logBtnTextDone]}>
              {loggedToday ? 'Done' : 'Log'}
            </Text>
          </TouchableOpacity>
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
  colorBar: { width: 4 },
  body: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconName: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  name: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.bg3, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  streakText: { color: Colors.warning, fontSize: FontSize.sm, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  multiplier: { color: Colors.accentBright, fontSize: FontSize.xs, fontWeight: '700', backgroundColor: Colors.accentDim, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  milestoneText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  logBtnDone: { backgroundColor: Colors.bg3 },
  logBtnText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
  logBtnTextDone: { color: Colors.success },
});
