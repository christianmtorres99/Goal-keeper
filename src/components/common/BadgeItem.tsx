import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import type { BadgeDefinition } from '../../types';

interface Props {
  badge: BadgeDefinition;
  earned: boolean;
  earnedAt?: string;
}

export default function BadgeItem({ badge, earned, earnedAt }: Props) {
  return (
    <View style={[styles.container, !earned && styles.locked]}>
      <View style={[styles.iconWrap, { backgroundColor: earned ? Colors.accentDim : Colors.bg3 }]}>
        <Ionicons
          name={badge.icon as any}
          size={28}
          color={earned ? Colors.accentBright : Colors.textDisabled}
        />
        {!earned && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={12} color={Colors.textDisabled} />
          </View>
        )}
      </View>
      <Text style={[styles.label, !earned && styles.labelLocked]} numberOfLines={1}>
        {badge.label}
      </Text>
      {earned && earnedAt ? (
        <Text style={styles.date}>{earnedAt.slice(0, 10)}</Text>
      ) : (
        <Text style={styles.desc} numberOfLines={2}>{badge.description}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 90, alignItems: 'center', gap: Spacing.xs },
  locked: { opacity: 0.5 },
  iconWrap: { width: 60, height: 60, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  lockOverlay: { position: 'absolute', bottom: 4, right: 4 },
  label: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600', textAlign: 'center' },
  labelLocked: { color: Colors.textDisabled },
  date: { color: Colors.textSecondary, fontSize: FontSize.xs - 1, textAlign: 'center' },
  desc: { color: Colors.textDisabled, fontSize: FontSize.xs - 1, textAlign: 'center' },
});
