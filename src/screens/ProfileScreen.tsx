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
import AboutCard from '../components/profile/AboutCard';

import { FontFamily, FontSize, hexAlpha, Radius, Spacing, TextStyle, GameColors } from '../constants/theme';
import { Spring, Timing, Stagger } from '../constants/motion';
import GameIcon from '../components/common/GameIcon';
import AmbientBackground from '../components/common/AmbientBackground';
import { useColors } from '../hooks/useColors';
import { useThemeStore } from '../store/themeStore';
import { useLogStore } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { useGoalStore } from '../store/goalStore';
import { useTodoXPStore } from '../store/todoXPStore';
import { useCoinStore } from '../store/coinStore';
import { useTitleStore } from '../store/titleStore';
import { useCraftingStore } from '../store/craftingStore';
import { useSeasonStore } from '../store/seasonStore';
import { useGameStore } from '../store/gameStore';
import { getPlayerStats } from '../logic/xpEngine';
import { computeStreakWithGrace } from '../logic/streakEngine';
import { sumXP, formatStatValue } from '../utils/xpUtils';
import { getCategoryStats, getCategoryDisplayLabel, getCustomTracks, CATEGORY_LABELS, CATEGORY_ICONS } from '../utils/categoryXP';
import { shareViewAsImage } from '../utils/shareUtils';
import { BADGE_DEFINITIONS, RARITY_COLORS } from '../constants/badges';
import { getCurrentSeason } from '../constants/seasons';
import { getTitleDefinition } from '../constants/titles';
import { todayString } from '../utils/dateUtils';
import BadgeItem from '../components/common/BadgeItem';
import XPBar from '../components/common/XPBar';
import ProfileShareCard, { getLevelTier } from '../components/common/ProfileShareCard';
import StreakFlame from '../components/common/StreakFlame';
import type { SelectedFeature } from '../components/common/ProfileShareCard';
import type { GoalCategory } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PREFS_KEY = 'shareCardPrefs';

// Badge grid — 3 columns
const SCREEN_W   = Dimensions.get('window').width;
const NUM_COLS   = 3;
const BADGE_GAP  = Spacing.sm;            // 8 px gap between cells
const BADGE_SIZE = Math.floor(
  (SCREEN_W - Spacing.md * 2 - BADGE_GAP * (NUM_COLS - 1)) / NUM_COLS
);

const RARITY_WEIGHT: Record<string, number> = { legendary: 4, rare: 3, uncommon: 2, common: 1 };

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

