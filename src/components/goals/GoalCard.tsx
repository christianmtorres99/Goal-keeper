import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, FontFamily, hexAlpha, Radius, Spacing } from '../../constants/theme';
import { Elevation } from '../../constants/elevation';
import { Spring, Timing, Stagger } from '../../constants/motion';
import { useColors } from '../../hooks/useColors';
import type { Goal, Log, StreakInfo } from '../../types';
import { getPlayerStats, getStreakMultiplier } from '../../logic/xpEngine';
import { sumXP } from '../../utils/xpUtils';
import XPBar from '../common/XPBar';
import { isAlreadyLoggedToday } from '../../logic/streakEngine';
import StreakFlame from '../common/StreakFlame';
import AnimatedPressable from '../common/AnimatedPressable';
import { useLogStore } from '../../store/logStore';
import { useRestDayStore } from '../../store/restDayStore';
import { todayString } from '../../utils/dateUtils';
import { getNextStreakBadge, getNextLogBadge } from '../../utils/motivationUtils';

const BASE_LOG_XP = 50;

interface Props {
  goal: Goal;
  logs: Log[];
  streakInfo: StreakInfo;
  onPress: () => void;
  onLog: () => void;
  isDragging?: boolean;
  dragHandle?: React.ReactNode;
  isDailyDouble?: boolean;
  animateSignal?: number;
  index?: number;
}

