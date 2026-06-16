import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FontFamily, FontSize, hexAlpha, Radius, Spacing } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';
import { useRaidStore } from '../../store/raidStore';
import { getBossDefinition } from '../../constants/bosses';
import { daysBetween, todayString } from '../../utils/dateUtils';
import AnimatedPressable from '../common/AnimatedPressable';
import type { BossTier } from '../../types';

interface Props {
  onPress: () => void;
}

function tierColor(tier: BossTier, accentBright: string): string {
  if (tier === 'legendary') return '#F5C518';
  if (tier === 'elite') return '#E8852A';
  return accentBright;
}

function tierLabel(tier: BossTier): string {
  if (tier === 'legendary') return 'LEGENDARY';
  if (tier === 'elite') return 'ELITE';
  return 'NORMAL';
}

function hpBarColor(hpPercent: number): string {
  if (hpPercent > 0.6) return '#DC4545';
  if (hpPercent > 0.3) return '#E8852A';
  return '#F5C518';
}

export default function BossRaidCard({ onPress }: Props) {
  const { colors: Colors } = useColors();

  const currentBoss = useRaidStore(s => s.currentBoss);
  const damageDealt = useRaidStore(s => s.damageDealt);
  const activeDebuff = useRaidStore(s => s.getActiveDebuff());

  const animatedWidth = useRef(new Animated.Value(0)).current;

  const boss = currentBoss ? getBossDefinition(currentBoss.definitionId) : null;

  const maxHP = currentBoss?.maxHP ?? 1;
  const hpRemaining = Math.max(0, maxHP - damageDealt);
  const hpPercent = hpRemaining / maxHP;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: hpPercent,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [hpPercent]);

  const daysRemaining = currentBoss
    ? Math.max(0, daysBetween(todayString(), currentBoss.endDate))
    : 0;

  if (!currentBoss || !boss) return null;

  const tc = tierColor(boss.tier, Colors.accentBright);
  const barColor = hpBarColor(hpPercent);
  const borderColor = hexAlpha(tc, 0.45);
  const bgWash = hexAlpha(tc, 0.06);

  const barWidthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <AnimatedPressable onPress={onPress} style={[styles.card, { backgroundColor: bgWash, borderColor }]}>

      {/* Top row: icon + name + tier badge */}
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: hexAlpha(tc, 0.15) }]}>
          <Ionicons name={boss.icon as any} size={22} color={tc} />
        </View>

        <View style={styles.nameBlock}>
          <Text style={[styles.bossName, { color: Colors.textPrimary }]} numberOfLines={1}>
            {boss.name}
          </Text>
          <View style={[styles.tierBadge, { backgroundColor: hexAlpha(tc, 0.18) }]}>
            <Text style={[styles.tierText, { color: tc }]}>{tierLabel(boss.tier)}</Text>
          </View>
        </View>

        <View style={styles.daysWrap}>
          <Text style={[styles.daysNum, { color: Colors.textPrimary }]}>{daysRemaining}</Text>
          <Text style={[styles.daysLabel, { color: Colors.textSecondary }]}>days left</Text>
        </View>
      </View>

      {/* HP bar */}
      <View style={styles.hpSection}>
        <View style={styles.hpLabelRow}>
          <Text style={[styles.hpLabel, { color: Colors.textSecondary }]}>HP</Text>
          <Text style={[styles.hpNumbers, { color: Colors.textSecondary }]}>
            {hpRemaining.toLocaleString()} / {maxHP.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.hpTrack, { backgroundColor: hexAlpha(barColor, 0.18) }]}>
          <Animated.View
            style={[
              styles.hpFill,
              { width: barWidthInterpolation, backgroundColor: barColor },
            ]}
          />
        </View>
      </View>

      {/* Active debuff warning */}
      {activeDebuff && (
        <View style={[styles.debuffBadge, { backgroundColor: hexAlpha(Colors.danger, 0.15), borderColor: hexAlpha(Colors.danger, 0.35) }]}>
          <Ionicons name="warning-outline" size={12} color={Colors.danger} />
          <Text style={[styles.debuffText, { color: Colors.danger }]} numberOfLines={1}>
            {activeDebuff.label}
          </Text>
        </View>
      )}

      {/* Enter button */}
      <View style={[styles.enterBtn, { backgroundColor: hexAlpha(tc, 0.15), borderColor: hexAlpha(tc, 0.35) }]}>
        <Text style={[styles.enterBtnText, { color: tc }]}>Enter Raid</Text>
        <Ionicons name="arrow-forward" size={14} color={tc} />
      </View>

    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: {
    flex: 1,
    gap: 3,
  },
  bossName: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  tierText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.extraBold,
    letterSpacing: 0.8,
  },
  daysWrap: {
    alignItems: 'center',
  },
  daysNum: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.extraBold,
  },
  daysLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
  },
  hpSection: {
    gap: 4,
  },
  hpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hpLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hpNumbers: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
  },
  hpTrack: {
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  debuffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  debuffText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    flex: 1,
  },
  enterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    marginTop: 2,
  },
  enterBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
});
