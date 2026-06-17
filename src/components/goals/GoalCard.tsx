import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
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

const BASE_LOG_XP = 50;

interface Props {
  goal: Goal;
  logs: Log[];
  streakInfo: StreakInfo;
  onPress: () => void;
  onLog: () => void;
  onRelapse?: () => void;
  isDragging?: boolean;
  dragHandle?: React.ReactNode;
  isDailyDouble?: boolean;
  animateSignal?: number;
  index?: number;
}

export default function GoalCard({ goal, logs, streakInfo, onPress, onLog, onRelapse, isDragging, dragHandle, isDailyDouble, animateSignal, index = 0 }: Props) {
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
  const isAtRisk = (goal.type === 'habit' || goal.type === 'quit') && !loggedToday && hour >= 12;

  const streakDisplay = goal.type === 'quit'
    ? `${streakInfo.currentStreak}d`
    : streakInfo.currentStreak === 0 && goal.type === 'habit' && !loggedToday
    ? '0d'
    : `${streakInfo.currentStreak}d`;

  const xpOpacity = useSharedValue(0);
  const xpTranslateY = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  // Stagger entrance
  const enterY = useSharedValue(12);
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
    right: 0,
    top: -22,
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
    xpTranslateY.value = withTiming(-20, { duration: 600 });
    xpOpacity.value = withDelay(250, withTiming(0, { duration: 350 }));
  }, []);

  useEffect(() => {
    if (animateSignal && animateSignal > 0) {
      triggerLogAnimation();
    }
  }, [animateSignal]);

  const handleLog = useCallback(() => { onLog(); }, [onLog]);

  const xpLabel = `+${Math.round(BASE_LOG_XP * multiplier)} XP`;
  const doneBtnStyle = loggedToday && !goal.allowMultiplePerDay && goal.type !== 'count';

  const borderColor = isAtRisk
    ? hexAlpha(Colors.warning, 0.55)
    : loggedToday
    ? hexAlpha(Colors.success, 0.35)
    : Colors.border;

  return (
    <Animated.View style={enterStyle}>
      <AnimatedPressable
        scale={0.98}
        onPress={onPress}
        style={[
          styles.card,
          isDragging && styles.cardDragging,
          isDragging && Elevation.high,
          { backgroundColor: Colors.bg1, borderColor },
        ]}
      >
        {/* Left: colored icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: hexAlpha(goal.color, 0.18) }]}>
          <Ionicons name={goal.icon as any} size={20} color={goal.color} />
        </View>

        {/* Center: name + XPBar */}
        <View style={styles.center}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: Colors.textPrimary }]} numberOfLines={2}>{goal.name}</Text>
            {isDailyDouble && (
              <Text style={[styles.doubleBadge, { color: Colors.warning }]}>2×</Text>
            )}
            {graceUsed && (
              <Ionicons name="shield-checkmark" size={11} color={Colors.warning} />
            )}
          </View>

          {/* Compact XP progress */}
          <XPBar stats={stats} compact />

          {/* Count goal progress text */}
          {goal.type === 'count' && goal.targetCount ? (
            <Text style={[styles.countText, { color: Colors.textSecondary }]}>
              {todayCountTotal}/{goal.targetCount} {goal.unit ?? ''}
            </Text>
          ) : goal.type === 'milestone' && goal.targetCount ? (
            <Text style={[styles.countText, { color: Colors.textSecondary }]}>
              {logs.length}/{goal.targetCount} {goal.unit ?? ''}
            </Text>
          ) : null}
        </View>

        {/* Right: streak + log button */}
        <View style={styles.right}>
          {/* Streak chip */}
          <View style={styles.streakChip}>
            <StreakFlame streak={streakInfo.currentStreak} size={16} />
            <Text style={[styles.streakText, { color: streakInfo.currentStreak > 0 ? Colors.warning : Colors.textDisabled }]}>
              {streakDisplay}
            </Text>
          </View>

          {/* Log button area */}
          {isRestDay ? (
            <View style={[styles.logBtn, { backgroundColor: Colors.accentDim }]}>
              <Text style={[styles.logBtnText, { color: Colors.textSecondary }]}>Rest</Text>
            </View>
          ) : goal.type === 'quit' ? (
            <View style={styles.quitGroup}>
              <Animated.View style={animatedButtonStyle}>
                <AnimatedPressable
                  scale={0.92}
                  style={[
                    styles.logBtn,
                    loggedToday
                      ? { backgroundColor: hexAlpha(Colors.success, 0.15) }
                      : { backgroundColor: goal.color },
                  ]}
                  onPress={handleLog}
                  disabled={loggedToday}
                >
                  <Text style={[styles.logBtnText, { color: loggedToday ? Colors.success : '#fff' }]}>
                    {loggedToday ? 'Clean ✓' : 'Clean'}
                  </Text>
                </AnimatedPressable>
              </Animated.View>
              {!loggedToday && (
                <AnimatedPressable
                  scale={0.92}
                  style={[styles.relapseBtn, { borderColor: hexAlpha(Colors.warning, 0.4) }]}
                  onPress={onRelapse}
                >
                  <Text style={[styles.relapseBtnText, { color: Colors.warning }]}>Relapse</Text>
                </AnimatedPressable>
              )}
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
                    doneBtnStyle
                      ? { backgroundColor: hexAlpha(Colors.success, 0.15) }
                      : { backgroundColor: goal.color },
                  ]}
                  onPress={handleLog}
                  disabled={doneBtnStyle}
                >
                  <Text style={[styles.logBtnText, { color: doneBtnStyle ? Colors.success : '#fff' }]}>
                    {goal.type === 'count'
                      ? countGoalComplete ? 'Done' : 'Add'
                      : goal.allowMultiplePerDay
                      ? 'Log'
                      : loggedToday
                      ? 'Done ✓'
                      : 'Log'}
                  </Text>
                </AnimatedPressable>
              </Animated.View>
            </View>
          )}

          {/* Drag handle */}
          {dragHandle && <View style={styles.dragHandle}>{dragHandle}</View>}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  cardDragging: { opacity: 0.9 },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  center: { flex: 1, gap: 3, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'nowrap' },
  name: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold, flex: 1, lineHeight: FontSize.md * 1.35 },
  doubleBadge: { fontSize: 10, fontFamily: FontFamily.extraBold, flexShrink: 0 },
  countText: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },

  right: { flexShrink: 0, alignItems: 'flex-end', gap: Spacing.xs },

  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  streakText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold },

  logBtnWrapper: { position: 'relative', alignItems: 'center' },
  xpFloat: { fontSize: 11, fontFamily: FontFamily.semiBold },

  logBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },
  logBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },

  quitGroup: { alignItems: 'flex-end', gap: 4 },
  relapseBtn: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  relapseBtnText: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold },

  dragHandle: { marginTop: 2 },
});
