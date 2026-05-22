import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { formatCompactDate } from '../../utils/dateUtils';
import type { BadgeDefinition } from '../../types';

interface Props {
  badge: BadgeDefinition;
  earned: boolean;
  earnedAt?: string;
  size?: number; // outer cell width — defaults to 90
}

export default function BadgeItem({ badge, earned, earnedAt, size = 90 }: Props) {
  const iconWrap = Math.floor(size * 0.76);
  const iconSz   = Math.floor(iconWrap * 0.50);
  const labelSz  = size < 80 ? 9 : 10;

  return (
    <View style={[s.container, { width: size }, !earned && s.locked]}>
      <View style={[s.iconWrap, { width: iconWrap, height: iconWrap, borderRadius: iconWrap * 0.22, backgroundColor: earned ? Colors.accentDim : Colors.bg3 }]}>
        <Ionicons
          name={badge.icon as any}
          size={iconSz}
          color={earned ? Colors.accentBright : Colors.textDisabled}
        />
        {!earned && (
          <View style={s.lockOverlay}>
            <Ionicons name="lock-closed" size={10} color={Colors.textDisabled} />
          </View>
        )}
      </View>
      <Text style={[s.label, { fontSize: labelSz }, !earned && s.labelLocked]} numberOfLines={1}>
        {badge.label}
      </Text>
      {earned && earnedAt ? (
        <Text style={[s.sub, { fontSize: labelSz - 1 }]}>{formatCompactDate(earnedAt)}</Text>
      ) : (
        <Text style={[s.sub, { fontSize: labelSz - 1 }]} numberOfLines={2}>{badge.description}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { alignItems: 'center', gap: Spacing.xs },
  locked:      { opacity: 0.45 },
  iconWrap:    { alignItems: 'center', justifyContent: 'center' },
  lockOverlay: { position: 'absolute', bottom: 4, right: 4 },
  label:       { color: Colors.textPrimary, fontWeight: '600', textAlign: 'center' },
  labelLocked: { color: Colors.textDisabled },
  sub:         { color: Colors.textDisabled, textAlign: 'center', lineHeight: 13 },
});
