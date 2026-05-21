import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import type { PlayerStats } from '../../types';

interface Props {
  stats: PlayerStats;
  compact?: boolean;
}

export default function XPBar({ stats, compact }: Props) {
  const { level, xpIntoLevel, xpForNextLevel, progressPercent } = stats;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Lv {level}</Text>
        </View>
        {!compact && (
          <Text style={styles.xpText}>
            {xpIntoLevel} / {xpForNextLevel} XP
          </Text>
        )}
      </View>
      <View style={styles.track}>
        <LinearGradient
          colors={Colors.xpGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${Math.min(progressPercent * 100, 100)}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelBadge: {
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  levelText: { color: Colors.accentBright, fontSize: FontSize.sm, fontWeight: '700' },
  xpText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  track: {
    height: 8,
    backgroundColor: Colors.bg3,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
    minWidth: 4,
  },
});
