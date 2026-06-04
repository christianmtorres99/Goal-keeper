import React, { useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamily, FontSize, hexAlpha, Radius, Spacing, OVERLAY_DARK_MODE, OVERLAY_LIGHT_MODE } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';
import { BADGE_DEFINITIONS, RARITY_COLORS, RARITY_LABELS, RARITY_BG } from '../../constants/badges';
import { useBadgeStore } from '../../store/badgeStore';
import { useGoalStore } from '../../store/goalStore';
import { formatDisplayDate } from '../../utils/dateUtils';
import type { BadgeRarity } from '../../types';

const SCREEN_W = Dimensions.get('window').width;
const ICON_SIZE = 96;
const ICON_CONTAINER_SIZE = 140;
const PARTICLE_RADIUS = 120;

interface BadgeDetailModalProps {
  badgeId: string | null;
  onClose: () => void;
}

// ── Particle count per rarity ─────────────────────────────────────────────
function particleCount(rarity: BadgeRarity): number {
  switch (rarity) {
    case 'legendary': return 20;
    case 'rare':      return 14;
    case 'uncommon':  return 10;
    case 'common':    return 6;
  }
}

// ── Single animated particle ────────────────────────────────────────────
interface ParticleProps {
  index: number;
  total: number;
  color: string;
  rarity: BadgeRarity;
  trigger: number; // increments to re-trigger animation
}

function Particle({ index, total, color, rarity, trigger }: ParticleProps) {
  const angle = (index / total) * 2 * Math.PI;
  const startX = 0;
  const startY = 0;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  // Project onto rectangle: scale so the longer dimension equals PARTICLE_RADIUS
  const absC = Math.abs(cosA);
  const absS = Math.abs(sinA);
  const rectScale = absC > 0.001 && absS > 0.001
    ? PARTICLE_RADIUS / Math.max(absC, absS)
    : PARTICLE_RADIUS;
  const endX = cosA * rectScale;
  const endY = sinA * rectScale;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  const dotSize = rarity === 'common' ? 5 : 6;
  const delay = index * 60;

  const animate = useCallback(() => {
    'worklet';
    translateX.value = startX;
    translateY.value = startY;
    opacity.value = 0;
    scale.value = 0;

    if (rarity === 'common') {
      // Single burst: scale 0→1.5→0, opacity 1→0
      opacity.value = withDelay(delay, withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 600 }),
      ));
      scale.value = withDelay(delay, withSequence(
        withTiming(1.5, { duration: 400 }),
        withTiming(0, { duration: 300 }),
      ));
      translateX.value = withDelay(delay, withSequence(
        withTiming(endX * 0.6, { duration: 400 }),
        withTiming(endX, { duration: 300 }),
      ));
      translateY.value = withDelay(delay, withSequence(
        withTiming(endY * 0.6, { duration: 400 }),
        withTiming(endY, { duration: 300 }),
      ));
    } else {
      // Radiate outward
      opacity.value = withDelay(delay, withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 550 }),
      ));
      scale.value = withDelay(delay, withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.5, { duration: 550 }),
      ));
      translateX.value = withDelay(delay, withSequence(
        withTiming(endX, { duration: 400 }),
        withTiming(endX * 1.15, { duration: 300 }),
      ));
      translateY.value = withDelay(delay, withSequence(
        withTiming(endY, { duration: 400 }),
        withTiming(endY * 1.15, { duration: 300 }),
      ));
    }
  }, [delay, endX, endY, opacity, rarity, scale, translateX, translateY]);

  useEffect(() => {
    if (trigger > 0) {
      animate();
    }
  }, [trigger, animate]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
          top: ICON_CONTAINER_SIZE / 2 - dotSize / 2,
          left: ICON_CONTAINER_SIZE / 2 - dotSize / 2,
        },
        animStyle,
      ]}
    />
  );
}