const CONSUMABLE_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  xp_surge:    { label: 'XP Surge',      icon: 'flash',          desc: '+50% XP next 5 logs' },
  lucky_boost: { label: 'Lucky Boost',   icon: 'sparkles',       desc: '2x lucky drop for 24h' },
  coin_cache:  { label: 'Coin Cache',    icon: 'cash',           desc: '+75 coins immediately' },
  grace_refill:{ label: 'Grace Refill',  icon: 'shield',         desc: 'Refill grace day for a goal' },
  quest_boost: { label: 'Quest Boost',   icon: 'list',           desc: '+50% quest XP today' },
};

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
  const [titlePickerVisible, setTitlePickerVisible] = useState(false);

  const todoXP = useTodoXPStore(s => s.totalXP);
  const activeGoals = useMemo(() => goals.filter(g => !g.isArchived), [goals]);

  // Game systems
  const coinBalance = useCoinStore(s => s.balance);
  const { earnedTitleIds, equippedTitleId } = useTitleStore();
  const { shardCount, consumables, isSurgeActive, isLuckyBoostActive } = useCraftingStore();
  const { completedChallengeIds, claimedSeasonIds } = useSeasonStore();
  const { prestigeLevel, canPrestige, getAdjustedXP, prestigeXPBonus } = useGameStore();

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

  const currentSeason = useMemo(() => getCurrentSeason(todayString()), []);
  const seasonChallengesCompleted = useMemo(() => {
    if (!currentSeason) return 0;
    return currentSeason.challenges.filter(c => completedChallengeIds.includes(c.id)).length;
  }, [currentSeason, completedChallengeIds]);
  const seasonClaimed = currentSeason ? claimedSeasonIds.includes(currentSeason.id) : false;

  const equippedTitle = equippedTitleId ? getTitleDefinition(equippedTitleId) : null;

  // Prestige-adjusted stats
  const adjustedXP = useMemo(() => getAdjustedXP(totalXP), [totalXP, getAdjustedXP]);
  const adjustedStats = useMemo(() => getPlayerStats(adjustedXP), [adjustedXP]);

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
  const customTracks = useMemo(() => getCustomTracks(goals), [goals]);

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginRight: Spacing.md }}>
          <AnimatedPressable onPress={() => navigation.navigate('Shop')} accessibilityLabel="Open shop">
            <Ionicons name="storefront-outline" size={22} color={Colors.textPrimary} />
          </AnimatedPressable>
          <AnimatedPressable onPress={() => setThemePickerVisible(true)} accessibilityLabel="Change theme">
            <Ionicons name="color-palette-outline" size={22} color={Colors.textPrimary} />
          </AnimatedPressable>
          <AnimatedPressable onPress={() => navigation.navigate('Settings')} accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={22} color={Colors.textPrimary} />
          </AnimatedPressable>
        </View>
      ),
    });
  }, [navigation, Colors.textPrimary, setThemePickerVisible]);

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

  const handlePrestige = () => {
    Alert.alert(
      '✨ Ascension',
      `Reset your level to 0 for a permanent +5% XP bonus? You keep all badges, goals, coins, and perks. Prestige bonus becomes ${Math.round((prestigeXPBonus + 0.05) * 100)}%.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ascend',
          style: 'destructive',
          onPress: async () => {
            await useGameStore.getState().prestige(totalXP);
            await useCoinStore.getState().addCoins(500, 'prestige');
          },
        },
      ]
    );
  };

  const handleUseConsumable = async (id: string) => {
    const type = await useCraftingStore.getState().useConsumable(id);
    if (!type) return;
    if (type === 'coin_cache') {
      await useCoinStore.getState().addCoins(75, 'consumable');
      Alert.alert('Coin Cache', '+75 coins added to your balance!');
    } else if (type === 'xp_surge') {
      Alert.alert('XP Surge Active', '+50% XP on your next 5 logs.');
    } else if (type === 'lucky_boost') {
      Alert.alert('Lucky Boost Active', '2x lucky drop for the next 24h.');
    } else if (type === 'quest_boost') {
      Alert.alert('Quest Boost Active', '+50% quest XP for today.');
    } else if (type === 'grace_refill') {
      const activeGoalNames = activeGoals.map(g => g.name);
      if (activeGoalNames.length === 0) {
        Alert.alert('No Goals', 'You have no active goals to refill grace for.');
        return;
      }
      Alert.alert(
        'Grace Refill',
        'Grace day refilled! Active goals:\n' + activeGoalNames.slice(0, 5).join(', '),
      );
    }
  };

  const handleCraft = async () => {
    const result = await useCraftingStore.getState().craft();
    if (!result) {
      Alert.alert('Not enough shards', `You need 3 shards to craft. You have ${shardCount}.`);
      return;
    }
    const info = CONSUMABLE_LABELS[result.type];
    Alert.alert('Crafted!', `You received: ${info?.label ?? result.type}\n${info?.desc ?? ''}`);
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

  const renderBadgeSection = (title: string, badges: typeof BADGE_DEFINITIONS) => {
    const sorted = [...badges].sort((a, b) => {
      const aEarned = earnedSet.has(a.id) ? 1 : 0;
      const bEarned = earnedSet.has(b.id) ? 1 : 0;
      if (aEarned !== bEarned) return bEarned - aEarned;
      return (RARITY_WEIGHT[b.rarity] ?? 0) - (RARITY_WEIGHT[a.rarity] ?? 0);
    });
    const hasLegendary = sorted.some(b => earnedSet.has(b.id) && b.rarity === 'legendary');
    const hasRare = !hasLegendary && sorted.some(b => earnedSet.has(b.id) && b.rarity === 'rare');
    const accentColor = hasLegendary ? GameColors.rankLegend : hasRare ? RARITY_COLORS.rare : Colors.accentBright;

    return (
      <View key={title} style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionAccentBar, { backgroundColor: accentColor }]} />
          <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>{title}</Text>
        </View>
        <View style={styles.badgeGrid}>
          {sorted.map(def => (
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
  };

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
      <AmbientBackground />
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
          <AnimatedPressable style={styles.shareBtn} onPress={handleShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="share-social-outline" size={20} color={Colors.textSecondary} />
          </AnimatedPressable>

          {/* Coin chip */}
          <View style={[styles.coinChip, { backgroundColor: hexAlpha(Colors.accentBright, 0.15), borderColor: hexAlpha(Colors.accentBright, 0.30) }]}>
            <GameIcon type="coin" size={11} />
            <Text style={[styles.coinChipText, { color: Colors.accentBright }]}>{coinBalance}</Text>
          </View>

          <View style={styles.heroHeader}>
            <View style={styles.heroIconContainer}>
              <View style={[styles.heroIconGlow, { backgroundColor: hexAlpha(tier.color, 0.22) }]} />
              <AnimatedPressable
                style={[styles.heroIconWrap, { borderColor: hexAlpha(tier.color, 0.40), backgroundColor: hexAlpha(tier.color, 0.13) }]}
                onPress={() => setLevelLadderVisible(true)}
              >
                <Ionicons name={tier.icon as any} size={48} color={tier.color} />
              </AnimatedPressable>
            </View>
            <AnimatedPressable style={styles.heroInfo} onPress={() => setLevelLadderVisible(true)}>
              <Text style={[styles.heroLevel, { color: tier.color }]}>{adjustedStats.level}</Text>
              {prestigeLevel > 0 && (
                <View style={styles.prestigeStarsRow}>
                  {Array.from({ length: Math.min(prestigeLevel, 5) }).map((_, i) => (
                    <GameIcon key={i} type="star" size={14} color={GameColors.starGold} />
                  ))}
                </View>
              )}
              <Text style={[styles.heroTierTitle, { color: tier.color }]}>{tier.title}</Text>
              {/* Title display */}
              {equippedTitle ? (
                <AnimatedPressable onPress={() => setTitlePickerVisible(true)}>
                  <Text style={[styles.titleLabel, { color: Colors.accentBright }]}>{equippedTitle.label}</Text>
                </AnimatedPressable>
              ) : (
                <AnimatedPressable onPress={() => setTitlePickerVisible(true)}>
                  <Text style={[styles.titleLabel, { color: Colors.textDisabled }]}>— Tap to set title —</Text>
                </AnimatedPressable>
              )}
              <Text style={[styles.heroXP, { color: Colors.accentBright }]}>{totalXP.toLocaleString()} XP total</Text>
              <Text style={[styles.heroNext, { color: Colors.textSecondary }]}>{(adjustedStats.xpForNextLevel - adjustedStats.xpIntoLevel).toLocaleString()} XP to Level {adjustedStats.level + 1}</Text>
            </AnimatedPressable>
          </View>
          <View style={{ width: '100%' }}>
            <XPBar stats={adjustedStats} hideLevel />
          </View>

          {/* Ascend button if eligible */}
          {canPrestige(adjustedStats.level) && (
            <AnimatedPressable
              style={[styles.ascendBtn, { backgroundColor: hexAlpha(Colors.accentBright, 0.15), borderColor: Colors.accentBright }]}
              onPress={handlePrestige}
            >
              <Text style={[styles.ascendBtnText, { color: Colors.accentBright }]}>✨ Ascend</Text>
            </AnimatedPressable>
          )}

          {/* 3 feature slots */}
          <Text style={[styles.pickerSublabel, { color: Colors.textSecondary }]}>Achievements</Text>
          <View style={styles.featureSlots}>
            {[0, 1, 2].map(idx => {
              const f = features[idx];
              if (!f) {
                return (
                  <AnimatedPressable key={idx} style={[styles.featureSlot, { borderColor: Colors.accentDim, backgroundColor: Colors.accentDim + (isLight ? '18' : '40') }]} onPress={() => setPickerVisible(true)}>
                    <Ionicons name="add-circle-outline" size={28} color={Colors.textDisabled} />
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
                  <Ionicons name={icon as any} size={30} color={iconColor} />
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
              { label: 'Total Logs', value: formatStatValue(logs.length) },
              { label: 'Best Streak', value: longestStreak + 'd' },
              { label: 'Badges', value: `${totalEarned}/${totalBadges}` },
              { label: 'Goals', value: formatStatValue(goals.filter(g => !g.isArchived).length) },
            ].map(s => (
              <View key={s.label} style={[styles.statBox, { backgroundColor: Colors.bg1, borderColor: Colors.border, borderTopWidth: 2, borderTopColor: hexAlpha(Colors.accentBright, 0.50) }]}>
                <Text style={[styles.statValue, { color: Colors.accentBright }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Skill Tracks */}
        <Animated.View style={reveal2}>
        {(activeCategories.length > 0 || customTracks.length > 0 || currentSeason) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccentBar, { backgroundColor: Colors.accentBright }]} />
              <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Skill Tracks</Text>
            </View>
            <View style={styles.skillGrid}>
              {/* Current Season card — shown first */}
              {currentSeason && (
                <AnimatedPressable
                  onPress={() => navigation.navigate('Season')}
                  style={[styles.trackCard, { backgroundColor: Colors.bg1, borderColor: currentSeason.accentColor, borderWidth: 1.5 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: hexAlpha(currentSeason.accentColor, 0.15), alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={currentSeason.icon as any} size={22} color={currentSeason.accentColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.trackName, { color: Colors.textPrimary }]}>{currentSeason.name}</Text>
                      <Text style={[styles.trackSub, { color: Colors.textSecondary }]}>
                        {seasonChallengesCompleted}/{currentSeason.challenges.length} challenges
                        {seasonClaimed ? ' · Claimed ✓' : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                  </View>
                </AnimatedPressable>
              )}

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
              {/* Custom skill tracks — 'other' goals grouped by track name */}
              {customTracks.map(track => {
                const trackGoalIds = new Set(track.goals.map(g => g.id));
                const trackLogs = logs.filter(l => trackGoalIds.has(l.goalId));
                const trackStats = getPlayerStats(sumXP(trackLogs));
                const trackMaxStreak = track.goals.reduce((max, g) => {
                  const gl = logs.filter(l => l.goalId === g.id);
                  const grace = graceStates[g.id] ?? { graceDayUsed: false, graceDayRefillDate: null };
                  const { currentStreak } = computeStreakWithGrace(gl, grace.graceDayUsed, grace.graceDayRefillDate);
                  return Math.max(max, currentStreak);
                }, 0);
                const trackColor = track.goals[0]?.color ?? Colors.accentBright;
                const trackIcon = track.goals.length === 1 ? track.goals[0].icon : CATEGORY_ICONS.other;
                return (
                  <AnimatedPressable
                    key={track.label}
                    style={[styles.skillCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}
                    onPress={() => navigation.navigate('SkillTrack', { category: 'other', customLabel: track.label })}
                  >
                    <View style={styles.skillHeader}>
                      <View style={[styles.skillIconWrap, { backgroundColor: hexAlpha(trackColor, 0.13) }]}>
                        <StreakFlame streak={trackMaxStreak} size={36}>
                          <Ionicons name={trackIcon as any} size={18} color={trackColor} />
                        </StreakFlame>
                      </View>
                      <View style={styles.skillInfo}>
                        <Text style={[styles.skillName, { color: Colors.textPrimary }]}>{track.label}</Text>
                        <Text style={[styles.skillGoalCount, { color: Colors.textSecondary }]}>{track.goals.length} goal{track.goals.length !== 1 ? 's' : ''}</Text>
                      </View>
                      <View style={[styles.skillLevelBadge, { backgroundColor: isLight ? Colors.bg3 : Colors.accentDim }]}>
                        <Text style={[styles.skillLevel, { color: Colors.accentBright }]}>Lv {trackStats.level}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
                    </View>
                    <XPBar stats={trackStats} compact />
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        )}
        </Animated.View>

        {/* Inventory section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccentBar, { backgroundColor: Colors.accentBright }]} />
            <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Inventory</Text>
          </View>

          {/* Shard count + craft */}
          <View style={[styles.shardRow, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <View style={styles.shardInfo}>
              <View style={styles.shardCountRow}>
                <GameIcon type="shard" size={16} />
                <Text style={[styles.shardCount, { color: Colors.textPrimary }]}>{shardCount} / 3 Shards</Text>
              </View>
              <View style={[styles.shardBarBg, { backgroundColor: Colors.border }]}>
                <View style={[styles.shardBarFill, { backgroundColor: Colors.accentBright, width: `${Math.min((shardCount / 3) * 100, 100)}%` as any }]} />
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
                {isSurgeActive() && (
                  <View style={[styles.boostBadge, { backgroundColor: hexAlpha(GameColors.boostGold, 0.20) }]}>
                    <Ionicons name="flash" size={11} color={GameColors.boostGold} />
                    <Text style={[styles.boostBadgeText, { color: GameColors.boostGold }]}>Surge Active</Text>
                  </View>
                )}
                {isLuckyBoostActive() && (
                  <View style={[styles.boostBadge, { backgroundColor: hexAlpha(GameColors.boostPurple, 0.20) }]}>
                    <Ionicons name="sparkles" size={11} color={GameColors.boostPurple} />
                    <Text style={[styles.boostBadgeText, { color: GameColors.boostPurple }]}>Lucky Active</Text>
                  </View>
                )}
              </View>
            </View>
            {shardCount >= 3 && (
              <AnimatedPressable
                style={[styles.craftBtn, { backgroundColor: Colors.accentBright }]}
                onPress={handleCraft}
              >
                <Text style={[styles.craftBtnText, { color: Colors.bg0 }]}>Craft</Text>
              </AnimatedPressable>
            )}
          </View>

          {/* Consumables */}
          {consumables.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingBottom: Spacing.xs }}>
              {consumables.map(item => {
                const info = CONSUMABLE_LABELS[item.type] ?? { label: item.type, icon: 'cube-outline', desc: '' };
                return (
                  <View
                    key={item.id}
                    style={[styles.consumableCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}
                  >
                    <Ionicons name={info.icon as any} size={24} color={Colors.accentBright} />
                    <Text style={[styles.consumableLabel, { color: Colors.textPrimary }]}>{info.label}</Text>
                    <Text style={[styles.consumableDesc, { color: Colors.textSecondary }]}>{info.desc}</Text>
                    <AnimatedPressable
                      style={[styles.useBtn, { backgroundColor: hexAlpha(Colors.accentBright, 0.15), borderColor: Colors.accentBright }]}
                      onPress={() => handleUseConsumable(item.id)}
                    >
                      <Text style={[styles.useBtnText, { color: Colors.accentBright }]}>Use</Text>
                    </AnimatedPressable>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={[styles.emptyInventory, { color: Colors.textDisabled }]}>No consumables — craft some with shards!</Text>
          )}
        </View>

        {renderBadgeSection('Streak Badges', streakBadges)}
        {renderBadgeSection('Log Count Badges', logBadges)}
        {renderBadgeSection('Consistency Badges', consistencyBadges)}
        {renderBadgeSection('Level Badges', levelBadges)}
        {cycleBadges.length > 0 && renderBadgeSection('Milestone Cycle Badges', cycleBadges)}
        {renderBadgeSection('Todo Completions', todoBadges)}
        {renderBadgeSection('Journal Streaks', journalBadges)}
        {renderBadgeSection('Time of Day', timeBadges)}

        {/* About card */}
        <View style={{ marginTop: Spacing.lg }}>
          <AboutCard />
        </View>
      </ScrollView>

      {/* Theme picker modal */}
      <ThemePickerModal visible={themePickerVisible} onClose={() => setThemePickerVisible(false)} />

      {/* Badge detail modal */}
      <BadgeDetailModal badgeId={selectedBadgeId} onClose={() => setSelectedBadgeId(null)} />

      {/* Level ladder modal */}
      <LevelLadderModal visible={levelLadderVisible} currentLevel={adjustedStats.level} onClose={() => setLevelLadderVisible(false)} />

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

      {/* Title picker modal */}
      <Modal visible={titlePickerVisible} animationType="slide" onRequestClose={() => setTitlePickerVisible(false)}>
        <SafeAreaView style={[styles.pickerScreen, { backgroundColor: Colors.bg0 }]}>
          <View style={styles.pickerTopBar}>
            <Text style={[styles.pickerTitle, { color: Colors.textPrimary }]}>Choose a Title</Text>
            <AnimatedPressable onPress={() => setTitlePickerVisible(false)} style={{ padding: Spacing.sm }}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </AnimatedPressable>
          </View>
          {earnedTitleIds.length === 0 ? (
            <Text style={[styles.pickerSubtitle, { color: Colors.textSecondary }]}>
              Complete achievements to earn titles.
            </Text>
          ) : (
            <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}>
              {earnedTitleIds.map(id => {
                const def = getTitleDefinition(id);
                if (!def) return null;
                const isEquipped = equippedTitleId === id;
                return (
                  <AnimatedPressable
                    key={id}
                    style={[
                      styles.pickerRow,
                      { backgroundColor: Colors.bg1, borderColor: Colors.border },
                      isEquipped && { borderColor: Colors.accentBright, backgroundColor: Colors.accentDim },
                    ]}
                    onPress={async () => {
                      await useTitleStore.getState().equipTitle(id);
                      setTitlePickerVisible(false);
                    }}
                  >
                    <Ionicons name="ribbon-outline" size={22} color={isEquipped ? Colors.accentBright : Colors.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerLabel, { color: Colors.textPrimary }]}>{def.label}</Text>
                      <Text style={[styles.consumableDesc, { color: Colors.textSecondary }]}>{def.description}</Text>
                    </View>
                    {isEquipped && <Ionicons name="checkmark-circle" size={20} color={Colors.accentBright} />}
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          )}
          <AnimatedPressable style={[styles.pickerDone, { backgroundColor: Colors.accent }]} onPress={() => setTitlePickerVisible(false)}>
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

  heroCard: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heroIconContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  heroIconGlow: { position: 'absolute', width: 96, height: 96, borderRadius: 48 },
  heroIconWrap: { width: 80, height: 80, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  heroInfo: { flex: 1, gap: 4, justifyContent: 'center', paddingRight: Spacing.lg },
  heroLevel: { fontSize: FontSize.xxxl, fontFamily: FontFamily.extraBold },
  heroTierTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  heroXP: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  heroNext: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  shareBtn: { position: 'absolute', top: Spacing.md, right: Spacing.md, padding: Spacing.xs, zIndex: 1 },

  coinChip: { position: 'absolute', top: Spacing.md, left: Spacing.md, borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 3, zIndex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  coinChipText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold },

  prestigeStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 },

  ascendBtn: { borderRadius: Radius.full, borderWidth: 1.5, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, alignSelf: 'center' },
  ascendBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, letterSpacing: 0.5 },

  titleLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, letterSpacing: 0.5, marginTop: 2 },

  pickerSublabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  featureSlots: { flexDirection: 'row', gap: Spacing.sm },
  featureSlot: { flex: 1, minHeight: 96, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs },
  featureSlotFilled: { flex: 1, minHeight: 104, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, position: 'relative' },
  featureSlotLabel: { fontSize: FontSize.sm, textAlign: 'center', fontFamily: FontFamily.semiBold },
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
  statLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, textAlign: 'center', alignSelf: 'stretch' },

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

  // Season / track card
  trackCard: { borderRadius: Radius.lg, padding: Spacing.md },
  trackName: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  trackSub: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, marginTop: 2 },

  // Inventory
  shardRow: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, gap: Spacing.sm },
  shardInfo: { flex: 1, gap: 4 },
  shardCountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  shardCount: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  shardBarBg: { height: 6, borderRadius: Radius.full, overflow: 'hidden' },
  shardBarFill: { height: 6, borderRadius: Radius.full },
  boostBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 3 },
  boostBadgeText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold },
  craftBtn: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  craftBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },

  consumableCard: { width: 120, borderRadius: Radius.lg, padding: Spacing.sm, borderWidth: 1, gap: 4, alignItems: 'center' },
  consumableLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, textAlign: 'center' },
  consumableDesc: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, textAlign: 'center', color: 'gray' },
  useBtn: { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 3, marginTop: 4 },
  useBtnText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold },
  emptyInventory: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, textAlign: 'center', paddingVertical: Spacing.sm },

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
