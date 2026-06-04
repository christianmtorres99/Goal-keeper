import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, hexAlpha, Radius, Spacing } from '../../constants/theme';
import type { Goal, StreakInfo, PlayerStats } from '../../types';
import XPBar from './XPBar';

interface Props {
  goal: Goal;
  streakInfo: StreakInfo;
  stats: PlayerStats;
  earnedBadgeCount: number;
}

// forwardRef so parent can pass a ref for view-shot capture
const ShareCard = forwardRef<View, Props>(({ goal, streakInfo, stats, earnedBadgeCount }, ref) => {
  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      <LinearGradient colors={[Colors.bg1, Colors.bg2]} style={styles.gradient}>
        {/* Header */}
        <View style={styles.appHeader}>
          <Ionicons name="trophy" size={16} color={Colors.accentBright} />
          <Text style={styles.appName}>Goal Keeper</Text>
        </View>

        {/* Goal */}
        <View style={styles.goalRow}>
          <View style={[styles.iconWrap, { backgroundColor: hexAlpha(goal.color, 0.20) }]}>
            <Ionicons name={goal.icon as any} size={32} color={goal.color} />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalName}>{goal.name}</Text>
            <Text style={styles.goalCategory}>{goal.category}</Text>
          </View>
        </View>

        {/* Big streak */}
        <View style={styles.streakSection}>
          <Ionicons name="flame" size={40} color={Colors.warning} />
          <Text style={styles.streakNumber}>{streakInfo.currentStreak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>

        {/* Level + badges */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: goal.color }]}>Lv {stats.level}</Text>
            <Text style={styles.statLabel}>level</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.accentBright }]}>{stats.totalXP}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{earnedBadgeCount}</Text>
            <Text style={styles.statLabel}>badges</Text>
          </View>
        </View>

        <View style={styles.xpBarWrap}>
          <XPBar stats={stats} compact />
        </View>

        <Text style={styles.tagline}>Track your goals. Level up your life.</Text>
      </LinearGradient>
    </View>
  );
});

export default ShareCard;

const styles = StyleSheet.create({
  card: { width: 320, borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.accentDim },
  gradient: { padding: Spacing.xl, gap: Spacing.lg },
  appHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  appName: { color: Colors.accentBright, fontSize: FontSize.sm, fontFamily: FontFamily.bold, letterSpacing: 1 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  goalInfo: { flex: 1 },
  goalName: { color: Colors.textPrimary, fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  goalCategory: { color: Colors.textSecondary, fontSize: FontSize.sm, textTransform: 'capitalize' },
  streakSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  streakNumber: { color: Colors.textPrimary, fontSize: 56, fontFamily: FontFamily.extraBold, lineHeight: 64 },
  streakLabel: { color: Colors.textSecondary, fontSize: FontSize.md, marginTop: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontFamily: FontFamily.bold },
  statLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  xpBarWrap: { width: '100%' },
  tagline: { color: Colors.textDisabled, fontSize: FontSize.xs, textAlign: 'center', fontStyle: 'italic' },
});
