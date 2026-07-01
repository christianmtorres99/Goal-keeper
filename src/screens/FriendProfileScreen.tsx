import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, hexAlpha, Radius, Spacing } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import { useFriendsStore } from '../store/friendsStore';
import type { FriendEntry } from '../store/friendsStore';
import { useGameStore } from '../store/gameStore';
import { useLogStore } from '../store/logStore';
import { useTodoXPStore } from '../store/todoXPStore';
import { getPlayerStats } from '../logic/xpEngine';
import { sumXP } from '../utils/xpUtils';
import { getFriendPublicGoals } from '../services/friendsService';
import type { PublicGoal } from '../services/friendsService';
import { BADGE_DEFINITIONS } from '../constants/badges';

const AVATAR_COLORS = ['#7C3AED', '#0891B2', '#059669', '#DC2626', '#D97706', '#EC4899'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function formatXP(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

type HeadToHeadStat = { label: string; mine: string; theirs: string; mineWins: boolean; theirsWins: boolean };

interface Props {
  route: {
    params: {
      uid: string;
      displayName: string;
      level: number;
      xp: number;
      bestStreak: number;
      equippedTitle?: string;
      topBadgeIds?: string[];
      pushToken?: string | null;
    };
  };
}

export default function FriendProfileScreen({ route }: Props) {
  const { uid, displayName, level, xp, bestStreak, equippedTitle, topBadgeIds = [], pushToken } = route.params;
  const { colors: Colors } = useColors();

  const { cheerFriend, canCheer } = useFriendsStore();
  const logs = useLogStore(s => s.logs);
  const todoXP = useTodoXPStore(s => s.totalXP);
  const { getAdjustedXP, userName, personalRecords } = useGameStore();

  const myAdjustedXP = getAdjustedXP(sumXP(logs) + todoXP);
  const { level: myLevel } = getPlayerStats(myAdjustedXP);

  const [publicGoals, setPublicGoals] = useState<PublicGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [cheerAvailable, setCheerAvailable] = useState(false);
  const [cheerSent, setCheerSent] = useState(false);

  const color = avatarColor(displayName);
  const initial = (displayName || '?')[0].toUpperCase();

  useEffect(() => {
    let mounted = true;
    setGoalsLoading(true);
    getFriendPublicGoals(uid)
      .then(goals => { if (mounted) setPublicGoals(goals); })
      .catch(() => {})
      .finally(() => { if (mounted) setGoalsLoading(false); });

    canCheer(uid).then(ok => { if (mounted) setCheerAvailable(ok); });

    return () => { mounted = false; };
  }, [uid]);

  const handleCheer = useCallback(async () => {
    if (!cheerAvailable || cheerSent) return;
    const ok = await cheerFriend(uid, pushToken ?? null);
    if (ok) {
      setCheerSent(true);
      setCheerAvailable(false);
      Alert.alert('Cheer sent! 🎉', `${displayName} will be notified that you're cheering them on.`);
    } else {
      Alert.alert('Already cheered today', `You can cheer ${displayName} again in 24 hours.`);
    }
  }, [cheerAvailable, cheerSent, uid, pushToken, displayName, cheerFriend]);

  const stats: HeadToHeadStat[] = [
    {
      label: 'Level',
      mine: String(myLevel),
      theirs: String(level),
      mineWins: myLevel > level,
      theirsWins: level > myLevel,
    },
    {
      label: 'XP',
      mine: formatXP(myAdjustedXP),
      theirs: formatXP(xp),
      mineWins: myAdjustedXP > xp,
      theirsWins: xp > myAdjustedXP,
    },
    {
      label: 'Best Streak',
      mine: `${personalRecords.longestStreak}d`,
      theirs: `${bestStreak}d`,
      mineWins: personalRecords.longestStreak > bestStreak,
      theirsWins: bestStreak > personalRecords.longestStreak,
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.heroSection}>
          <View style={[styles.avatar, { backgroundColor: hexAlpha(color, 0.2), borderColor: hexAlpha(color, 0.5) }]}>
            <Text style={[styles.avatarText, { color }]}>{initial}</Text>
          </View>
          <Text style={[styles.name, { color: Colors.textPrimary }]}>{displayName}</Text>
          {equippedTitle ? (
            <Text style={[styles.title, { color: Colors.accentBright }]}>{equippedTitle}</Text>
          ) : null}
          {/* Cheer button */}
          <TouchableOpacity
            style={[
              styles.cheerBtn,
              {
                backgroundColor: cheerSent || !cheerAvailable
                  ? hexAlpha(Colors.textDisabled, 0.1)
                  : hexAlpha(Colors.warning, 0.15),
                borderColor: cheerSent || !cheerAvailable
                  ? Colors.border
                  : Colors.warning,
              },
            ]}
            onPress={handleCheer}
            disabled={cheerSent || !cheerAvailable}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 18 }}>🎉</Text>
            <Text style={[styles.cheerText, { color: cheerSent || !cheerAvailable ? Colors.textDisabled : Colors.warning }]}>
              {cheerSent ? 'Cheer sent!' : cheerAvailable ? 'Cheer on' : 'Cheered today'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Head-to-head */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: Colors.accentBright }]} />
          <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>HEAD TO HEAD</Text>
        </View>
        <View style={[styles.h2hCard, { backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
          <View style={styles.h2hHeader}>
            <Text style={[styles.h2hName, { color: Colors.textPrimary }]} numberOfLines={1}>
              {userName.trim() || 'You'}
            </Text>
            <Text style={[styles.h2hVs, { color: Colors.textDisabled }]}>VS</Text>
            <Text style={[styles.h2hName, { color: Colors.textPrimary, textAlign: 'right' }]} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
          {stats.map(s => (
            <View key={s.label} style={styles.h2hRow}>
              <Text style={[
                styles.h2hValue,
                { color: s.mineWins ? Colors.success : Colors.textPrimary, textAlign: 'left' },
              ]}>
                {s.mine}
              </Text>
              <Text style={[styles.h2hRowLabel, { color: Colors.textDisabled }]}>{s.label}</Text>
              <Text style={[
                styles.h2hValue,
                { color: s.theirsWins ? Colors.success : Colors.textPrimary, textAlign: 'right' },
              ]}>
                {s.theirs}
              </Text>
            </View>
          ))}
        </View>

        {/* Badges */}
        {topBadgeIds.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBar, { backgroundColor: Colors.warning }]} />
              <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>ACHIEVEMENTS</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
              {topBadgeIds.map(id => {
                const def = BADGE_DEFINITIONS.find(b => b.id === id);
                if (!def) return null;
                return (
                  <View key={id} style={[styles.badgeChip, { backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
                    <Ionicons name={def.icon as any} size={24} color={Colors.accentBright} />
                    <Text style={[styles.badgeLabel, { color: Colors.textSecondary }]} numberOfLines={2}>{def.label}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Public goals */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: Colors.success }]} />
          <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>PUBLIC GOALS</Text>
        </View>
        {goalsLoading ? (
          <ActivityIndicator color={Colors.accentBright} style={{ marginTop: Spacing.lg }} />
        ) : publicGoals.length === 0 ? (
          <Text style={[styles.emptyText, { color: Colors.textDisabled }]}>
            No public goals to show.
          </Text>
        ) : (
          publicGoals.map(goal => (
            <View key={goal.goalId} style={[styles.goalRow, { backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
              <View style={[styles.goalIcon, { backgroundColor: hexAlpha(goal.color, 0.2) }]}>
                <Ionicons name={goal.icon as any} size={18} color={goal.color} />
              </View>
              <View style={styles.goalMid}>
                <Text style={[styles.goalName, { color: Colors.textPrimary }]} numberOfLines={1}>{goal.name}</Text>
                <Text style={[styles.goalMeta, { color: Colors.textDisabled }]}>{goal.totalLogs} logs</Text>
              </View>
              {goal.currentStreak > 0 && (
                <View style={styles.streakChip}>
                  <Ionicons name="flame" size={13} color="#F97316" />
                  <Text style={[styles.streakText, { color: '#F97316' }]}>{goal.currentStreak}</Text>
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  heroSection: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText: { fontSize: 30, fontFamily: FontFamily.extraBold },
  name: { fontSize: FontSize.xxl, fontFamily: FontFamily.bold },
  title: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },

  cheerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderWidth: 1, marginTop: Spacing.xs,
  },
  cheerText: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  sectionBar: { width: 3, height: 14, borderRadius: Radius.full },
  sectionLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, letterSpacing: 1 },

  h2hCard: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  h2hHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  h2hName: { flex: 1, fontSize: FontSize.md, fontFamily: FontFamily.bold },
  h2hVs: { fontSize: FontSize.xs, fontFamily: FontFamily.extraBold, marginHorizontal: Spacing.sm },
  h2hRow: { flexDirection: 'row', alignItems: 'center' },
  h2hValue: { flex: 1, fontSize: FontSize.lg, fontFamily: FontFamily.extraBold },
  h2hRowLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, textAlign: 'center' },

  badgeRow: { gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  badgeChip: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.sm, alignItems: 'center', gap: 6, width: 80 },
  badgeLabel: { fontSize: 10, textAlign: 'center', fontFamily: FontFamily.regular },

  goalRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1,
  },
  goalIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  goalMid: { flex: 1 },
  goalName: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  goalMeta: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, marginTop: 2 },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streakText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },

  emptyText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, textAlign: 'center', marginTop: Spacing.lg },
});
