import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, hexAlpha, Radius, Spacing } from '../../constants/theme';
import type { Goal, PlayerStats, BadgeDefinition } from '../../types';
import XPBar from './XPBar';

export interface SelectedFeature {
  kind: 'badge' | 'goal';
  id: string;
}

const LEVEL_TIERS = [
  { min: 50, icon: 'infinite',          color: '#FFFFFF', title: 'Transcendent' },
  { min: 45, icon: 'star',              color: '#FFD700', title: 'Mythic'       },
  { min: 40, icon: 'rocket',            color: '#F97316', title: 'Legendary'    },
  { min: 35, icon: 'planet',            color: '#EC4899', title: 'Cosmic'       },
  { min: 30, icon: 'shield-checkmark',  color: '#8B5CF6', title: 'Guardian'     },
  { min: 25, icon: 'diamond',           color: '#06B6D4', title: 'Diamond'      },
  { min: 20, icon: 'trophy',            color: '#EAB308', title: 'Champion'     },
  { min: 15, icon: 'flash',             color: '#3B82F6', title: 'Charged'      },
  { min: 10, icon: 'flame',             color: '#F59E0B', title: 'Blazing'      },
  { min:  5, icon: 'barbell',           color: '#10B981', title: 'Rising'       },
  { min:  1, icon: 'leaf',              color: '#22C55E', title: 'Seedling'     },
] as const;

export function getLevelTier(level: number) {
  return LEVEL_TIERS.find(t => level >= t.min) ?? LEVEL_TIERS[LEVEL_TIERS.length - 1];
}

interface Props {
  inline?: boolean;
  stats: PlayerStats;
  totalXP: number;
  features: SelectedFeature[];
  bgColor: string;
  goals: Goal[];
  badgeDefs: BadgeDefinition[];
}

const ProfileShareCard = forwardRef<View, Props>(
  ({ inline, stats, totalXP, features, bgColor, goals, badgeDefs }, ref) => {
    const tier = getLevelTier(stats.level);

    const filledSlots: (SelectedFeature | null)[] = [
      features[0] ?? null,
      features[1] ?? null,
      features[2] ?? null,
    ];

    const renderSlot = (f: SelectedFeature | null, i: number) => {
      if (!f) {
        return (
          <View key={i} style={styles.featureSlot}>
            <Ionicons name="add-circle-outline" size={24} color="rgba(255,255,255,0.2)" />
            <Text style={styles.featureEmpty}>Choose</Text>
          </View>
        );
      }
      if (f.kind === 'badge') {
        const def = badgeDefs.find(b => b.id === f.id);
        if (!def) return null;
        return (
          <View key={i} style={[styles.featureSlot, { borderColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name={def.icon as any} size={24} color={Colors.accentBright} />
            <Text style={styles.featureLabel} numberOfLines={2}>{def.label}</Text>
          </View>
        );
      }
      const goal = goals.find(g => g.id === f.id);
      if (!goal) return null;
      return (
        <View key={i} style={[styles.featureSlot, { borderColor: hexAlpha(goal.color, 0.27) }]}>
          <Ionicons name={goal.icon as any} size={24} color={goal.color} />
          <Text style={styles.featureLabel} numberOfLines={2}>{goal.name}</Text>
        </View>
      );
    };

    return (
      <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: bgColor }, inline && styles.cardInline]}>
        {/* App branding */}
        <View style={styles.appRow}>
          <Ionicons name="trophy" size={12} color={Colors.accentBright} />
          <Text style={styles.appName}>GOAL KEEPER</Text>
        </View>

        {/* Level icon */}
        <View style={[styles.iconCircle, { borderColor: hexAlpha(tier.color, 0.33), backgroundColor: hexAlpha(tier.color, 0.13) }]}>
          <Ionicons name={tier.icon as any} size={52} color={tier.color} />
        </View>
        <Text style={[styles.tierTitle, { color: tier.color }]}>{tier.title}</Text>

        {/* Level + XP */}
        <Text style={styles.levelNum}>Level {stats.level}</Text>
        <Text style={styles.xpNum}>{totalXP.toLocaleString()} XP</Text>
        <View style={styles.barWrap}>
          <XPBar stats={stats} compact />
        </View>

        <View style={styles.divider} />

        {/* Featured */}
        <Text style={styles.featuredLabel}>FEATURED</Text>
        <View style={styles.featuresRow}>
          {filledSlots.map((f, i) => renderSlot(f, i))}
        </View>

        <Text style={styles.tagline}>Track your goals. Level up your life.</Text>
      </View>
    );
  }
);

export default ProfileShareCard;

const styles = StyleSheet.create({
  card: {
    width: 320,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
    position: 'absolute',
    top: -9999,
    left: 0,
  },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  appName: { color: Colors.accentBright, fontSize: 11, fontFamily: FontFamily.bold, letterSpacing: 2 },
  iconCircle: {
    width: 96, height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  tierTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold, letterSpacing: 1 },
  levelNum: { color: '#FFFFFF', fontSize: 40, fontFamily: FontFamily.extraBold, lineHeight: 44 },
  xpNum: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm },
  barWrap: { width: '100%' },
  divider: { width: '80%', height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: Spacing.xs },
  featuredLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: FontFamily.bold, letterSpacing: 2 },
  featuresRow: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  featureSlot: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureLabel: { color: '#FFFFFF', fontSize: 10, textAlign: 'center', lineHeight: 13 },
  featureEmpty: { color: 'rgba(255,255,255,0.2)', fontSize: 10 },
  tagline: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontStyle: 'italic' },
  cardInline: { position: 'relative', top: 0, left: 0, width: '100%' },
});
