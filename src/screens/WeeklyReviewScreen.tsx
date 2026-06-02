import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Radius, Spacing } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import { useGoalStore } from '../store/goalStore';
import { useLogStore } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { todayString, addDays, formatCompactDate } from '../utils/dateUtils';
import { sumXP } from '../utils/xpUtils';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { BADGE_DEFINITIONS } from '../constants/badges';

interface Props {
  onClose: () => void;
}

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function WeeklyReviewScreen({ onClose }: Props) {
  const { colors: Colors, isLight } = useColors();
  const allGoals = useGoalStore(s => s.goals);
  const goals = useMemo(() => allGoals.filter(g => !g.isArchived), [allGoals]);
  const { logs, graceStates } = useLogStore();
  const { earnedBadges } = useBadgeStore();

  const today = todayString();
  const weekStart = addDays(today, -6);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const weekLogs = useMemo(() => logs.filter(l => l.logDate >= weekStart && l.logDate <= today), [logs, weekStart, today]);

  const thisWeekXP = useMemo(() => sumXP(weekLogs), [weekLogs]);

  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = addDays(weekStart, -1);
  const lastWeekXP = useMemo(() => sumXP(logs.filter(l => l.logDate >= lastWeekStart && l.logDate <= lastWeekEnd)), [logs]);

  const xpDiff = thisWeekXP - lastWeekXP;

  const newBadgesThisWeek = useMemo(() => {
    const seen = new Set<string>();
    return earnedBadges
      .filter(b => b.earnedAt.slice(0, 10) >= weekStart)
      .filter(b => {
        if (seen.has(b.badgeId)) return false;
        seen.add(b.badgeId);
        return true;
      })
      .map(b => BADGE_DEFINITIONS.find(d => d.id === b.badgeId))
      .filter(Boolean);
  }, [earnedBadges, weekStart]);

  const topStreak = useMemo(() => {
    let best = { name: '', streak: 0 };
    goals.forEach(g => {
      const gl = logs.filter(l => l.goalId === g.id);
      const grace = graceStates[g.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
      const { currentStreak } = computeStreakWithGrace(gl, grace.graceDayUsed, grace.graceDayRefillDate);
      if (currentStreak > best.streak) best = { name: g.name, streak: currentStreak };
    });
    return best;
  }, [goals, logs, graceStates]);

  const totalDaysLogged = new Set(weekLogs.map(l => l.logDate)).size;

  const getMotivation = () => {
    if (totalDaysLogged === 7) return "Perfect week! You showed up every single day. 🔥";
    if (totalDaysLogged >= 5) return "Strong week. Keep that momentum going!";
    if (totalDaysLogged >= 3) return "Good start — aim for one more day next week.";
    return "Every streak starts with a single day. You got this.";
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.bg0 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors.textPrimary }]}>Weekly Review</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.dateRange, { color: Colors.textSecondary }]}>{formatCompactDate(weekStart)} → {formatCompactDate(today)}</Text>

      <ScrollView contentContainerStyle={styles.content}>
        {/* XP this week */}
        <View style={[styles.card, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
          <Text style={[styles.cardLabel, { color: Colors.textSecondary }]}>XP Earned This Week</Text>
          <View style={styles.xpRow}>
            <Text style={[styles.xpBig, { color: Colors.accentBright }]}>{thisWeekXP}</Text>
            {xpDiff !== 0 && (
              <View style={[styles.diffBadge, { backgroundColor: xpDiff > 0 ? Colors.success + '22' : Colors.danger + '22' }]}>
                <Ionicons name={xpDiff > 0 ? 'arrow-up' : 'arrow-down'} size={12} color={xpDiff > 0 ? Colors.success : Colors.danger} />
                <Text style={[styles.diffText, { color: xpDiff > 0 ? Colors.success : Colors.danger }]}>{Math.abs(xpDiff)} vs last week</Text>
              </View>
            )}
          </View>
        </View>

        {/* Per-goal day grid */}
        <View style={[styles.card, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
          <Text style={[styles.cardLabel, { color: Colors.textSecondary }]}>Daily Consistency</Text>
          <View style={styles.dowRow}>
            {DOW.map((d, i) => <Text key={i} style={[styles.dowLabel, { color: Colors.textSecondary }]}>{d}</Text>)}
          </View>
          {goals.map(goal => {
            const loggedDays = new Set(weekLogs.filter(l => l.goalId === goal.id).map(l => l.logDate));
            return (
              <View key={goal.id} style={styles.goalDayRow}>
                <Text style={[styles.goalDayName, { color: Colors.textSecondary }]} numberOfLines={1}>{goal.name}</Text>
                <View style={styles.dayDots}>
                  {weekDays.map(day => (
                    <View key={day} style={[styles.dayDot, { backgroundColor: loggedDays.has(day) ? goal.color : Colors.bg3 }]} />
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Top streak */}
        {topStreak.streak > 0 && (
          <View style={[styles.card, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <Text style={[styles.cardLabel, { color: Colors.textSecondary }]}>Best Streak</Text>
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={24} color={Colors.warning} />
              <Text style={[styles.streakName, { color: Colors.textPrimary }]}>{topStreak.name}</Text>
              <Text style={[styles.streakDays, { color: Colors.warning }]}>{topStreak.streak}d</Text>
            </View>
          </View>
        )}

        {/* New badges */}
        {newBadgesThisWeek.length > 0 && (
          <View style={[styles.card, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <Text style={[styles.cardLabel, { color: Colors.textSecondary }]}>Badges Earned This Week</Text>
            {newBadgesThisWeek.map((b, i) => b && (
              <View key={i} style={styles.badgeRow}>
                <Ionicons name={b.icon as any} size={20} color={Colors.accentBright} />
                <Text style={[styles.badgeName, { color: Colors.textPrimary }]}>{b.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Motivation */}
        <View style={[styles.card, styles.motivationCard, { backgroundColor: Colors.bg1, borderColor: Colors.accentDim }]}>
          <Text style={[styles.motivation, { color: Colors.textPrimary }]}>{getMotivation()}</Text>
        </View>

        <TouchableOpacity style={[styles.closeFullBtn, { backgroundColor: Colors.bg2, borderColor: Colors.border }]} onPress={onClose}>
          <Text style={[styles.closeFullText, { color: Colors.textSecondary }]}>Close Review</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, paddingTop: Spacing.xl },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  closeBtn: { padding: Spacing.sm },
  dateRange: { fontSize: FontSize.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card: { borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1 },
  cardLabel: { fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  xpBig: { fontSize: FontSize.xxxl, fontWeight: '800' },
  diffBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  diffText: { fontSize: FontSize.sm, fontWeight: '600' },
  dowRow: { flexDirection: 'row', paddingLeft: 118 },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: FontSize.xs },
  goalDayRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  goalDayName: { width: 110, fontSize: FontSize.xs },
  dayDots: { flex: 1, flexDirection: 'row', gap: Spacing.xs },
  dayDot: { flex: 1, height: 14, borderRadius: 3 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  streakName: { flex: 1, fontSize: FontSize.md, fontWeight: '600' },
  streakDays: { fontSize: FontSize.xl, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badgeName: { fontSize: FontSize.md },
  motivationCard: { borderWidth: 1 },
  motivation: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
  closeFullBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1 },
  closeFullText: { fontSize: FontSize.md, fontWeight: '600' },
});
