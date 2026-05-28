import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useLogStore } from '../store/logStore';
import { useGoalStore } from '../store/goalStore';
import { getPlayerStats } from '../logic/xpEngine';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { sumXP } from '../utils/xpUtils';
import { todayString } from '../utils/dateUtils';
import { getCategoryStats, getCategoryDisplayLabel, CATEGORY_LABELS, CATEGORY_ICONS } from '../utils/categoryXP';
import XPBar from '../components/common/XPBar';
import HeatmapGrid from '../components/charts/HeatmapGrid';
import StreakFlame from '../components/common/StreakFlame';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'SkillTrack'>;

const SCREEN_W = Dimensions.get('window').width;
const HEATMAP_W = SCREEN_W - Spacing.md * 4;

const CATEGORY_COLORS: Record<string, string> = {
  creative: '#EC4899',
  physical: '#F97316',
  learning: '#3B82F6',
  wellness: '#10B981',
  other: '#A855F7',
};

const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SkillTrackScreen({ route }: Props) {
  const { category } = route.params;
  const goals = useGoalStore(s => s.goals);
  const { logs, graceStates } = useLogStore();

  const catColor = CATEGORY_COLORS[category] ?? Colors.accentBright;
  const catLabel = getCategoryDisplayLabel(goals, category);
  const catIcon = CATEGORY_ICONS[category];

  const catGoals = useMemo(
    () => goals.filter(g => !g.isArchived && g.category === category),
    [goals, category]
  );

  const catGoalIds = useMemo(() => new Set(catGoals.map(g => g.id)), [catGoals]);

  const catLogs = useMemo(
    () => logs.filter(l => catGoalIds.has(l.goalId)),
    [logs, catGoalIds]
  );

  const totalXP = useMemo(() => sumXP(catLogs), [catLogs]);
  const playerStats = useMemo(() => getPlayerStats(totalXP), [totalXP]);

  // Per-goal stats
  const goalStats = useMemo(() =>
    catGoals.map(g => {
      const goalLogs = logs.filter(l => l.goalId === g.id);
      const grace = graceStates[g.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
      const streak = computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);
      return { goal: g, logCount: goalLogs.length, streak };
    }).sort((a, b) => b.streak.currentStreak - a.streak.currentStreak),
    [catGoals, logs, graceStates]
  );

  const bestCurrentStreak = useMemo(
    () => goalStats.reduce((m, gs) => Math.max(m, gs.streak.currentStreak), 0),
    [goalStats]
  );

  const bestLongestStreak = useMemo(
    () => goalStats.reduce((m, gs) => Math.max(m, gs.streak.longestStreak), 0),
    [goalStats]
  );

  // Unique days logged in this category
  const uniqueDaysLogged = useMemo(
    () => new Set(catLogs.map(l => l.logDate)).size,
    [catLogs]
  );

  // Most active day of week
  const mostActiveDow = useMemo(() => {
    if (catLogs.length === 0) return null;
    const counts: number[] = Array(7).fill(0);
    catLogs.forEach(l => {
      const dow = new Date(l.logDate + 'T12:00:00').getDay();
      counts[dow]++;
    });
    const maxIdx = counts.indexOf(Math.max(...counts));
    return { name: DOW_NAMES[maxIdx], count: counts[maxIdx] };
  }, [catLogs]);

  // 30-day log rate (unique days in category / 30)
  const logRate30 = useMemo(() => {
    const today = todayString();
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 29);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const days = new Set(catLogs.filter(l => l.logDate >= cutoffStr).map(l => l.logDate)).size;
    return Math.round((days / 30) * 100);
  }, [catLogs]);

  const statsRow = [
    { label: 'Total Logs', value: catLogs.length },
    { label: 'Best Streak', value: bestCurrentStreak > 0 ? `${bestCurrentStreak}d` : '-' },
    { label: 'Longest', value: bestLongestStreak > 0 ? `${bestLongestStreak}d` : '-' },
    { label: 'Days Logged', value: uniqueDaysLogged },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg0 }]} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero header */}
        <View style={[styles.heroCard, { borderColor: catColor + '44' }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
              <Ionicons name={catIcon as any} size={32} color={catColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroCategory}>{catLabel}</Text>
              <Text style={[styles.heroLevel, { color: catColor }]}>Level {playerStats.level}</Text>
              <Text style={styles.heroXP}>{totalXP.toLocaleString()} XP total</Text>
            </View>
            <View style={[styles.levelBadge, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
              <Text style={[styles.levelBadgeText, { color: catColor }]}>Lv {playerStats.level}</Text>
            </View>
          </View>
          <XPBar stats={playerStats} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {statsRow.map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statValue, { color: catColor }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Heatmap */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Activity (Last 13 Weeks)</Text>
          {catLogs.length === 0 ? (
            <Text style={styles.emptyHint}>No logs yet in this category.</Text>
          ) : (
            <HeatmapGrid logs={catLogs} goalColor={catColor} days={91} containerWidth={HEATMAP_W} />
          )}
        </View>

        {/* Goals in this category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Goals</Text>
          {goalStats.map(({ goal, logCount, streak }) => (
            <View key={goal.id} style={styles.goalRow}>
              <View style={[styles.goalIcon, { backgroundColor: goal.color + '22' }]}>
                <Ionicons name={goal.icon as any} size={20} color={goal.color} />
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
                <Text style={styles.goalMeta}>{logCount} log{logCount !== 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.goalStreakWrap}>
                <StreakFlame streak={streak.currentStreak} size={30}>
                  <Ionicons name="flame" size={14} color={streak.currentStreak > 0 ? Colors.warning : Colors.textDisabled} />
                </StreakFlame>
                <Text style={[styles.goalStreak, { color: streak.currentStreak > 0 ? Colors.warning : Colors.textDisabled }]}>
                  {streak.currentStreak}d
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Insights */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Insights</Text>
          <View style={styles.insightGrid}>
            <InsightTile
              icon="calendar-outline"
              label="30-day log rate"
              value={`${logRate30}%`}
              color={catColor}
            />
            {mostActiveDow && (
              <InsightTile
                icon="sunny-outline"
                label="Most active day"
                value={mostActiveDow.name}
                color={catColor}
              />
            )}
            <InsightTile
              icon="flash-outline"
              label="Total XP"
              value={totalXP > 0 ? `${totalXP.toLocaleString()}` : '0'}
              color={catColor}
            />
            <InsightTile
              icon="trophy-outline"
              label="Goals tracked"
              value={`${catGoals.length}`}
              color={catColor}
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function InsightTile({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.insightTile, { borderColor: color + '33' }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.insightValue, { color }]}>{value}</Text>
      <Text style={styles.insightLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  heroCard: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  heroCategory: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800' },
  heroLevel: { fontSize: FontSize.sm, fontWeight: '700' },
  heroXP: { color: Colors.textSecondary, fontSize: FontSize.xs },
  levelBadge: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  levelBadgeText: { fontSize: FontSize.md, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bg1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSize.xs - 1, textAlign: 'center' },

  card: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyHint: { color: Colors.textDisabled, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.md },

  section: { gap: Spacing.sm },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bg1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInfo: { flex: 1 },
  goalName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  goalMeta: { color: Colors.textSecondary, fontSize: FontSize.xs },
  goalStreakWrap: { alignItems: 'center', gap: 2 },
  goalStreak: { fontSize: FontSize.xs, fontWeight: '700' },

  insightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  insightTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
  },
  insightValue: { fontSize: FontSize.lg, fontWeight: '800' },
  insightLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, textAlign: 'center' },
});
