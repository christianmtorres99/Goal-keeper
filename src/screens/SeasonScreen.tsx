import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { FontFamily, FontSize, hexAlpha, Radius, Spacing, TextStyle } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import { useSeasonStore } from '../store/seasonStore';
import { useCoinStore } from '../store/coinStore';
import { useLogStore } from '../store/logStore';
import { useGoalStore } from '../store/goalStore';
import { useRaidStore } from '../store/raidStore';
import { useBadgeStore } from '../store/badgeStore';
import { getCurrentSeason, getPastSeasons } from '../constants/seasons';
import { todayString, formatDisplayDate, daysBetween } from '../utils/dateUtils';
import { computeStreakWithGrace } from '../logic/streakEngine';
import type { SeasonChallenge, SeasonDefinition, Log, Goal } from '../types';

// ── Progress computation ──────────────────────────────────────────────────────

function getChallengeProgress(
  challenge: SeasonChallenge,
  logs: Log[],
  goals: Goal[],
  defeatedBossIds: string[],
  season: SeasonDefinition,
): number {
  const seasonLogs = logs.filter(
    l => l.logDate >= season.startDate && l.logDate <= season.endDate,
  );

  switch (challenge.type) {
    case 'total_logs_distinct': {
      const distinctDates = new Set(seasonLogs.map(l => l.logDate));
      return distinctDates.size;
    }

    case 'streak_reach': {
      // For each goal, compute streak from all logs (not just season) and take the max
      const goalGroups: Record<string, Log[]> = {};
      logs.forEach(l => {
        if (!goalGroups[l.goalId]) goalGroups[l.goalId] = [];
        goalGroups[l.goalId].push(l);
      });
      let maxStreak = 0;
      for (const goalId of Object.keys(goalGroups)) {
        const info = computeStreakWithGrace(goalGroups[goalId], false, null);
        const best = Math.max(info.currentStreak, info.longestStreak);
        if (best > maxStreak) maxStreak = best;
      }
      return maxStreak;
    }

    case 'quest_count': {
      // Approximate: count distinct days within the season where the user logged any goal
      const distinctDates = new Set(seasonLogs.map(l => l.logDate));
      return distinctDates.size;
    }

    case 'boss_defeat': {
      // defeatedBossIds format: 'definitionId:startDate'
      let count = 0;
      for (const key of defeatedBossIds) {
        const colonIdx = key.indexOf(':');
        if (colonIdx === -1) continue;
        const startDate = key.slice(colonIdx + 1);
        if (startDate >= season.startDate && startDate <= season.endDate) {
          count++;
        }
      }
      return count;
    }

    case 'category_logs': {
      const goalIdsByCategory = new Set(
        goals
          .filter(g => g.category === challenge.category)
          .map(g => g.id),
      );
      return seasonLogs.filter(l => goalIdsByCategory.has(l.goalId)).length;
    }

    case 'consecutive_days': {
      // Longest consecutive run of distinct log dates within the season
      const distinctDates = [...new Set(seasonLogs.map(l => l.logDate))].sort();
      if (distinctDates.length === 0) return 0;
      let best = 1;
      let run = 1;
      for (let i = 1; i < distinctDates.length; i++) {
        if (daysBetween(distinctDates[i - 1], distinctDates[i]) === 1) {
          run++;
          if (run > best) best = run;
        } else {
          run = 1;
        }
      }
      return best;
    }

    default:
      return 0;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysRemaining(endDate: string): number {
  const today = todayString();
  if (today > endDate) return -1;
  return daysBetween(today, endDate);
}

// ── Challenge Card ────────────────────────────────────────────────────────────

interface ChallengeCardProps {
  challenge: SeasonChallenge;
  progress: number;
  isClaimed: boolean;
  accentColor: string;
  onClaim: () => void;
}

function ChallengeCard({ challenge, progress, isClaimed, accentColor, onClaim }: ChallengeCardProps) {
  const { colors: Colors } = useColors();
  const pct = Math.min(progress / challenge.target, 1);
  const isComplete = progress >= challenge.target;

  return (
    <View
      style={[
        styles.challengeCard,
        {
          backgroundColor: Colors.bg2,
          borderColor: isClaimed ? hexAlpha(accentColor, 0.5) : Colors.border,
        },
      ]}
    >
      <View style={styles.challengeHeader}>
        <View style={styles.challengeTitleRow}>
          <Text style={[styles.challengeTitle, { color: Colors.textPrimary }]}>
            {challenge.title}
          </Text>
          {isClaimed && (
            <View style={[styles.claimedBadge, { backgroundColor: hexAlpha(Colors.success, 0.2) }]}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={[styles.claimedText, { color: Colors.success }]}>Claimed</Text>
            </View>
          )}
        </View>
        <View style={[styles.coinBadge, { backgroundColor: hexAlpha(accentColor, 0.15) }]}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={[styles.coinAmount, { color: accentColor }]}>{challenge.coinReward}</Text>
        </View>
      </View>

      <Text style={[styles.challengeDesc, { color: Colors.textSecondary }]}>
        {challenge.description}
      </Text>

      <View style={styles.progressRow}>
        <View style={[styles.progressTrack, { backgroundColor: Colors.bg3 }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct * 100}%`, backgroundColor: isClaimed ? Colors.success : accentColor },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: Colors.textSecondary }]}>
          {Math.min(progress, challenge.target)}/{challenge.target}
        </Text>
      </View>

      {isComplete && !isClaimed && (
        <TouchableOpacity
          style={[styles.claimBtn, { backgroundColor: accentColor }]}
          onPress={onClaim}
          activeOpacity={0.8}
        >
          <Text style={styles.claimBtnText}>Claim Reward</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function SeasonScreen() {
  const { colors: Colors } = useColors();
  const { logs } = useLogStore();
  const { goals } = useGoalStore();
  const { defeatedBossIds } = useRaidStore();
  const {
    completedChallengeIds,
    claimedSeasonIds,
    completeChallenge,
    claimSeason,
  } = useSeasonStore();
  const { addCoins } = useCoinStore();
  const { checkAndAwardGlobal } = useBadgeStore();

  const today = useMemo(() => todayString(), []);
  const season = useMemo(() => getCurrentSeason(today), [today]);
  const pastSeasons = useMemo(() => getPastSeasons(today), [today]);

  const challengeProgresses = useMemo(() => {
    if (!season) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const c of season.challenges) {
      map[c.id] = getChallengeProgress(c, logs, goals, defeatedBossIds, season);
    }
    return map;
  }, [season, logs, goals, defeatedBossIds]);

  const allChallengesClaimed = useMemo(() => {
    if (!season) return false;
    return season.challenges.every(c => completedChallengeIds.includes(c.id));
  }, [season, completedChallengeIds]);

  const seasonClaimed = season ? claimedSeasonIds.includes(season.id) : false;
  const daysRemaining = season ? getDaysRemaining(season.endDate) : -1;

  const handleClaimChallenge = async (challenge: SeasonChallenge) => {
    const wasNew = await completeChallenge(challenge.id);
    if (wasNew) {
      await addCoins(challenge.coinReward);
    }
  };

  const handleClaimSeason = async () => {
    if (!season) return;
    Alert.alert(
      'Claim Season Reward',
      `Claim ${season.completionCoinBonus} bonus coins and your season badge?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim',
          onPress: async () => {
            await claimSeason(season.id);
            await addCoins(season.completionCoinBonus);
            await checkAndAwardGlobal({});
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Season Header ── */}
        {season ? (
          <LinearGradient
            colors={[season.accentColor, '#FFFFFF22']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerTop}>
              <Ionicons name={season.icon as any} size={32} color="#FFF" />
              <View style={styles.headerTextWrap}>
                <Text style={styles.seasonName}>{season.name}</Text>
                <Text style={styles.seasonDates}>
                  {formatDisplayDate(season.startDate)} – {formatDisplayDate(season.endDate)}
                </Text>
              </View>
            </View>
            <View style={[styles.countdownBadge, { backgroundColor: 'rgba(0,0,0,0.28)' }]}>
              <Ionicons name="time-outline" size={14} color="#FFF" />
              <Text style={styles.countdownText}>
                {daysRemaining < 0 ? 'Season ended' : `${daysRemaining} days remaining`}
              </Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.noSeasonCard, { backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
            <Ionicons name="calendar-outline" size={32} color={Colors.textSecondary} />
            <Text style={[styles.noSeasonText, { color: Colors.textSecondary }]}>
              No active season right now
            </Text>
          </View>
        )}

        {/* ── Challenges ── */}
        {season && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBar, { backgroundColor: season.accentColor }]} />
              <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Challenges</Text>
            </View>

            {season.challenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                progress={challengeProgresses[challenge.id] ?? 0}
                isClaimed={completedChallengeIds.includes(challenge.id)}
                accentColor={season.accentColor}
                onClaim={() => handleClaimChallenge(challenge)}
              />
            ))}

            {/* ── Season Trophy ── */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBar, { backgroundColor: season.accentColor }]} />
              <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Season Trophy</Text>
            </View>

            <View
              style={[
                styles.trophyCard,
                {
                  backgroundColor: Colors.bg2,
                  borderColor: allChallengesClaimed
                    ? hexAlpha(season.accentColor, 0.5)
                    : Colors.border,
                },
              ]}
            >
              {seasonClaimed ? (
                <View style={styles.trophyContent}>
                  <Ionicons name="trophy" size={40} color={season.accentColor} />
                  <Text style={[styles.trophyTitle, { color: Colors.textPrimary }]}>
                    Season Complete!
                  </Text>
                  <Text style={[styles.trophyDesc, { color: Colors.textSecondary }]}>
                    You've conquered {season.name}. Well done!
                  </Text>
                </View>
              ) : allChallengesClaimed ? (
                <View style={styles.trophyContent}>
                  <Ionicons name="trophy-outline" size={40} color={season.accentColor} />
                  <Text style={[styles.trophyTitle, { color: Colors.textPrimary }]}>
                    All Challenges Complete!
                  </Text>
                  <Text style={[styles.trophyDesc, { color: Colors.textSecondary }]}>
                    Claim your season badge and {season.completionCoinBonus} bonus coins.
                  </Text>
                  <TouchableOpacity
                    style={[styles.claimSeasonBtn, { backgroundColor: season.accentColor }]}
                    onPress={handleClaimSeason}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="gift-outline" size={16} color="#FFF" />
                    <Text style={styles.claimSeasonBtnText}>Claim Season Reward</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.trophyContent}>
                  <View
                    style={[
                      styles.trophyLock,
                      { backgroundColor: hexAlpha(Colors.textDisabled, 0.15) },
                    ]}
                  >
                    <Ionicons name="lock-closed-outline" size={32} color={Colors.textDisabled} />
                  </View>
                  <Text style={[styles.trophyTitle, { color: Colors.textSecondary }]}>
                    Season Trophy Locked
                  </Text>
                  <Text style={[styles.trophyDesc, { color: Colors.textDisabled }]}>
                    Complete and claim all challenges to unlock the season trophy.
                  </Text>
                  <Text style={[styles.trophyProgress, { color: Colors.textSecondary }]}>
                    {
                      completedChallengeIds.filter(id =>
                        season.challenges.some(c => c.id === id),
                      ).length
                    }
                    /{season.challenges.length} challenges claimed
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Past Seasons ── */}
        {pastSeasons.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBar, { backgroundColor: Colors.accentBright }]} />
              <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Past Seasons</Text>
            </View>

            {pastSeasons.map(ps => {
              const claimed = claimedSeasonIds.includes(ps.id);
              return (
                <View
                  key={ps.id}
                  style={[
                    styles.pastSeasonRow,
                    {
                      backgroundColor: Colors.bg2,
                      borderColor: claimed ? hexAlpha(ps.accentColor, 0.4) : Colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.pastSeasonIcon,
                      { backgroundColor: hexAlpha(ps.accentColor, 0.15) },
                    ]}
                  >
                    <Ionicons name={ps.icon as any} size={20} color={ps.accentColor} />
                  </View>
                  <View style={styles.pastSeasonInfo}>
                    <Text style={[styles.pastSeasonName, { color: Colors.textPrimary }]}>
                      {ps.name}
                    </Text>
                    <Text style={[styles.pastSeasonDates, { color: Colors.textSecondary }]}>
                      {formatDisplayDate(ps.startDate)} – {formatDisplayDate(ps.endDate)}
                    </Text>
                  </View>
                  {claimed ? (
                    <Ionicons name="trophy" size={20} color={ps.accentColor} />
                  ) : (
                    <Ionicons name="lock-closed-outline" size={16} color={Colors.textDisabled} />
                  )}
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: Spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  // Header
  headerGradient: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerTextWrap: { flex: 1, gap: 2 },
  seasonName: { fontSize: FontSize.xl, fontFamily: FontFamily.bold, color: '#FFF' },
  seasonDates: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.8)' },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  countdownText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold, color: '#FFF' },

  noSeasonCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  noSeasonText: { fontSize: FontSize.md, fontFamily: FontFamily.regular },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionBar: { width: 3, height: 16, borderRadius: Radius.full },

  // Challenge cards
  challengeCard: { borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1 },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  challengeTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.xs },
  challengeTitle: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  claimedText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  coinEmoji: { fontSize: 12 },
  coinAmount: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },
  challengeDesc: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressTrack: { flex: 1, height: 8, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.full },
  progressLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, minWidth: 36, textAlign: 'right' },
  claimBtn: { borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center', marginTop: Spacing.xs },
  claimBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: '#FFF' },

  // Trophy section
  trophyCard: { borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: 1 },
  trophyContent: { alignItems: 'center', gap: Spacing.md },
  trophyLock: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  trophyTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, textAlign: 'center' },
  trophyDesc: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, textAlign: 'center' },
  trophyProgress: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  claimSeasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xs,
  },
  claimSeasonBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: '#FFF' },

  // Past seasons
  pastSeasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  pastSeasonIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastSeasonInfo: { flex: 1 },
  pastSeasonName: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  pastSeasonDates: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
});
