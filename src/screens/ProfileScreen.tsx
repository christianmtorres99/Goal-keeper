import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useLogStore } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { useGoalStore } from '../store/goalStore';
import { getPlayerStats } from '../logic/xpEngine';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { sumXP } from '../utils/xpUtils';
import { getCategoryStats, CATEGORY_LABELS, CATEGORY_ICONS } from '../utils/categoryXP';
import { shareViewAsImage } from '../utils/shareUtils';
import { BADGE_DEFINITIONS } from '../constants/badges';
import BadgeItem from '../components/common/BadgeItem';
import XPBar from '../components/common/XPBar';
import ProfileShareCard, { getLevelTier } from '../components/common/ProfileShareCard';
import type { SelectedFeature } from '../components/common/ProfileShareCard';
import type { GoalCategory } from '../types';

const PREFS_KEY = 'shareCardPrefs';

// Badge grid — 4 columns on normal screens, 3 on very small ones
const SCREEN_W   = Dimensions.get('window').width;
const NUM_COLS   = SCREEN_W < 360 ? 3 : 4;
const BADGE_GAP  = Spacing.xs;            // 4 px gap between cells
const BADGE_SIZE = Math.floor(
  (SCREEN_W - Spacing.md * 2 - BADGE_GAP * (NUM_COLS - 1)) / NUM_COLS
);

const SHARE_BG_COLORS = [
  '#1A0A2E',  // deep purple
  '#0D1B2A',  // midnight navy
  '#0D2818',  // forest dark
  '#2E0D0D',  // dark crimson
  '#0D2A2A',  // dark teal
  '#1A1A1A',  // charcoal
  '#1A1430',  // indigo night
  '#2A1A0D',  // dark amber
];

