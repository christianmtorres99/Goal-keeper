import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, hexAlpha, Radius, Spacing } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';
import { formatCompactDate } from '../../utils/dateUtils';
import { RARITY_COLORS, RARITY_LABELS, RARITY_BG } from '../../constants/badges';
import type { BadgeDefinition } from '../../types';

interface Props {
  badge: BadgeDefinition;
  earned: boolean;
  earnedAt?: string;
  size?: number;
}

export default function BadgeItem({ badge, earned, earnedAt, size = 110 }: Props) {
  const { colors: Colors } = useColors();
  const iconWrap = Math.floor(size * 0.76);
  const iconSz   = Math.floor(iconWrap * 0.50);
  const labelSz  = size < 80 ? 9 : 10;
  const rarityColor = RARITY_COLORS[badge.rarity] ?? Colors.textDisabled;

  return (
    <View style={[s.container, { width: size }, !earned && s.locked]}>
      {/* Rarity pip */}
      <View style={[s.rarityPip, { backgroundColor: earned ? rarityColor : hexAlpha(rarityColor, 0.40) }]} />

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
        earned && badge.rarity === 'legendary' && {
          shadowColor: Colors.warning,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
          elevation: 6,
        },
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
          <View style={[s.crownWrap, { backgroundColor: Colors.bg0 }]}>
            <Ionicons name="star" size={9} color={rarityColor} />
          </View>
        )}
      </View>

      <Text style={[s.label, { fontSize: labelSz, color: earned ? Colors.textPrimary : Colors.textDisabled }]} numberOfLines={1}>
        {badge.label}
      </Text>

      {/* Rarity pill — always visible */}
      <View style={[
        s.rarityPill,
        {
          backgroundColor: hexAlpha(rarityColor, earned ? 0.18 : 0.08),
          borderColor: hexAlpha(rarityColor, earned ? 0.50 : 0.25),
        },
      ]}>
        <Text style={[s.rarityPillText, { fontSize: labelSz - 2, color: earned ? rarityColor : hexAlpha(rarityColor, 0.60) }]}>
          {RARITY_LABELS[badge.rarity]}
        </Text>
      </View>

      {/* Earned date — below pill */}
      {earned && earnedAt && (
        <Text style={[s.sub, { fontSize: labelSz - 1, color: Colors.textDisabled }]}>
          {formatCompactDate(earnedAt)}
        </Text>
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
  crownWrap:    { position: 'absolute', top: -4, right: -4, borderRadius: 8, padding: 1 },
  label:        { fontFamily: FontFamily.semiBold, textAlign: 'center' },
  rarityPill:   { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2 },
  rarityPillText: { fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  sub:          { textAlign: 'center', lineHeight: 13 },
});