export default function GoalCard({ goal, logs, streakInfo, onPress, onLog, isDragging, dragHandle, isDailyDouble, animateSignal, index = 0 }: Props) {
  const { colors: Colors, isLight } = useColors();
  const totalXP = sumXP(logs);
  const stats = getPlayerStats(totalXP);
  const baseLoggedToday = isAlreadyLoggedToday(logs);
  const multiplier = getStreakMultiplier(streakInfo.currentStreak);
  const hour = new Date().getHours();
  const graceState = useLogStore(s => s.graceStates[goal.id]);
  const graceUsed = graceState?.graceDayUsed ?? false;
  const activeRestDate = useRestDayStore(s => s.activeRestDate);
  const isRestDay = activeRestDate === todayString();

  const todayStr = todayString();
  const todayLogs = logs.filter(l => l.goalId === goal.id && l.logDate === todayStr);
  const todayCountTotal = goal.type === 'count'
    ? todayLogs.reduce((sum, l) => sum + (l.count ?? 1), 0)
    : 0;
  const countGoalComplete = goal.type === 'count' && goal.targetCount
    ? todayCountTotal >= goal.targetCount
    : false;

  const loggedToday = goal.type === 'count' ? countGoalComplete : baseLoggedToday;
  const isAtRisk = goal.type === 'habit' && !loggedToday && hour >= 12;

  const nextStreakBadge = goal.type === 'habit' ? getNextStreakBadge(streakInfo.currentStreak) : null;
  const nextLogBadge = getNextLogBadge(logs.length);
  const nextBadgeLabel = nextStreakBadge
    ? `${nextStreakBadge.daysLeft}d to ${nextStreakBadge.name}`
    : nextLogBadge
    ? `${nextLogBadge.logsLeft} logs to ${nextLogBadge.name}`
    : null;

  const streakDisplay = streakInfo.currentStreak === 0 && goal.type === 'habit' && !loggedToday
    ? 'Start!'
    : `${streakInfo.currentStreak}d`;

  const fillPct = goal.type === 'count' && goal.targetCount
    ? Math.min(100, (todayCountTotal / goal.targetCount) * 100)
    : 0;

  const progressAnim = useSharedValue(fillPct / 100);

  useEffect(() => {
    progressAnim.value = withTiming(fillPct / 100, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [fillPct]);

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%` as any,
  }));

  const buttonScale = useSharedValue(1);
  const xpOpacity = useSharedValue(0);
  const xpTranslateY = useSharedValue(0);

  // Stagger entrance
  const enterY = useSharedValue(16);
  const enterOpacity = useSharedValue(0);

  useEffect(() => {
    enterY.value = withDelay(index * Stagger.item, withSpring(0, Spring.snappy));
    enterOpacity.value = withDelay(index * Stagger.item, withTiming(1, { duration: Timing.fast }));
  }, []);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterY.value }],
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const animatedXPStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    opacity: xpOpacity.value,
    transform: [{ translateY: xpTranslateY.value }],
  }));

  const triggerLogAnimation = useCallback(() => {
    buttonScale.value = withSequence(
      withTiming(0.9, { duration: 80 }),
      withSpring(1.05, Spring.bouncy),
      withSpring(1.0, Spring.snappy)
    );
    xpTranslateY.value = 0;
    xpOpacity.value = 1;
    xpTranslateY.value = withTiming(-60, { duration: 600 });
    xpOpacity.value = withDelay(250, withTiming(0, { duration: 350 }));
  }, []);

  useEffect(() => {
    if (animateSignal && animateSignal > 0) {
      triggerLogAnimation();
    }
  }, [animateSignal]);

  const handleLog = useCallback(() => {
    onLog();
  }, [onLog]);

  const xpLabel = `+${Math.round(BASE_LOG_XP * multiplier)} XP`;
  const doneBtnStyle = loggedToday && !goal.allowMultiplePerDay && goal.type !== 'count';

  const streakIsHot = streakInfo.currentStreak >= 7;
  const streakIsLong = streakInfo.currentStreak >= 30;

  return (
    <Animated.View style={enterStyle}>
      <AnimatedPressable
        scale={0.98}
        onPress={onPress}
        style={[
          styles.card,
          isDragging && styles.cardDragging,
          isDragging && Elevation.high,
          {
            backgroundColor: Colors.bg1,
            borderWidth: 1,
            borderColor: isAtRisk ? hexAlpha(Colors.warning, 0.40) : Colors.border,
          },
        ]}
      >
        {/* Color wash */}
        <View
          pointerEvents="none"
          style={[styles.colorWash, {
            backgroundColor: hexAlpha(isAtRisk ? Colors.warning : goal.color, 0.07),
            borderTopLeftRadius: Radius.lg,
            borderTopRightRadius: Radius.lg,
          }]}
        />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.iconName}>
              <View style={[styles.iconWrap, { backgroundColor: hexAlpha(goal.color, 0.15) }]}>
                <Ionicons name={goal.icon as any} size={20} color={goal.color} />
              </View>
              <Text style={[styles.name, { color: Colors.textPrimary }]} numberOfLines={2}>{goal.name}</Text>
            </View>
            <View style={styles.topRight}>
              {isDailyDouble && (
                <View style={[styles.doubleBadge, { backgroundColor: hexAlpha(Colors.warning, 0.13), borderColor: hexAlpha(Colors.warning, 0.27) }]}>
                  <Text style={[styles.doubleText, { color: Colors.warning }]}>2×</Text>
                </View>
              )}
              {graceUsed && !isAtRisk && (
                <View style={[styles.graceBadge, { backgroundColor: hexAlpha(Colors.warning, 0.09) }]}>
                  <Ionicons name="shield-checkmark" size={11} color={Colors.warning} />
                  <Text style={[styles.graceBadgeText, { color: Colors.warning }]}>Grace</Text>
                </View>
              )}
              {isAtRisk && (
                <View style={[styles.atRiskBadge, { backgroundColor: hexAlpha(Colors.warning, 0.13) }]}>
                  <Ionicons name="warning" size={11} color={Colors.warning} />
                  <Text style={[styles.atRiskText, { color: Colors.warning }]}>Log today!</Text>
                </View>
              )}
              <View style={[
                styles.streakBadge,
                { backgroundColor: streakIsHot ? hexAlpha(Colors.warning, 0.13) : Colors.bg3 },
                streakIsLong && Elevation.low,
              ]}>
                <StreakFlame streak={streakInfo.currentStreak} size={18} />
                <Text style={[
                  styles.streakText,
                  { color: streakInfo.currentStreak > 0 ? Colors.warning : Colors.textDisabled },
                ]}>
                  {streakDisplay}
                </Text>
              </View>
            </View>
          </View>

          <XPBar stats={stats} compact />

          {nextBadgeLabel && (
            <View style={styles.nextBadgeRow}>
              <Ionicons name="flash" size={10} color={Colors.accentBright} />
              <Text style={[styles.nextBadgeText, { color: Colors.accentBright }]}>{nextBadgeLabel}</Text>
            </View>
          )}

          {goal.type === 'count' && goal.targetCount && (
            <View style={styles.countProgressWrapper}>
              <Text style={[styles.countProgressText, { color: Colors.textSecondary }]}>
                {todayCountTotal.toLocaleString()} / {goal.targetCount.toLocaleString()} {goal.unit ?? ''}
              </Text>
              <View style={[styles.countProgressBar, { backgroundColor: Colors.bg3 }]}>
                <Animated.View style={[styles.countProgressFill, progressFillStyle, {
                  backgroundColor: countGoalComplete ? Colors.success : goal.color,
                }]} />
              </View>
            </View>
          )}

          <View style={styles.bottomRow}>
            {multiplier > 1 && (
              <Text style={[styles.multiplier, { color: Colors.accentBright, backgroundColor: isLight ? Colors.bg3 : Colors.accentDim }]}>{multiplier}× XP</Text>
            )}
            {goal.type === 'milestone' && goal.targetCount && (
              <Text style={[styles.milestoneText, { color: Colors.textSecondary }]}>
                {logs.length}/{goal.targetCount} {goal.unit ?? ''}
              </Text>
            )}
            <View style={{ flex: 1 }} />

            {isRestDay ? (
              <View style={[styles.restDayBadge, { backgroundColor: Colors.accentDim }]}>
                <Text style={[styles.restDayText, { color: Colors.textSecondary }]}>Rest Day</Text>
              </View>
            ) : (
              <View style={styles.logBtnWrapper}>
                <Animated.Text style={[styles.xpFloat, { color: Colors.accentBright }, animatedXPStyle]} pointerEvents="none">
                  {xpLabel}
                </Animated.Text>
                <Animated.View style={animatedButtonStyle}>
                  <AnimatedPressable
                    scale={0.92}
                    style={[
                      styles.logBtn,
                      { backgroundColor: Colors.accent },
                      doneBtnStyle && { backgroundColor: hexAlpha(Colors.success, 0.13), borderWidth: 1, borderColor: hexAlpha(Colors.success, 0.33) },
                    ]}
                    onPress={handleLog}
                    disabled={doneBtnStyle}
                  >
                    <Ionicons
                      name={doneBtnStyle ? 'checkmark-circle' : 'add'}
                      size={18}
                      color={doneBtnStyle ? Colors.success : Colors.textPrimary}
                    />
                    <Text style={[
                      styles.logBtnText,
                      { color: Colors.textPrimary },
                      doneBtnStyle && { color: Colors.success },
                    ]}>
                      {goal.type === 'count' ? (countGoalComplete ? 'Done' : 'Add') : goal.allowMultiplePerDay ? 'Log' : loggedToday ? 'Done' : 'Log'}
                    </Text>
                  </AnimatedPressable>
                </Animated.View>
              </View>
            )}

            {dragHandle && <View style={styles.dragHandle}>{dragHandle}</View>}
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  cardDragging: { opacity: 0.9 },
  colorWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  body: { flex: 1, padding: 12, gap: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconName: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  iconWrap: { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold, flex: 1, lineHeight: FontSize.md * 1.4 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  atRiskBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: Radius.sm, paddingHorizontal: Spacing.xs, paddingVertical: 2 },
  atRiskText: { fontSize: 10, fontFamily: FontFamily.bold },
  graceBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: Radius.sm, paddingHorizontal: Spacing.xs, paddingVertical: 2 },
  graceBadgeText: { fontSize: 10, fontFamily: FontFamily.semiBold },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  streakText: { fontSize: FontSize.md, fontFamily: FontFamily.bold },
  nextBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextBadgeText: { fontSize: 11, fontFamily: FontFamily.semiBold },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  multiplier: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  milestoneText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  logBtnWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpFloat: {
    fontSize: 18,
    fontFamily: FontFamily.semiBold,
  },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2 },
  logBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },
  dragHandle: { marginLeft: Spacing.xs },
  restDayBadge: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  restDayText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  doubleBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.sm, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1 },
  doubleText: { fontSize: 10, fontFamily: FontFamily.extraBold },
  countProgressWrapper: { gap: 4, marginTop: 4 },
  countProgressText: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  countProgressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  countProgressFill: { height: '100%', borderRadius: 2 },
});