export default function ProfileScreen() {
  const goals = useGoalStore(s => s.goals);
  const { logs, graceStates } = useLogStore();
  const { earnedBadges } = useBadgeStore();
  const shareCardRef = useRef<View>(null);

  const [features, setFeatures] = useState<SelectedFeature[]>([]);
  const [bgColor, setBgColor] = useState(SHARE_BG_COLORS[0]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const activeGoals = useMemo(() => goals.filter(g => !g.isArchived), [goals]);

  const totalXP = useMemo(() => sumXP(logs), [logs]);
  const playerStats = useMemo(() => getPlayerStats(totalXP), [totalXP]);
  const tier = useMemo(() => getLevelTier(playerStats.level), [playerStats.level]);

  const longestStreak = useMemo(() => {
    let max = 0;
    goals.forEach(g => {
      const gl = logs.filter(l => l.goalId === g.id);
      const grace = graceStates[g.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
      const { longestStreak } = computeStreakWithGrace(gl, grace.graceDayUsed, grace.graceDayRefillDate);
      if (longestStreak > max) max = longestStreak;
    });
    return max;
  }, [goals, logs, graceStates]);

  const earnedSet = useMemo(() => new Set(earnedBadges.map(b => b.badgeId)), [earnedBadges]);
  const earnedAtMap = useMemo(() => {
    const m: Record<string, string> = {};
    earnedBadges.forEach(b => { m[b.badgeId] = b.earnedAt; });
    return m;
  }, [earnedBadges]);

  const categoryStats = useMemo(() => getCategoryStats(goals, logs), [goals, logs]);
  const activeCategories = useMemo(() => Object.keys(categoryStats) as GoalCategory[], [categoryStats]);

  // Load prefs
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then(raw => {
      if (!raw) return;
      try {
        const p = JSON.parse(raw);
        if (p.features) setFeatures(p.features);
        if (p.bgColor) setBgColor(p.bgColor);
      } catch {}
    });
  }, []);

  const savePrefs = useCallback((f: SelectedFeature[], c: string) => {
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ features: f, bgColor: c }));
  }, []);

  const setAndSaveFeatures = (f: SelectedFeature[]) => {
    setFeatures(f);
    savePrefs(f, bgColor);
  };

  const setAndSaveBgColor = (c: string) => {
    setBgColor(c);
    savePrefs(features, c);
  };

  const handleShare = async () => {
    try {
      await shareViewAsImage(shareCardRef);
    } catch {
      Alert.alert('Share failed', 'Could not capture card. Try again.');
    }
  };

  // Picker helpers
  const isSelected = (kind: SelectedFeature['kind'], id: string) =>
    features.some(f => f.kind === kind && f.id === id);

  const toggleFeature = (kind: SelectedFeature['kind'], id: string) => {
    if (isSelected(kind, id)) {
      setAndSaveFeatures(features.filter(f => !(f.kind === kind && f.id === id)));
    } else if (features.length < 3) {
      setAndSaveFeatures([...features, { kind, id }]);
    } else {
      Alert.alert('Max 3', 'Deselect one first to swap it out.');
    }
  };

  const earnedBadgeDefs = useMemo(
    () => BADGE_DEFINITIONS.filter(b => earnedSet.has(b.id)),
    [earnedSet]
  );

  const streakBadges = BADGE_DEFINITIONS.filter(b => b.category === 'streak');
  const logBadges = BADGE_DEFINITIONS.filter(b => b.category === 'logs');
  const consistencyBadges = BADGE_DEFINITIONS.filter(b => b.category === 'consistency');
  const levelBadges = BADGE_DEFINITIONS.filter(b => b.category === 'level');
  const cycleBadges = BADGE_DEFINITIONS.filter(b => b.category === 'cycle');

  const totalEarned = earnedBadges.length;
  const totalBadges = BADGE_DEFINITIONS.length;

  const renderBadgeSection = (title: string, badges: typeof BADGE_DEFINITIONS) => (
    <View key={title} style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.badgeGrid}>
        {badges.map(badge => (
          <BadgeItem
            key={badge.id}
            badge={badge}
            earned={earnedSet.has(badge.id)}
            earnedAt={earnedAtMap[badge.id]}
            size={BADGE_SIZE}
          />
        ))}
      </View>
    </View>
  );

  // Picker item renderer
  type PickerItem =
    | { type: 'header'; title: string }
    | { type: 'badge'; id: string; label: string; icon: string; earned: boolean }
    | { type: 'goal'; id: string; label: string; icon: string; color: string };

  const pickerData = useMemo<PickerItem[]>(() => {
    const items: PickerItem[] = [];
    items.push({ type: 'header', title: 'Your Goals' });
    activeGoals.forEach(g => items.push({ type: 'goal', id: g.id, label: g.name, icon: g.icon, color: g.color }));
    items.push({ type: 'header', title: 'Earned Badges' });
    if (earnedBadgeDefs.length === 0) {
      // show all as locked preview
      BADGE_DEFINITIONS.slice(0, 6).forEach(b => items.push({ type: 'badge', id: b.id, label: b.label, icon: b.icon, earned: false }));
    } else {
      earnedBadgeDefs.forEach(b => items.push({ type: 'badge', id: b.id, label: b.label, icon: b.icon, earned: true }));
    }
    return items;
  }, [activeGoals, earnedBadgeDefs]);

  const renderPickerItem = ({ item }: { item: PickerItem }) => {
    if (item.type === 'header') {
      return <Text style={styles.pickerHeader}>{item.title}</Text>;
    }
    const kind = item.type as 'badge' | 'goal';
    const sel = isSelected(kind, item.id);
    const disabled = item.type === 'badge' && !item.earned;
    const iconColor = item.type === 'goal' ? item.color : disabled ? Colors.textDisabled : Colors.accentBright;

    return (
      <TouchableOpacity
        style={[styles.pickerRow, sel && styles.pickerRowSelected, disabled && styles.pickerRowDisabled]}
        onPress={() => !disabled && toggleFeature(kind, item.id)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Ionicons name={item.icon as any} size={22} color={iconColor} />
        <Text style={[styles.pickerLabel, disabled && { color: Colors.textDisabled }]} numberOfLines={1}>
          {item.label}
        </Text>
        {disabled
          ? <Ionicons name="lock-closed" size={14} color={Colors.textDisabled} />
          : <Ionicons name={sel ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={sel ? Colors.accentBright : Colors.textDisabled} />
        }
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Off-screen share card */}
      <ProfileShareCard
        ref={shareCardRef}
        stats={playerStats}
        totalXP={totalXP}
        features={features}
        bgColor={bgColor}
        goals={activeGoals}
        badgeDefs={BADGE_DEFINITIONS}
      />

      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero card */}
        <LinearGradient colors={[Colors.accentDim, Colors.bg1]} style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={[styles.heroIconWrap, { borderColor: tier.color + '55', backgroundColor: tier.color + '22' }]}>
              <Ionicons name={tier.icon as any} size={36} color={tier.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLevel}>Level {playerStats.level}</Text>
              <Text style={[styles.heroTierTitle, { color: tier.color }]}>{tier.title}</Text>
              <Text style={styles.heroXP}>{totalXP.toLocaleString()} XP</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={{ width: '100%' }}>
            <XPBar stats={playerStats} />
          </View>
        </LinearGradient>

        {/* Customize share card */}
        <View style={styles.customizeCard}>
          <View style={styles.customizeHeader}>
            <View style={styles.tierPreview}>
              <Ionicons name={tier.icon as any} size={18} color={tier.color} />
              <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.title}</Text>
            </View>
            <Text style={styles.customizeTitle}>Share Card</Text>
          </View>

          {/* 3 feature slots */}
          <Text style={styles.pickerSublabel}>Achievements</Text>
          <View style={styles.featureSlots}>
            {[0, 1, 2].map(idx => {
              const f = features[idx];
              if (!f) {
                return (
                  <TouchableOpacity key={idx} style={styles.featureSlot} onPress={() => setPickerVisible(true)}>
                    <Ionicons name="add-circle-outline" size={24} color={Colors.textDisabled} />
                    <Text style={styles.featureSlotEmpty}>Add</Text>
                  </TouchableOpacity>
                );
              }
              const label = f.kind === 'badge'
                ? BADGE_DEFINITIONS.find(b => b.id === f.id)?.label
                : activeGoals.find(g => g.id === f.id)?.name;
              const icon = f.kind === 'badge'
                ? BADGE_DEFINITIONS.find(b => b.id === f.id)?.icon
                : activeGoals.find(g => g.id === f.id)?.icon;
              const iconColor = f.kind === 'goal'
                ? (activeGoals.find(g => g.id === f.id)?.color ?? Colors.accentBright)
                : Colors.accentBright;
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.featureSlotFilled}
                  onPress={() => setAndSaveFeatures(features.filter((_, i) => i !== idx))}
                >
                  <View style={styles.featureSlotRemoveBadge}>
                    <Ionicons name="close" size={9} color={Colors.textDisabled} />
                  </View>
                  <Ionicons name={icon as any} size={26} color={iconColor} />
                  <Text style={styles.featureSlotLabel} numberOfLines={2}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Color picker */}
          <Text style={styles.pickerSublabel}>Background</Text>
          <View style={styles.colorRow}>
            {SHARE_BG_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorSwatch, { backgroundColor: c }, bgColor === c && styles.swatchSelected]}
                onPress={() => setAndSaveBgColor(c)}
              />
            ))}
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statRow}>
          {[
            { label: 'Total Logs', value: logs.length },
            { label: 'Best Streak', value: longestStreak + 'd' },
            { label: 'Badges', value: `${totalEarned}/${totalBadges}` },
            { label: 'Goals', value: goals.filter(g => !g.isArchived).length },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Skill Tracks */}
        {activeCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Skill Tracks</Text>
            <View style={styles.skillGrid}>
              {activeCategories.map(cat => {
                const cs = categoryStats[cat]!;
                return (
                  <View key={cat} style={styles.skillCard}>
                    <View style={styles.skillHeader}>
                      <View style={styles.skillIconWrap}>
                        <Ionicons name={CATEGORY_ICONS[cat] as any} size={18} color={Colors.accentBright} />
                      </View>
                      <View style={styles.skillInfo}>
                        <Text style={styles.skillName}>{CATEGORY_LABELS[cat]}</Text>
                        <Text style={styles.skillGoalCount}>{cs.goalCount} goal{cs.goalCount !== 1 ? 's' : ''}</Text>
                      </View>
                      <View style={styles.skillLevelBadge}>
                        <Text style={styles.skillLevel}>Lv {cs.stats.level}</Text>
                      </View>
                    </View>
                    <XPBar stats={cs.stats} compact />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {renderBadgeSection('Streak Badges', streakBadges)}
        {renderBadgeSection('Log Count Badges', logBadges)}
        {renderBadgeSection('Consistency Badges', consistencyBadges)}
        {renderBadgeSection('Level Badges', levelBadges)}
        {cycleBadges.length > 0 && renderBadgeSection('Milestone Cycle Badges', cycleBadges)}
      </ScrollView>

      {/* Feature picker modal */}
      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <SafeAreaView style={styles.pickerScreen}>
          <View style={styles.pickerTopBar}>
            <Text style={styles.pickerTitle}>Pick up to 3 to feature</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)} style={{ padding: Spacing.sm }}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.pickerSubtitle}>Selected: {features.length}/3</Text>
          <FlatList
            data={pickerData}
            keyExtractor={(item, i) => `${item.type}-${i}`}
            renderItem={renderPickerItem}
            contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
          />
          <TouchableOpacity style={styles.pickerDone} onPress={() => setPickerVisible(false)}>
            <Text style={styles.pickerDoneText}>Done</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg0 },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xxl },

  heroCard: { borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.accentDim },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heroIconWrap: { width: 64, height: 64, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  heroLevel: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '800' },
  heroTierTitle: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 2 },
  heroXP: { color: Colors.accentBright, fontSize: FontSize.sm },
  shareBtn: { padding: Spacing.xs },

  customizeCard: { backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  customizeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tierPreview: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tierLabel: { fontSize: FontSize.xs, fontWeight: '700' },
  customizeTitle: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  pickerSublabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  featureSlots: { flexDirection: 'row', gap: Spacing.sm },
  featureSlot: { flex: 1, minHeight: 84, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.bg3, backgroundColor: Colors.bg2, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs },
  featureSlotFilled: { flex: 1, minHeight: 84, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.accentDim, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, position: 'relative' },
  featureSlotLabel: { color: Colors.textPrimary, fontSize: FontSize.xs, textAlign: 'center', fontWeight: '600' },
  featureSlotEmpty: { color: Colors.textDisabled, fontSize: FontSize.xs },
  featureSlotRemoveBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: Colors.bg3, borderRadius: 7, padding: 2 },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  colorSwatch: { width: 28, height: 28, borderRadius: Radius.full, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: Colors.textPrimary, transform: [{ scale: 1.2 }] },

  statRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, backgroundColor: Colors.bg1, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { color: Colors.accentBright, fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSize.xs - 1 },

  section: { gap: Spacing.sm },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: BADGE_GAP },

  skillGrid: { gap: Spacing.sm },
  skillCard: { backgroundColor: Colors.bg1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  skillHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  skillIconWrap: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  skillInfo: { flex: 1 },
  skillName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  skillGoalCount: { color: Colors.textSecondary, fontSize: FontSize.xs },
  skillLevelBadge: { backgroundColor: Colors.accentDim, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  skillLevel: { color: Colors.accentBright, fontSize: FontSize.sm, fontWeight: '700' },

  // Picker modal
  pickerScreen: { flex: 1, backgroundColor: Colors.bg0 },
  pickerTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  pickerTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  pickerSubtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  pickerHeader: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bg1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  pickerRowSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
  pickerRowDisabled: { opacity: 0.4 },
  pickerLabel: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.md },
  pickerDone: { margin: Spacing.md, backgroundColor: Colors.accent, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
  pickerDoneText: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
});
