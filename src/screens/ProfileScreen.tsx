import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useLogStore } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { useGoalStore } from '../store/goalStore';
import { getPlayerStats } from '../logic/xpEngine';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { sumXP } from '../utils/xpUtils';
import { getCategoryStats, CATEGORY_LABELS, CATEGORY_ICONS } from '../utils/categoryXP';
import { shareViewAsImage } from '../utils/shareUtils';
import { BADGE_DEFINITIONS } from '../constants/badges';
import BadgeItem from '../components/common/BadgeItem';
import XPBar from '../components/common/XPBar';
import type { GoalCategory } from '../types';

export default function ProfileScreen() {
  const goals = useGoalStore(s => s.goals);
  const { logs, graceStates } = useLogStore();
  const { earnedBadges } = useBadgeStore();
  const profileCardRef = useRef<View>(null);

  const totalXP = useMemo(() => sumXP(logs), [logs]);
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

  const categoryStats = useMemo(() => getCategoryStats(goals, logs), [goals, logs]);
  const activeCategories = useMemo(
    () => Object.keys(categoryStats) as GoalCategory[],
    [categoryStats]
  );

  const streakBadges = BADGE_DEFINITIONS.filter(b => b.category === 'streak');
  const logBadges = BADGE_DEFINITIONS.filter(b => b.category === 'logs');
  const consistencyBadges = BADGE_DEFINITIONS.filter(b => b.category === 'consistency');
  const levelBadges = BADGE_DEFINITIONS.filter(b => b.category === 'level');
  const cycleBadges = BADGE_DEFINITIONS.filter(b => b.category === 'cycle');

  const totalEarned = earnedBadges.length;
  const totalBadges = BADGE_DEFINITIONS.length;

  const handleShareProfile = async () => {
    try {
      await shareViewAsImage(profileCardRef);
    } catch {
      Alert.alert('Share failed', 'Could not capture profile card.');
    }
  };

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

        {/* Hero card (also used as share target) */}
        <View ref={profileCardRef} collapsable={false} style={styles.heroCardWrap}>
        <LinearGradient
          colors={[Colors.accentDim, Colors.bg1]}
          style={styles.heroCard}
        >
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLevel}>Level {playerStats.level}</Text>
              <Text style={styles.heroXP}>{totalXP.toLocaleString()} Total XP</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareProfile}>
              <Ionicons name="share-social-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={{ width: '100%' }}>
            <XPBar stats={playerStats} />
          </View>
        </LinearGradient>
        </View>

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

        {/* Skill Tracks */}
        {activeCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Skill Tracks</Text>
            <View style={styles.skillGrid}>
              {activeCategories.map(cat => {
                const cs = categoryStats[cat]!;
                return (
                  <View key={cat} style={styles.skillCard}>
                    <View style={styles.skillHeader}>
                      <View style={styles.skillIconWrap}>
                        <Ionicons name={CATEGORY_ICONS[cat] as any} size={18} color={Colors.accentBright} />
                      </View>
                      <View style={styles.skillInfo}>
                        <Text style={styles.skillName}>{CATEGORY_LABELS[cat]}</Text>
                        <Text style={styles.skillGoalCount}>{cs.goalCount} goal{cs.goalCount !== 1 ? 's' : ''}</Text>
                      </View>
                      <View style={styles.skillLevelBadge}>
                        <Text style={styles.skillLevel}>Lv {cs.stats.level}</Text>
                      </View>
                    </View>
                    <XPBar stats={cs.stats} compact />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {renderBadgeSection('Streak Badges', streakBadges)}
        {renderBadgeSection('Log Count Badges', logBadges)}
        {renderBadgeSection('Consistency Badges', consistencyBadges)}
        {renderBadgeSection('Level Badges', levelBadges)}
        {cycleBadges.length > 0 && renderBadgeSection('Milestone Cycle Badges', cycleBadges)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg0 },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  heroCardWrap: { borderRadius: Radius.xl, overflow: 'hidden' },
  heroCard: { padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.accentDim },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  heroLevel: { color: Colors.textPrimary, fontSize: FontSize.xxxl, fontWeight: '800' },
  heroXP: { color: Colors.accentBright, fontSize: FontSize.md },
  shareBtn: { padding: Spacing.xs },
  statRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, backgroundColor: Colors.bg1, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { color: Colors.accentBright, fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSize.xs - 1 },
  section: { gap: Spacing.sm },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  skillGrid: { gap: Spacing.sm },
  skillCard: { backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  skillHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  skillIconWrap: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  skillInfo: { flex: 1 },
  skillName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  skillGoalCount: { color: Colors.textSecondary, fontSize: FontSize.xs },
  skillLevelBadge: { backgroundColor: Colors.accentDim, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  skillLevel: { color: Colors.accentBright, fontSize: FontSize.sm, fontWeight: '700' },
});
