import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal, FlatList, Dimensions, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AnimatedPressable from '../components/common/AnimatedPressable';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ThemePickerModal from '../components/profile/ThemePickerModal';
import BadgeDetailModal from '../components/common/BadgeDetailModal';
import LevelLadderModal from '../components/common/LevelLadderModal';

import { FontFamily, FontSize, hexAlpha, Radius, Spacing, TextStyle } from '../constants/theme';
import { Spring, Timing, Stagger } from '../constants/motion';
import { useColors } from '../hooks/useColors';
import { useThemeStore } from '../store/themeStore';
import { useLogStore } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { useGoalStore } from '../store/goalStore';
import { useTodoXPStore } from '../store/todoXPStore';
import { getPlayerStats } from '../logic/xpEngine';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { sumXP } from '../utils/xpUtils';
import { getCategoryStats, getCategoryDisplayLabel, CATEGORY_LABELS, CATEGORY_ICONS } from '../utils/categoryXP';
import { shareViewAsImage } from '../utils/shareUtils';
import { BADGE_DEFINITIONS } from '../constants/badges';
import BadgeItem from '../components/common/BadgeItem';
import XPBar from '../components/common/XPBar';
import ProfileShareCard, { getLevelTier } from '../components/common/ProfileShareCard';
import StreakFlame from '../components/common/StreakFlame';
import type { SelectedFeature } from '../components/common/ProfileShareCard';
import type { GoalCategory } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PREFS_KEY = 'shareCardPrefs';

// Badge grid — 4 columns on normal screens, 3 on very small ones
const SCREEN_W   = Dimensions.get('window').width;
const NUM_COLS   = SCREEN_W < 360 ? 3 : 4;
const BADGE_GAP  = Spacing.xs;            // 4 px gap between cells
const BADGE_SIZE = Math.floor(
  (SCREEN_W - Spacing.md * 2 - BADGE_GAP * (NUM_COLS - 1)) / NUM_COLS
);

const SHARE_BG_COLORS_DARK = [
  '#1A0A2E', '#0D1B2A', '#0D2818', '#2E0D0D', '#0D2A2A', '#1A1A1A',
  '#1A1430', '#2A1A0D', '#16213E', '#0F3460', '#2C1654',
  '#1A0A14', '#0A1A14', '#1A1400', '#2D1B69', '#0A3060',
];
const SHARE_BG_COLORS_LIGHT = [
  '#F0E6FF', '#E6F0FF', '#E6FFE6', '#FFE6E6', '#FFF0E6', '#E6FFFF',
  '#FFFCE6', '#F5E6FF', '#EEF2FF', '#FFF8F0',
  '#FAFAFA', '#F5ECD7', '#F2D4CC', '#CCE5FF', '#D4F2E8', '#FFF0FB',
];