// ── Main modal component ─────────────────────────────────────────────
export default function BadgeDetailModal({ badgeId, onClose }: BadgeDetailModalProps) {
  const { colors: Colors, isLight } = useColors();
  const earnedBadges = useBadgeStore(s => s.earnedBadges);
  const goals = useGoalStore(s => s.goals);

  const def = badgeId ? BADGE_DEFINITIONS.find(b => b.id === badgeId) ?? null : null;
  const earnedBadge = badgeId ? earnedBadges.find(b => b.badgeId === badgeId) ?? null : null;
  const isEarned = earnedBadge !== null;

  const rarity: BadgeRarity = def?.rarity ?? 'common';
  const rarityColor = RARITY_COLORS[rarity] ?? Colors.textDisabled;
  const numParticles = particleCount(rarity);
  const particleColor = rarity === 'common'
    ? hexAlpha(Colors.textSecondary, 0.8)
    : rarityColor;

  // Goal name lookup
  const goalName = earnedBadge?.goalId
    ? goals.find(g => g.id === earnedBadge.goalId)?.name ?? null
    : null;

  const iconScale = useSharedValue(1);
  const [jsTrigger, setJsTrigger] = React.useState(0);

  const triggerAnimations = useCallback(() => {
    'worklet';
    if (rarity === 'rare' || rarity === 'legendary') {
      iconScale.value = withSequence(
        withTiming(1.12, { duration: 280 }),
        withSpring(1, { damping: 8, stiffness: 100 }),
      );
    }
  }, [rarity, iconScale]);

  useEffect(() => {
    if (badgeId) {
      iconScale.value = 1;
      setJsTrigger(t => t + 1);
      triggerAnimations();
    }
  }, [badgeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const iconContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  if (!def) return null;

  return (
    <Modal
      visible={badgeId !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: isLight ? OVERLAY_LIGHT_MODE : OVERLAY_DARK_MODE, alignItems: 'center', justifyContent: 'center' }}>
        {(rarity === 'rare' || rarity === 'legendary') && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: hexAlpha(rarityColor, 0.06) }]} />
        )}
        <SafeAreaView style={{ width: '100%', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <View
            style={{
              width: SCREEN_W - Spacing.xl * 2,
              backgroundColor: Colors.bg1,
              borderRadius: Radius.xl,
              padding: Spacing.xl,
              alignItems: 'center',
              gap: Spacing.md,
              borderWidth: 1,
              borderColor: Colors.border,
              overflow: 'hidden',
            }}
          >
            {/* Icon area with particles */}
            <View style={{ width: ICON_CONTAINER_SIZE, height: ICON_CONTAINER_SIZE, alignItems: 'center', justifyContent: 'center' }}>
              {/* Particles */}
              {Array.from({ length: numParticles }).map((_, i) => (
                <Particle
                  key={i}
                  index={i}
                  total={numParticles}
                  color={particleColor}
                  rarity={rarity}
                  trigger={jsTrigger}
                />
              ))}

              {/* Icon container */}
              <Animated.View
                style={[
                  {
                    width: ICON_CONTAINER_SIZE * 0.76,
                    height: ICON_CONTAINER_SIZE * 0.76,
                    borderRadius: (ICON_CONTAINER_SIZE * 0.76) * 0.22,
                    backgroundColor: isEarned ? (RARITY_BG[rarity] ?? Colors.accentDim) : Colors.bg3,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isEarned ? (rarity === 'legendary' ? 2 : rarity === 'rare' ? 1.5 : 1) : 0,
                    borderColor: isEarned ? rarityColor : 'transparent',
                    ...(rarity === 'legendary' && isEarned ? {
                      shadowColor: rarityColor,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.7,
                      shadowRadius: 12,
                      elevation: 8,
                    } : {}),
                  },
                  iconContainerStyle,
                ]}
              >
                <Ionicons
                  name={def.icon as React.ComponentProps<typeof Ionicons>['name']}
                  size={ICON_SIZE * 0.5}
                  color={isEarned ? rarityColor : Colors.textDisabled}
                />
                {!isEarned && (
                  <View style={{ position: 'absolute', bottom: 6, right: 6 }}>
                    <Ionicons name="lock-closed" size={14} color={Colors.textDisabled} />
                  </View>
                )}
              </Animated.View>
            </View>

            {/* Badge name */}
            <Text style={{ color: Colors.textPrimary, fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, textAlign: 'center' }}>
              {def.label}
            </Text>

            {/* Rarity tier label */}
            <View style={{
              backgroundColor: hexAlpha(rarityColor, 0.13),
              borderRadius: Radius.full,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.xs,
              borderWidth: 1,
              borderColor: hexAlpha(rarityColor, 0.40),
            }}>
              <Text style={{ color: rarityColor, fontSize: FontSize.sm, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: 1 }}>
                {RARITY_LABELS[rarity]}
              </Text>
            </View>

            {/* Description */}
            <Text style={{ color: Colors.textSecondary, fontSize: FontSize.md, fontFamily: FontFamily.regular, textAlign: 'center', lineHeight: 22 }}>
              {def.description}
            </Text>

            {/* Earned date or not earned */}
            {isEarned && earnedBadge ? (
              <Text style={{ color: Colors.textSecondary, fontSize: FontSize.sm, fontFamily: FontFamily.regular }}>
                Earned on{' '}
                <Text style={{ color: Colors.accentBright, fontFamily: FontFamily.semiBold }}>
                  {formatDisplayDate(earnedBadge.earnedAt.slice(0, 10))}
                </Text>
              </Text>
            ) : (
              <Text style={{ color: Colors.textDisabled, fontSize: FontSize.sm, fontFamily: FontFamily.regular }}>
                Not yet earned
              </Text>
            )}

            {/* Goal name (only if earnedBadge.goalId is not null and goal found) */}
            {isEarned && goalName && (
              <Text style={{ color: Colors.textSecondary, fontSize: FontSize.sm, fontFamily: FontFamily.regular, textAlign: 'center' }}>
                Earned with:{' '}
                <Text style={{ color: Colors.textPrimary, fontFamily: FontFamily.semiBold }}>
                  {goalName}
                </Text>
              </Text>
            )}

            {/* Dismiss button */}
            <TouchableOpacity
              onPress={onClose}
              style={{
                marginTop: Spacing.sm,
                backgroundColor: Colors.accent,
                borderRadius: Radius.lg,
                paddingHorizontal: Spacing.xl,
                paddingVertical: Spacing.sm,
                alignItems: 'center',
                width: '100%',
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: Colors.textPrimary, fontSize: FontSize.md, fontFamily: FontFamily.bold }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
