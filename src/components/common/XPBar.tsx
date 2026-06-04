import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { FontSize, FontFamily, Radius, Spacing, hexAlpha } from '../../constants/theme';
import { Timing } from '../../constants/motion';
import { useColors } from '../../hooks/useColors';
import { getLevelTier } from './ProfileShareCard';
import type { PlayerStats } from '../../types';

interface Props {
  stats: PlayerStats;
  compact?: boolean;
}

export default function XPBar({ stats, compact }: Props) {
  const { colors: Colors, isLight } = useColors();
  const { level, xpIntoLevel, xpForNextLevel, progressPercent } = stats;

  const fillAnim = useSharedValue(0);

  useEffect(() => {
    fillAnim.value = withTiming(Math.min(progressPercent, 1), { duration: Timing.slow });
  }, [progressPercent]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillAnim.value * 100}%` as any,
  }));

  if (compact) {
    return (
      <View style={styles.container}>
        <View style={styles.compactHeader}>
          <View style={[styles.levelBadge, { backgroundColor: isLight ? Colors.bg3 : Colors.accentDim }]}>
            <Text style={[styles.levelTextCompact, { color: Colors.accentBright }]}>Lv {level}</Text>
          </View>
        </View>
        <View style={[styles.track, { backgroundColor: Colors.bg3 }]}>
          <Animated.View style={[styles.fill, fillStyle, { backgroundColor: Colors.accent }]} />
        </View>
      </View>
    );
  }

  const tier = getLevelTier(level);

  return (
    <View style={styles.containerFull}>
      <View style={styles.fullHeader}>
        <View>
          <Text style={[styles.levelNumFull, { color: tier.color }]}>{level}</Text>
          <Text style={[styles.tierName, { color: Colors.textDisabled }]}>{tier.title}</Text>
        </View>
        <Text style={[styles.xpText, { color: Colors.textSecondary }]}>
          {xpIntoLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
        </Text>
      </View>
      <View style={[styles.trackFull, { backgroundColor: Colors.bg3 }]}>
        <Animated.View style={[styles.fillFull, fillStyle, { backgroundColor: Colors.accent }]}>
          <View style={[styles.fillHead, { backgroundColor: Colors.accentBright }]} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  compactHeader: { flexDirection: 'row', alignItems: 'center' },
  levelBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  levelTextCompact: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },

  containerFull: { gap: Spacing.sm },
  fullHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  levelNumFull: { fontSize: FontSize.xxl, fontFamily: FontFamily.extraBold, lineHeight: FontSize.xxl * 1.1 },
  tierName: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  xpText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, paddingBottom: 2 },

  track: { height: 8, borderRadius: Radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.full, minWidth: 4 },

  trackFull: { height: 10, borderRadius: Radius.full, overflow: 'hidden' },
  fillFull: { height: '100%', borderRadius: Radius.full, minWidth: 4, position: 'relative' },
  fillHead: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, borderRadius: Radius.full },
});
