import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { formatCompactDate } from '../../utils/dateUtils';
import { RARITY_COLORS, RARITY_LABELS, RARITY_BG } from '../../constants/badges';
import type { BadgeDefinition } from '../../types';

interface Props {
  badge: BadgeDefinition;
  earned: boolean;
  earnedAt?: string;
  size?: number;
}

export default function BadgeItem({ badge, earned, earnedAt, size = 90 }: Props) {
  const iconWrap = Math.floor(size * 0.76);
  const iconSz   = Math.floor(iconWrap * 0.50);
  const labelSz  = size < 80 ? 9 : 10;
  const rarityColor = RARITY_COLORS[badge.rarity] ?? Colors.textDisabled;

  return (
    <View style={[s.container, { width: size }, !earned && s.locked]}>
      {/* Rarity pip */}
      <View style={[s.rarityPip, { backgroundColor: rarityColor + (earned ? 'FF' : '66') }]} />

      <View style={[
        s.iconWrap,
        {
          width: iconWrap,
          height: iconWrap,
          borderRadius: iconWrap * 0.22,
          backgroundColor: earned ? (RARITY_BG[badge.rarity] ?? Colors.accentDim) : Colors.bg3,
          borderWidth: earned ? (badge.rarity === 'legendary' ? 2 : badge.rarity === 'rare' ? 1.5 : 1) : 0,
          borderColor: earned ? rarityColor : 'transparent',
        },
        earned && badge.rarity === 'legendary' && s.legendaryGlow,
      ]}>
        <Ionicons
          name={badge.icon as any}
          size={iconSz}
          color={earned ? rarityColor : Colors.textDisabled}
        />
        {!earned && (
          <View style={s.lockOverlay}>
            <Ionicons name="lock-closed" size={10} color={Colors.textDisabled} />
          </View>
        )}
        {earned && badge.rarity === 'legendary' && (
          <View style={s.crownWrap}>
            <Ionicons name="star" size={9} color={rarityColor} />
          </View>
        )}
      </View>

      <Text style={[s.label, { fontSize: labelSz, color: earned ? Colors.textPrimary : Colors.textDisabled }]} numberOfLines={1}>
        {badge.label}
      </Text>

      {earned ? (
        earnedAt ? (
          <Text style={[s.sub, { fontSize: labelSz - 1 }]}>{formatCompactDate(earnedAt)}</Text>
        ) : (
          <Text style={[s.rarityTag, { fontSize: labelSz - 1, color: rarityColor }]}>
            {RARITY_LABELS[badge.rarity]}
          </Text>
        )
      ) : (
        <Text style={[s.sub, { fontSize: labelSz - 1 }]} numberOfLines={2}>{badge.description}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { alignItems: 'center', gap: Spacing.xs },
  locked:       { opacity: 0.45 },
  rarityPip:    { width: 6, height: 6, borderRadius: 3, marginBottom: -2 },
  iconWrap:     { alignItems: 'center', justifyContent: 'center' },
  lockOverlay:  { position: 'absolute', bottom: 4, right: 4 },
  crownWrap:    { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.bg0, borderRadius: 8, padding: 1 },
  legendaryGlow: {
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  label:        { fontWeight: '600', textAlign: 'center' },
  sub:          { color: Colors.textDisabled, textAlign: 'center', lineHeight: 13 },
  rarityTag:    { fontWeight: '700', textAlign: 'center' },
});
