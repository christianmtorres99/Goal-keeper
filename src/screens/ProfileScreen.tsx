import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useLogStore } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { useGoalStore } from '../store/goalStore';
import { getPlayerStats } from '../logic/xpEngine';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { BADGE_DEFINITIONS } from '../constants/badges';
import BadgeItem from '../components/common/BadgeItem';
import XPBar from '../components/common/XPBar';

export default function ProfileScreen() {
  const goals = useGoalStore(s => s.goals);
  const { logs, graceStates } = useLogStore();
  const { earnedBadges } = useBadgeStore();

  const totalXP = useMemo(() => logs.reduce((s, l) => s + l.xpAwarded, 0), [logs]);
  const playerStats = useMemo(() => getPlayerStats(totalXP), [totalXP]);

  const longestStreak = useMemo(() => {
    let max = 0;
    goals.forEach(g => {
      const gl = logs.filter(l => l.goalId === g.id);
      const grace = graceStates[g.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
      const { longestStreak } = computeStreakWithGrace(gl, grace.graceDayUsed, grace.graceDayRefillDate);
      if (longestStreak > max) max = longestStreak;
    });
    return max;
  }, [goals, logs, graceStates]);

  const earnedSet = useMemo(() => new Set(earnedBadges.map(b => b.badgeId)), [earnedBadges]);
  const earnedAtMap = useMemo(() => {
    const m: Record<string, string> = {};
    earnedBadges.forEach(b => { m[b.badgeId] = b.earnedAt; });
    return m;
  }, [earnedBadges]);

  const streakBadges = BADGE_DEFINITIONS.filter(b => b.category === 'streak');
  const logBadges = BADGE_DEFINITIONS.filter(b => b.category === 'logs');
  const consistencyBadges = BADGE_DEFINITIONS.filter(b => b.category === 'consistency');
  const levelBadges = BADGE_DEFINITIONS.filter(b => b.category === 'level');

  const totalEarned = earnedBadges.length;
  const totalBadges = BADGE_DEFINITIONS.length;

  const renderBadgeSection = (title: string, badges: typeof BADGE_DEFINITIONS) => (
    <View key={title} style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.badgeGrid}>
        {badges.map(badge => (
          <BadgeItem
            key={badge.id}
            badge={badge}
            earned={earnedSet.has(badge.id)}
            earnedAt={earnedAtMap[badge.id]}
          />
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero card */}
        <LinearGradient colors={[Colors.accentDim, Colors.bg1]} style={styles.heroCard}>
          <Text style={styles.heroLevel}>Level {playerStats.level}</Text>
          <Text style={styles.heroXP}>{totalXP.toLocaleString()} Total XP</Text>
          <View style={{ width: '100%' }}>
            <XPBar stats={playerStats} />
          </View>
        </LinearGradient>

        {/* Stats row */}
        <View style={styles.statRow}>
          {[
            { label: 'Total Logs', value: logs.length },
            { label: 'Best Streak', value: longestStreak + 'd' },
            { label: 'Badges', value: `${totalEarned}/${totalBadges}` },
            { label: 'Goals', value: goals.filter(g => !g.isArchived).length },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {renderBadgeSection('Streak Badges', streakBadges)}
        {renderBadgeSection('Log Count Badges', logBadges)}
        {renderBadgeSection('Consistency Badges', consistencyBadges)}
        {renderBadgeSection('Level Badges', levelBadges)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg0 },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  heroCard: { borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.accentDim },
  heroLevel: { color: Colors.textPrimary, fontSize: FontSize.xxxl, fontWeight: '800' },
  heroXP: { color: Colors.accentBright, fontSize: FontSize.md },
  statRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, backgroundColor: Colors.bg1, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { color: Colors.accentBright, fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSize.xs - 1 },
  section: { gap: Spacing.sm },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
});
