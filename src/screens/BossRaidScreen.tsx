import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { FontFamily, FontSize, hexAlpha, Radius, Spacing, TextStyle } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import { useRaidStore } from '../store/raidStore';
import { useGoalStore } from '../store/goalStore';
import { useCoinStore } from '../store/coinStore';
import { getBossDefinition } from '../constants/bosses';
import { daysBetween, todayString } from '../utils/dateUtils';
import { formatStatValue } from '../utils/xpUtils';
import AnimatedPressable from '../components/common/AnimatedPressable';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { BossTier, GoalDifficulty } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Debuffs fire on raid days 2, 4, 6
const DEBUFF_DAYS = [2, 4, 6];

const TIER_COLOR: Record<BossTier, string> = {
  normal: '#7B78F2',
  elite: '#E8852A',
  legendary: '#F5C518',
};

const TIER_LABEL: Record<BossTier, string> = {
  normal: 'NORMAL',
  elite: 'ELITE',
  legendary: 'LEGENDARY',
};

const COIN_REWARD: Record<BossTier, number> = {
  normal: 80,
  elite: 150,
  legendary: 250,
};

const DIFFICULTY_BONUS: Record<GoalDifficulty, number> = {
  easy: 0,
  medium: 5,
  hard: 10,
  extreme: 20,
};

function hpBarColor(hpPercent: number): string {
  if (hpPercent > 0.6) return '#DC4545';
  if (hpPercent > 0.3) return '#E8852A';
  return '#F5C518';
}

