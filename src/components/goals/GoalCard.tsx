import React, { useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
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
import { FontSize, Radius, Spacing } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';
import type { Goal, Log, StreakInfo } from '../../types';
import { getPlayerStats, getStreakMultiplier } from '../../logic/xpEngine';
import { sumXP } from '../../utils/xpUtils';
import XPBar from '../common/XPBar';
import { isAlreadyLoggedToday } from '../../logic/streakEngine';
import StreakFlame from '../common/StreakFlame';
import { useLogStore } from '../../store/logStore';
import { useRestDayStore } from '../../store/restDayStore';
import { todayString } from '../../utils/dateUtils';
import { getNextStreakBadge, getNextLogBadge } from '../../utils/motivationUtils';

const BASE_LOG_XP = 50;
const PARTICLE_COUNT = 18;
const PARTICLE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) =>
  (i / PARTICLE_COUNT) * Math.PI * 2
);

interface ParticleRef {
  trigger: () => void;
}

interface ParticleProps {
  angle: number;
  color: string;
  index: number;
}

const Particle = forwardRef<ParticleRef, ParticleProps>(({ angle, color, index }, ref) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    trigger() {
      const dx = Math.cos(angle) * 100;
      const dy = Math.sin(angle) * 100;
      const delay = index * 20;
      tx.value = 0;
      ty.value = 0;
      scale.value = withDelay(delay, withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 250 })
      ));
      opacity.value = withDelay(delay, withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 350 })
      ));
      tx.value = withDelay(delay, withTiming(dx, { duration: 450 }));
      ty.value = withDelay(delay, withTiming(dy, { duration: 450 }));
    },
  }));

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color,
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return <Animated.View style={style} pointerEvents="none" />;
});

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
}