export default function ProfileScreen() {
  const { colors: Colors, isLight } = useColors();
  const navigation = useNavigation<Nav>();
  const systemScheme = useColorScheme();
  const colorMode = useThemeStore(s => s.colorMode);
  const effectiveMode = colorMode === 'system' ? (systemScheme ?? 'dark') : colorMode;
  const shareBgColors = effectiveMode === 'light' ? SHARE_BG_COLORS_LIGHT : SHARE_BG_COLORS_DARK;
  const goals = useGoalStore(s => s.goals);
  const { logs, graceStates } = useLogStore();
  const { earnedBadges } = useBadgeStore();
  const shareCardRef = useRef<View>(null);

  const [features, setFeatures] = useState<SelectedFeature[]>([]);
  const [bgColorDark, setBgColorDark] = useState(SHARE_BG_COLORS_DARK[0]);
  const [bgColorLight, setBgColorLight] = useState(SHARE_BG_COLORS_LIGHT[0]);
  const bgColor = isLight ? bgColorLight : bgColorDark;
  const [pickerVisible, setPickerVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [levelLadderVisible, setLevelLadderVisible] = useState(false);

  const todoXP = useTodoXPStore(s => s.totalXP);
  const activeGoals = useMemo(() => goals.filter(g => !g.isArchived), [goals]);

  // Section reveal animations
  const revealY0 = useSharedValue(12);
  const revealOp0 = useSharedValue(0);
  const revealY1 = useSharedValue(12);
  const revealOp1 = useSharedValue(0);
  const revealY2 = useSharedValue(12);
  const revealOp2 = useSharedValue(0);

  useEffect(() => {
    revealY0.value = withSpring(0, Spring.snappy);
    revealOp0.value = withTiming(1, { duration: Timing.fast });
    revealY1.value = withDelay(Stagger.section, withSpring(0, Spring.snappy));
    revealOp1.value = withDelay(Stagger.section, withTiming(1, { duration: Timing.fast }));
    revealY2.value = withDelay(Stagger.section * 2, withSpring(0, Spring.snappy));
    revealOp2.value = withDelay(Stagger.section * 2, withTiming(1, { duration: Timing.fast }));
  }, []);

  const reveal0 = useAnimatedStyle(() => ({ opacity: revealOp0.value, transform: [{ translateY: revealY0.value }] }));
  const reveal1 = useAnimatedStyle(() => ({ opacity: revealOp1.value, transform: [{ translateY: revealY1.value }] }));
  const reveal2 = useAnimatedStyle(() => ({ opacity: revealOp2.value, transform: [{ translateY: revealY2.value }] }));

  const totalXP = useMemo(() => sumXP(logs) + todoXP, [logs, todoXP]);
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

  const categoryMaxStreak = useMemo(() => {
    const result: Record<string, number> = {};
    activeCategories.forEach(cat => {
      const catGoals = goals.filter(g => !g.isArchived && g.category === cat);
      let max = 0;
      catGoals.forEach(g => {
        const gl = logs.filter(l => l.goalId === g.id);
        const grace = graceStates[g.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
        const { currentStreak } = computeStreakWithGrace(gl, grace.graceDayUsed, grace.graceDayRefillDate);
        if (currentStreak > max) max = currentStreak;
      });
      result[cat] = max;
    });
    return result;
  }, [activeCategories, goals, logs, graceStates]);

  // Load prefs
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then(raw => {
      if (!raw) return;
      try {
        const p = JSON.parse(raw);
        if (p.features) setFeatures(p.features);
        if (p.bgColorDark) setBgColorDark(p.bgColorDark);
        if (p.bgColorLight) setBgColorLight(p.bgColorLight);
        if (!p.bgColorDark && p.bgColor) setBgColorDark(p.bgColor);
      } catch {}
    });
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <AnimatedPressable
          onPress={() => setThemePickerVisible(true)}
          style={{ marginRight: Spacing.md }}
        >
          <Ionicons name="color-palette-outline" size={22} color={Colors.textPrimary} />
        </AnimatedPressable>
      ),
    });
  }, [navigation, Colors.textPrimary]);

  const savePrefs = useCallback((f: SelectedFeature[], darkC: string, lightC: string) => {
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ features: f, bgColorDark: darkC, bgColorLight: lightC }));
  }, []);

  const setAndSaveFeatures = (f: SelectedFeature[]) => {
    setFeatures(f);
    savePrefs(f, bgColorDark, bgColorLight);
  };

  const setAndSaveBgColor = (c: string) => {
    if (isLight) {
      setBgColorLight(c);
      savePrefs(features, bgColorDark, c);
    } else {
      setBgColorDark(c);
      savePrefs(features, c, bgColorLight);
    }
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
  const todoBadges = BADGE_DEFINITIONS.filter(b => b.category === 'todos');
  const journalBadges = BADGE_DEFINITIONS.filter(b => b.category === 'journal');
  const timeBadges = BADGE_DEFINITIONS.filter(b => b.category === 'time');

  const totalEarned = earnedBadges.length;
  const totalBadges = BADGE_DEFINITIONS.length;

  const renderBadgeSection = (title: string, badges: typeof BADGE_DEFINITIONS) => (
    <View key={title} style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccentBar, { backgroundColor: Colors.accentBright }]} />
        <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>{title}</Text>
      </View>
      <View style={styles.badgeGrid}>
        {badges.map(def => (
          <AnimatedPressable
            key={def.id}
            onPress={() => { if (earnedSet.has(def.id)) setSelectedBadgeId(def.id); }}
          >
            <BadgeItem
              badge={def}
              earned={earnedSet.has(def.id)}
              earnedAt={earnedAtMap[def.id]}
              size={BADGE_SIZE}
            />
          </AnimatedPressable>
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
      return <Text style={[styles.pickerHeader, { color: Colors.textSecondary }]}>{item.title}</Text>;
    }
    const kind = item.type as 'badge' | 'goal';
    const sel = isSelected(kind, item.id);
    const disabled = item.type === 'badge' && !item.earned;
    const iconColor = item.type === 'goal' ? item.color : disabled ? Colors.textDisabled : Colors.accentBright;

    return (
      <AnimatedPressable
        style={[styles.pickerRow, { backgroundColor: Colors.bg1, borderColor: Colors.border }, sel && { borderColor: Colors.accent, backgroundColor: Colors.accentDim }, disabled && styles.pickerRowDisabled]}
        onPress={() => !disabled && toggleFeature(kind, item.id)}
      >
        <Ionicons name={item.icon as any} size={22} color={iconColor} />
        <Text style={[styles.pickerLabel, { color: Colors.textPrimary }, disabled && { color: Colors.textDisabled }]} numberOfLines={1}>
          {item.label}
        </Text>
        {disabled
          ? <Ionicons name="lock-closed" size={14} color={Colors.textDisabled} />
          : <Ionicons name={sel ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={sel ? Colors.accentBright : Colors.textDisabled} />
        }
      </AnimatedPressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]} edges={['bottom', 'left', 'right']}>
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
        <Animated.View style={reveal0}>
        <LinearGradient
          colors={[bgColor + 'DD', Colors.bg1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.heroCard, { borderColor: Colors.accentDim }]}
        >
          <View style={styles.heroHeader}>
            <AnimatedPressable
              style={[styles.heroIconWrap, { borderColor: hexAlpha(tier.color, 0.40), backgroundColor: hexAlpha(tier.color, 0.13) }]}
              onPress={() => setLevelLadderVisible(true)}
            >
              <Ionicons name={tier.icon as any} size={48} color={tier.color} />
            </AnimatedPressable>
            <AnimatedPressable style={{ flex: 1, gap: 4, alignItems: 'center' }} onPress={() => setLevelLadderVisible(true)}>
              <Text style={[styles.heroLevel, { color: tier.color }]}>{playerStats.level}</Text>
              <Text style={[styles.heroTierTitle, { color: tier.color }]}>{tier.title}</Text>
              <Text style={[styles.heroXP, { color: Colors.accentBright }]}>{totalXP.toLocaleString()} XP total</Text>
              <Text style={[styles.heroNext, { color: Colors.textSecondary }]}>{(playerStats.xpForNextLevel - playerStats.xpIntoLevel).toLocaleString()} XP to Level {playerStats.level + 1}</Text>
            </AnimatedPressable>
            <AnimatedPressable style={[styles.shareBtn, { alignSelf: 'flex-start' }]} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color={Colors.textSecondary} />
            </AnimatedPressable>
          </View>
          <View style={{ width: '100%' }}>
            <XPBar stats={playerStats} hideLevel />
          </View>

          {/* 3 feature slots */}
          <Text style={[styles.pickerSublabel, { color: Colors.textSecondary }]}>Achievements</Text>
          <View style={styles.featureSlots}>
            {[0, 1, 2].map(idx => {
              const f = features[idx];
              if (!f) {
                return (
                  <AnimatedPressable key={idx} style={[styles.featureSlot, { borderColor: Colors.accentDim, backgroundColor: Colors.accentDim + (isLight ? '18' : '40') }]} onPress={() => setPickerVisible(true)}>
                    <Ionicons name="add-circle-outline" size={24} color={Colors.textDisabled} />
                    <Text style={[styles.featureSlotEmpty, { color: Colors.textDisabled }]}>Add</Text>
                  </AnimatedPressable>
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
                <AnimatedPressable
                  key={idx}
                  style={[styles.featureSlotFilled, { borderColor: Colors.accentBright + '80', backgroundColor: Colors.accentDim + (isLight ? '18' : '40') }]}
                  onPress={() => setAndSaveFeatures(features.filter((_, i) => i !== idx))}
                >
                  <View style={[styles.featureSlotRemoveBadge, { backgroundColor: Colors.bg3 }]}>
                    <Ionicons name="close" size={9} color={Colors.textDisabled} />
                  </View>
                  <Ionicons name={icon as any} size={26} color={iconColor} />
                  <Text style={[styles.featureSlotLabel, { color: Colors.textPrimary }]} numberOfLines={2}>{label}</Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Color picker */}
          <Text style={[styles.pickerSublabel, { color: Colors.textSecondary }]}>Background</Text>
          <View style={[styles.swatchContainer, { backgroundColor: Colors.bg3 + 'BB', borderColor: Colors.border }]}>
            <View style={styles.colorRow}>
              {shareBgColors.map(c => (
                <AnimatedPressable
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, bgColor === c && { borderColor: Colors.textPrimary, transform: [{ scale: 1.2 }] }]}
                  onPress={() => setAndSaveBgColor(c)}
                />
              ))}
            </View>
          </View>
        </LinearGradient>
        </Animated.View>

        {/* Stats row */}
        <Animated.View style={reveal1}>
          <View style={styles.statRow}>
            {[
              { label: 'Total Logs', value: logs.length },
              { label: 'Best Streak', value: longestStreak + 'd' },
              { label: 'Badges', value: `${totalEarned}/${totalBadges}` },
              { label: 'Goals', value: goals.filter(g => !g.isArchived).length },
            ].map(s => (
              <View key={s.label} style={[styles.statBox, { backgroundColor: Colors.bg1, borderColor: Colors.border, borderTopWidth: 2, borderTopColor: hexAlpha(Colors.accentBright, 0.50) }]}>
                <Text style={[styles.statValue, { color: Colors.accentBright }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Skill Tracks */}
        <Animated.View style={reveal2}>
        {activeCategories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccentBar, { backgroundColor: Colors.accentBright }]} />
              <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Skill Tracks</Text>
            </View>
            <View style={styles.skillGrid}>
              {activeCategories.map(cat => {
                const cs = categoryStats[cat]!;
                return (
                  <AnimatedPressable
                    key={cat}
                    style={[styles.skillCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}
                    onPress={() => navigation.navigate('SkillTrack', { category: cat })}
                  >
                    <View style={styles.skillHeader}>
                      <View style={[styles.skillIconWrap, { backgroundColor: isLight ? Colors.bg3 : Colors.accentDim }]}>
                        <StreakFlame streak={categoryMaxStreak[cat] ?? 0} size={36}>
                          <Ionicons name={CATEGORY_ICONS[cat] as any} size={18} color={Colors.accentBright} />
                        </StreakFlame>
                      </View>
                      <View style={styles.skillInfo}>
                        <Text style={[styles.skillName, { color: Colors.textPrimary }]}>{getCategoryDisplayLabel(goals, cat)}</Text>
                        <Text style={[styles.skillGoalCount, { color: Colors.textSecondary }]}>{cs.goalCount} goal{cs.goalCount !== 1 ? 's' : ''}</Text>
                      </View>
                      <View style={[styles.skillLevelBadge, { backgroundColor: isLight ? Colors.bg3 : Colors.accentDim }]}>
                        <Text style={[styles.skillLevel, { color: Colors.accentBright }]}>Lv {cs.stats.level}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
                    </View>
                    <XPBar stats={cs.stats} compact />
                  </AnimatedPressable>
                );
              })}
              {/* Individual skill tracks for 'Other' category goals */}
              {activeGoals.filter(g => g.category === 'other').map(goal => {
                const goalLogs = logs.filter(l => l.goalId === goal.id);
                const goalXP = goalLogs.reduce((sum, l) => sum + l.xpAwarded + (l.bonusXp ?? 0), 0);
                const goalStats = getPlayerStats(goalXP);
                const goalStreak = (() => {
                  const grace = graceStates[goal.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
                  return computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);
                })();
                return (
                  <AnimatedPressable
                    key={goal.id}
                    style={[styles.skillCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}
                    onPress={() => navigation.navigate('SkillTrack', { category: 'other', goalId: goal.id })}
                  >
                    <View style={styles.skillHeader}>
                      <View style={[styles.skillIconWrap, { backgroundColor: hexAlpha(goal.color, 0.13) }]}>
                        <StreakFlame streak={goalStreak.currentStreak} size={36}>
                          <Ionicons name={goal.icon as any} size={18} color={goal.color} />
                        </StreakFlame>
                      </View>
                      <View style={styles.skillInfo}>
                        <Text style={[styles.skillName, { color: Colors.textPrimary }]}>{goal.customCategoryLabel ?? goal.name}</Text>
                        <Text style={[styles.skillGoalCount, { color: Colors.textSecondary }]}>1 goal</Text>
                      </View>
                      <View style={[styles.skillLevelBadge, { backgroundColor: isLight ? Colors.bg3 : Colors.accentDim }]}>
                        <Text style={[styles.skillLevel, { color: Colors.accentBright }]}>Lv {goalStats.level}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
                    </View>
                    <XPBar stats={goalStats} compact />
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        )}
        </Animated.View>

        {renderBadgeSection('Streak Badges', streakBadges)}
        {renderBadgeSection('Log Count Badges', logBadges)}
        {renderBadgeSection('Consistency Badges', consistencyBadges)}
        {renderBadgeSection('Level Badges', levelBadges)}
        {cycleBadges.length > 0 && renderBadgeSection('Milestone Cycle Badges', cycleBadges)}
        {renderBadgeSection('Todo Completions', todoBadges)}
        {renderBadgeSection('Journal Streaks', journalBadges)}
        {renderBadgeSection('Time of Day', timeBadges)}
      </ScrollView>

      {/* Theme picker modal */}
      <ThemePickerModal visible={themePickerVisible} onClose={() => setThemePickerVisible(false)} />

      {/* Badge detail modal */}
      <BadgeDetailModal badgeId={selectedBadgeId} onClose={() => setSelectedBadgeId(null)} />

      {/* Level ladder modal */}
      <LevelLadderModal visible={levelLadderVisible} currentLevel={playerStats.level} onClose={() => setLevelLadderVisible(false)} />

      {/* Feature picker modal */}
      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <SafeAreaView style={[styles.pickerScreen, { backgroundColor: Colors.bg0 }]}>
          <View style={styles.pickerTopBar}>
            <Text style={[styles.pickerTitle, { color: Colors.textPrimary }]}>Pick up to 3 to feature</Text>
            <AnimatedPressable onPress={() => setPickerVisible(false)} style={{ padding: Spacing.sm }}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </AnimatedPressable>
          </View>
          <Text style={[styles.pickerSubtitle, { color: Colors.textSecondary }]}>Selected: {features.length}/3</Text>
          <FlatList
            data={pickerData}
            keyExtractor={(item, i) => `${item.type}-${i}`}
            renderItem={renderPickerItem}
            contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
          />
          <AnimatedPressable style={[styles.pickerDone, { backgroundColor: Colors.accent }]} onPress={() => setPickerVisible(false)}>
            <Text style={[styles.pickerDoneText, { color: Colors.textPrimary }]}>Done</Text>
          </AnimatedPressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xxl },

  heroCard: { borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderWidth: 1 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heroIconWrap: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  heroLevel: { fontSize: FontSize.xxxl, fontFamily: FontFamily.extraBold },
  heroTierTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  heroXP: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  heroNext: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  shareBtn: { padding: Spacing.xs },

  pickerSublabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  featureSlots: { flexDirection: 'row', gap: Spacing.sm },
  featureSlot: { flex: 1, minHeight: 84, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs },
  featureSlotFilled: { flex: 1, minHeight: 84, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, position: 'relative' },
  featureSlotLabel: { fontSize: FontSize.xs, textAlign: 'center', fontFamily: FontFamily.semiBold },
  featureSlotEmpty: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  featureSlotRemoveBadge: { position: 'absolute', top: 5, right: 5, borderRadius: 7, padding: 2 },
  swatchContainer: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: 2,
  },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { transform: [{ scale: 1.2 }] },

  statRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, textAlign: 'center', alignSelf: 'stretch' },
  statLabel: { fontSize: FontSize.xs - 1, fontFamily: FontFamily.regular, textAlign: 'center', alignSelf: 'stretch' },

  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionAccentBar: { width: 3, height: 16, borderRadius: Radius.full },
  sectionLabel: { ...TextStyle.label },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: BADGE_GAP },

  skillGrid: { gap: Spacing.sm },
  skillCard: { borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1 },
  skillHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  skillIconWrap: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  skillInfo: { flex: 1 },
  skillName: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  skillGoalCount: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  skillLevelBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  skillLevel: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },

  // Picker modal
  pickerScreen: { flex: 1 },
  pickerTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  pickerTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  pickerSubtitle: { fontSize: FontSize.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, fontFamily: FontFamily.regular },
  pickerHeader: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: 1, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xs, borderWidth: 1 },
  pickerRowDisabled: { opacity: 0.4 },
  pickerLabel: { flex: 1, fontSize: FontSize.md, fontFamily: FontFamily.regular },
  pickerDone: { margin: Spacing.md, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
  pickerDoneText: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
});
