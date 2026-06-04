import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontSize, FontFamily, Radius, Spacing } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';
import type { PlayerStats } from '../../types';

interface Props {
  stats: PlayerStats;
  compact?: boolean;
}

export default function XPBar({ stats, compact }: Props) {
  const { colors: Colors, isLight } = useColors();
  const { level, xpIntoLevel, xpForNextLevel, progressPercent } = stats;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.levelBadge, { backgroundColor: isLight ? Colors.bg3 : Colors.accentDim }]}>
          <Text style={[styles.levelText, { color: Colors.accentBright }]}>Lv {level}</Text>
        </View>
        {!compact && (
          <Text style={[styles.xpText, { color: Colors.textSecondary }]}>
            {xpIntoLevel} / {xpForNextLevel} XP
          </Text>
        )}
      </View>
      <View style={[styles.track, { backgroundColor: Colors.bg3 }]}>
        <View style={[styles.fill, { width: `${Math.min(progressPercent * 100, 100)}%`, backgroundColor: Colors.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  levelText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },
  xpText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  track: {
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
    minWidth: 4,
  },
});