export default function GoalCard({ goal, logs, streakInfo, onPress, onLog, isDragging, dragHandle, isDailyDouble, animateSignal }: Props) {
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

  // Count goal: compute today's total and completion
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

  // Progress bar animation (Task A3)
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

  // Animation shared values
  const buttonScale = useSharedValue(1);
  const xpOpacity = useSharedValue(0);
  const xpTranslateY = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const burstRingScale = useSharedValue(0.5);
  const burstRingOpacity = useSharedValue(0);

  // Particle refs
  const particleRefs = useRef<Array<ParticleRef | null>>(
    Array.from({ length: PARTICLE_COUNT }, () => null)
  );

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

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const animatedBurstRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burstRingScale.value }],
    opacity: burstRingOpacity.value,
  }));

  const triggerBurstAnimation = useCallback(() => {
    // Button spring
    buttonScale.value = withSequence(
      withTiming(0.82, { duration: 80 }),
      withSpring(1.18, { damping: 4, stiffness: 320 }),
      withSpring(1.0, { damping: 12, stiffness: 200 })
    );
    // XP float upward
    xpTranslateY.value = 0;
    xpOpacity.value = 1;
    xpTranslateY.value = withTiming(-90, { duration: 650 });
    xpOpacity.value = withDelay(280, withTiming(0, { duration: 380 }));
    // Expanding ring
    ringScale.value = 0;
    ringOpacity.value = 0.7;
    ringScale.value = withTiming(3.5, { duration: 550 });
    ringOpacity.value = withTiming(0, { duration: 550 });
    // Burst ring
    burstRingScale.value = 0.5;
    burstRingOpacity.value = 0.7;
    burstRingScale.value = withTiming(3.0, { duration: 500 });
    burstRingOpacity.value = withTiming(0, { duration: 500 });
    // Particles
    particleRefs.current.forEach(p => p?.trigger());
  }, []);

  // Fire animation when animateSignal increments (after modals close)
  useEffect(() => {
    if (animateSignal && animateSignal > 0) {
      triggerBurstAnimation();
    }
  }, [animateSignal]);

  const handleLog = useCallback(() => {
    onLog();
  }, [onLog]);

  const xpLabel = `+${Math.round(BASE_LOG_XP * multiplier)} XP`;

  const doneBtnStyle = loggedToday && !goal.allowMultiplePerDay && goal.type !== 'count';

  return (
    <Pressable
      style={[
        styles.card,
        isAtRisk && styles.cardAtRisk,
        isDragging && styles.cardDragging,
        {
          backgroundColor: Colors.bg1,
          borderLeftWidth: 3,
          borderLeftColor: isAtRisk ? Colors.warning : goal.color,
          borderWidth: 1,
          borderColor: Colors.border,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.iconName}>
            <StreakFlame streak={streakInfo.currentStreak} size={34}>
              <Ionicons name={goal.icon as any} size={22} color={goal.color} />
            </StreakFlame>
            <Text style={[styles.name, { color: Colors.textPrimary }]} numberOfLines={2}>{goal.name}</Text>
          </View>
          <View style={styles.topRight}>
            {isDailyDouble && (
              <View style={[styles.doubleBadge, { backgroundColor: Colors.warning + '22', borderColor: Colors.warning + '44' }]}>
                <Text style={[styles.doubleText, { color: Colors.warning }]}>2× ⭐</Text>
              </View>
            )}
            {graceUsed && !isAtRisk && (
              <View style={[styles.graceBadge, { backgroundColor: Colors.warning + '18' }]}>
                <Ionicons name="shield-checkmark" size={11} color={Colors.warning} />
                <Text style={[styles.graceBadgeText, { color: Colors.warning }]}>Grace</Text>
              </View>
            )}
            {isAtRisk && (
              <View style={[styles.atRiskBadge, { backgroundColor: Colors.warning + '22' }]}>
                <Ionicons name="warning" size={11} color={Colors.warning} />
                <Text style={[styles.atRiskText, { color: Colors.warning }]}>Log today!</Text>
              </View>
            )}
            <View style={[styles.streakBadge, { backgroundColor: Colors.bg3 }, streakInfo.currentStreak === 0 && { backgroundColor: Colors.bg3 + '88' }]}>
              <Ionicons
                name="flame"
                size={14}
                color={streakInfo.currentStreak > 0 ? Colors.warning : Colors.textDisabled}
              />
              <Text style={[
                styles.streakText,
                { color: Colors.warning },
                streakInfo.currentStreak === 0 && { color: Colors.textDisabled, fontWeight: '600' },
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

          {/* Log button with burst animation — or rest day badge */}
          {isRestDay ? (
            <View style={[styles.restDayBadge, { backgroundColor: Colors.accentDim }]}>
              <Text style={[styles.restDayText, { color: Colors.textSecondary }]}>Rest Day 😌</Text>
            </View>
          ) : (
            <View style={styles.logBtnWrapper}>
              {/* Expanding ring */}
              <Animated.View
                style={[styles.ring, { borderColor: goal.color }, animatedRingStyle]}
                pointerEvents="none"
              />
              {/* Burst ring */}
              <Animated.View
                style={[styles.burstRing, { borderColor: goal.color }, animatedBurstRingStyle]}
                pointerEvents="none"
              />
              {/* Burst particles */}
              {PARTICLE_ANGLES.map((angle, i) => (
                <Particle
                  key={i}
                  ref={el => { particleRefs.current[i] = el; }}
                  angle={angle}
                  color={goal.color}
                  index={i}
                />
              ))}
              {/* XP float label */}
              <Animated.Text style={[styles.xpFloat, { color: Colors.accentBright }, animatedXPStyle]} pointerEvents="none">
                {xpLabel}
              </Animated.Text>
              {/* Animated button wrapper */}
              <Animated.View style={animatedButtonStyle}>
                <TouchableOpacity
                  style={[
                    styles.logBtn,
                    { backgroundColor: Colors.accent },
                    doneBtnStyle && { backgroundColor: Colors.success + '22', borderWidth: 1, borderColor: Colors.success + '55' },
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
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}

          {dragHandle && <View style={styles.dragHandle}>{dragHandle}</View>}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    flexDirection: 'row',
  },
  cardAtRisk: {},
  cardDragging: { opacity: 0.9, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  body: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconName: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: '600', flex: 1, lineHeight: FontSize.md * 1.4 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  atRiskBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: Radius.sm, paddingHorizontal: Spacing.xs, paddingVertical: 2 },
  atRiskText: { fontSize: 10, fontWeight: '700' },
  graceBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: Radius.sm, paddingHorizontal: Spacing.xs, paddingVertical: 2 },
  graceBadgeText: { fontSize: 10, fontWeight: '600' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  streakText: { fontSize: FontSize.sm, fontWeight: '700' },
  nextBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextBadgeText: { fontSize: 11, fontWeight: '600' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  multiplier: { fontSize: FontSize.xs, fontWeight: '700', borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  milestoneText: { fontSize: FontSize.sm },

  // Log button animation wrapper
  logBtnWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  burstRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  xpFloat: {
    fontSize: 24,
    fontWeight: '900',
  },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  logBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
  dragHandle: { marginLeft: Spacing.xs },
  restDayBadge: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  restDayText: { fontSize: FontSize.sm },
  doubleBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.sm, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1 },
  doubleText: { fontSize: 10, fontWeight: '800' },
  countProgressWrapper: { gap: 4, marginTop: 4 },
  countProgressText: { fontSize: FontSize.xs },
  countProgressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  countProgressFill: { height: '100%', borderRadius: 2 },
});