export default function BossRaidScreen() {
  const { colors: Colors } = useColors();
  const navigation = useNavigation<Nav>();

  const currentBoss = useRaidStore(s => s.currentBoss);
  const damageDealt = useRaidStore(s => s.damageDealt);
  const damageToday = useRaidStore(s => s.damageToday);
  const damageTodayDate = useRaidStore(s => s.damageTodayDate);
  const activeDebuff = useRaidStore(s => s.getActiveDebuff());

  const goals = useGoalStore(s => s.goals);
  const balance = useCoinStore(s => s.balance);

  const animatedHpWidth = useRef(new Animated.Value(1)).current;

  const boss = currentBoss ? getBossDefinition(currentBoss.definitionId) : null;

  const maxHP = currentBoss?.maxHP ?? 1;
  const hpRemaining = Math.max(0, maxHP - damageDealt);
  const hpPercent = hpRemaining / maxHP;
  const hpPct = Math.round(hpPercent * 100);

  useEffect(() => {
    Animated.timing(animatedHpWidth, {
      toValue: hpPercent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [hpPercent]);

  const today = todayString();
  const daysRemaining = currentBoss
    ? Math.max(0, daysBetween(today, currentBoss.endDate))
    : 0;

  const raidDay = currentBoss
    ? daysBetween(currentBoss.startDate, today) + 1
    : 1;

  const todayDamage = damageTodayDate === today ? damageToday : 0;

  const activeGoals = goals.filter(g => !g.isArchived);

  const barColor = hpBarColor(hpPercent);
  const tc = boss ? TIER_COLOR[boss.tier] : Colors.accentBright;

  const hpBarWidth = animatedHpWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!currentBoss || !boss) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="shield-outline" size={48} color={Colors.textDisabled} />
          <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>No active raid right now.</Text>
          <AnimatedPressable onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: Colors.border }]}>
            <Text style={[styles.backBtnText, { color: Colors.textSecondary }]}>Go Back</Text>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 80 }]} showsVerticalScrollIndicator={false}>

        {/* ── Boss Header ─────────────────────────────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: hexAlpha(tc, 0.07), borderColor: hexAlpha(tc, 0.35) }]}>
          <View style={styles.heroTop}>
            <AnimatedPressable onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={24} color={Colors.textSecondary} />
            </AnimatedPressable>
            <Text style={[styles.screenTitle, { color: Colors.textSecondary }]}>Boss Raid</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.bossCenterBlock}>
            <View style={[styles.bossIconWrap, { backgroundColor: hexAlpha(tc, 0.18) }]}>
              <Ionicons name={boss.icon as any} size={48} color={tc} />
            </View>
            <Text style={[styles.bossName, { color: Colors.textPrimary }]}>{boss.name}</Text>
            <View style={[styles.tierBadge, { backgroundColor: hexAlpha(tc, 0.20) }]}>
              <Text style={[styles.tierText, { color: tc }]}>{TIER_LABEL[boss.tier]}</Text>
            </View>
            <Text style={[styles.flavorText, { color: Colors.textSecondary }]}>{boss.flavor}</Text>
          </View>
        </View>

        {/* ── HP Bar ──────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
          <View style={styles.hpHeaderRow}>
            <View style={styles.hpLabelBlock}>
              <Ionicons name="heart" size={14} color={barColor} />
              <Text style={[styles.hpLabel, { color: Colors.textSecondary }]}>HP</Text>
            </View>
            <Text style={[styles.hpNumbers, { color: Colors.textPrimary }]}>
              {formatStatValue(hpRemaining)} / {formatStatValue(maxHP)}
            </Text>
            <Text style={[styles.hpPct, { color: barColor }]}>{hpPct}%</Text>
          </View>
          <View style={[styles.hpTrack, { backgroundColor: hexAlpha(barColor, 0.15) }]}>
            <Animated.View style={[styles.hpFill, { width: hpBarWidth, backgroundColor: barColor }]} />
          </View>
        </View>

        {/* ── Countdown ───────────────────────────────────────────────── */}
        <View style={[styles.countdownCard, { backgroundColor: hexAlpha(tc, 0.07), borderColor: hexAlpha(tc, 0.25) }]}>
          <Ionicons name="time-outline" size={18} color={tc} />
          <Text style={[styles.countdownText, { color: Colors.textPrimary }]}>
            Raid ends in{' '}
            <Text style={{ color: tc, fontFamily: FontFamily.extraBold }}>
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
            </Text>
          </Text>
        </View>

        {/* ── Active Debuff ────────────────────────────────────────────── */}
        {activeDebuff && (
          <View style={[styles.debuffCard, { backgroundColor: hexAlpha(Colors.danger, 0.10), borderColor: hexAlpha(Colors.danger, 0.40) }]}>
            <View style={styles.debuffCardHeader}>
              <Ionicons name="warning" size={16} color={Colors.danger} />
              <Text style={[styles.debuffCardTitle, { color: Colors.danger }]}>Active Debuff</Text>
            </View>
            <Text style={[styles.debuffCardLabel, { color: Colors.textPrimary }]}>{activeDebuff.label}</Text>
          </View>
        )}

        {/* ── Debuff Schedule ──────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.accentBar, { backgroundColor: Colors.danger }]} />
          <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Debuff Schedule</Text>
        </View>
        <View style={[styles.card, { backgroundColor: Colors.bg1, borderColor: Colors.border, gap: Spacing.sm }]}>
          {DEBUFF_DAYS.map(day => {
            const isPast = raidDay > day;
            const isActiveDay = raidDay === day;
            return (
              <View key={day} style={styles.debuffDayRow}>
                <View style={[styles.dayCircle, { backgroundColor: isPast || isActiveDay ? hexAlpha(Colors.danger, 0.20) : Colors.bg3, borderColor: isPast || isActiveDay ? Colors.danger : Colors.border }]}>
                  <Text style={[styles.dayCircleText, { color: isPast || isActiveDay ? Colors.danger : Colors.textDisabled }]}>
                    {day}
                  </Text>
                </View>
                <Text style={[styles.debuffDayLabel, { color: isPast ? Colors.textSecondary : Colors.textPrimary }]}>
                  Day {day} debuff fires
                </Text>
                {isPast && (
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                )}
                {isActiveDay && (
                  <View style={[styles.todayBadge, { backgroundColor: hexAlpha(Colors.danger, 0.18) }]}>
                    <Text style={[styles.todayBadgeText, { color: Colors.danger }]}>TODAY</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Your Damage Stats ────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.accentBar, { backgroundColor: tc }]} />
          <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Your Damage</Text>
        </View>
        <View style={styles.statRow}>
          <View style={[styles.statBox, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <Text style={[styles.statValue, { color: tc }]}>{formatStatValue(todayDamage)}</Text>
            <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Today</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <Text style={[styles.statValue, { color: tc }]}>{formatStatValue(damageDealt)}</Text>
            <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Total</Text>
          </View>
        </View>

        {/* ── Defeat Reward Preview ────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.accentBar, { backgroundColor: '#F5C518' }]} />
          <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Defeat Reward</Text>
        </View>
        <View style={[styles.rewardCard, { backgroundColor: hexAlpha('#F5C518', 0.07), borderColor: hexAlpha('#F5C518', 0.30) }]}>
          <View style={styles.rewardRow}>
            <View style={[styles.rewardIconWrap, { backgroundColor: hexAlpha('#F5C518', 0.20) }]}>
              <Ionicons name="logo-bitcoin" size={22} color="#F5C518" />
            </View>
            <View style={styles.rewardTextBlock}>
              <Text style={[styles.rewardAmount, { color: '#F5C518' }]}>
                +{COIN_REWARD[boss.tier]} Coins
              </Text>
              <Text style={[styles.rewardDesc, { color: Colors.textSecondary }]}>
                Your balance: {formatStatValue(balance)} coins
              </Text>
            </View>
            <View style={[styles.rewardIconWrap, { backgroundColor: hexAlpha(tc, 0.20) }]}>
              <Ionicons name="trophy" size={22} color={tc} />
            </View>
          </View>
          <Text style={[styles.rewardBadgeHint, { color: Colors.textSecondary }]}>
            + Exclusive {boss.tier.charAt(0).toUpperCase() + boss.tier.slice(1)} Boss Slayer badge
          </Text>
        </View>

        {/* ── Your Weapons ─────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.accentBar, { backgroundColor: Colors.accentBright }]} />
          <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Your Weapons</Text>
        </View>
        {activeGoals.length === 0 ? (
          <Text style={[styles.emptyGoalsText, { color: Colors.textDisabled }]}>
            Add goals to deal damage to bosses each day.
          </Text>
        ) : (
          activeGoals.map(goal => {
            const base = 10;
            const bonus = DIFFICULTY_BONUS[goal.difficulty] ?? 0;
            const dmg = base + bonus;
            return (
              <View key={goal.id} style={[styles.weaponRow, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
                <View style={[styles.weaponIcon, { backgroundColor: hexAlpha(goal.color, 0.15) }]}>
                  <Ionicons name={goal.icon as any} size={18} color={goal.color} />
                </View>
                <Text style={[styles.weaponName, { color: Colors.textPrimary }]} numberOfLines={1}>
                  {goal.name}
                </Text>
                <View style={styles.weaponDmgBlock}>
                  <Text style={[styles.weaponDmg, { color: Colors.accentBright }]}>
                    +{dmg} dmg/log
                  </Text>
                  <Text style={[styles.weaponDifficulty, { color: Colors.textDisabled }]}>
                    {goal.difficulty}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },

  // Hero
  heroCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bossCenterBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  bossIconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossName: {
    fontSize: FontSize.xxl,
    fontFamily: FontFamily.extraBold,
    textAlign: 'center',
  },
  tierBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  tierText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.extraBold,
    letterSpacing: 1.2,
  },
  flavorText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
  },

  // Generic card
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },

  // HP
  hpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  hpLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  hpLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hpNumbers: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    marginRight: Spacing.sm,
  },
  hpPct: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.extraBold,
    minWidth: 36,
    textAlign: 'right',
  },
  hpTrack: {
    height: 12,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
    borderRadius: Radius.full,
  },

  // Countdown
  countdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  countdownText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.regular,
  },

  // Debuff card
  debuffCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  debuffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  debuffCardTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debuffCardLabel: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.semiBold,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  accentBar: {
    width: 3,
    height: 16,
    borderRadius: Radius.full,
  },

  // Debuff schedule
  debuffDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  debuffDayLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    flex: 1,
  },
  todayBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  todayBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.extraBold,
    letterSpacing: 0.5,
  },

  // Stat row
  statRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    gap: 2,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontFamily: FontFamily.extraBold,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
  },

  // Reward card
  rewardCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rewardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardTextBlock: {
    flex: 1,
    gap: 2,
  },
  rewardAmount: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.extraBold,
  },
  rewardDesc: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
  },
  rewardBadgeHint: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    fontStyle: 'italic',
  },

  // Weapons
  weaponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  weaponIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
  },
  weaponDmgBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  weaponDmg: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  weaponDifficulty: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    textTransform: 'capitalize',
  },

  // Empty states
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.regular,
  },
  backBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  backBtnText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.semiBold,
  },
  emptyGoalsText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    fontStyle: 'italic',
  },
});
