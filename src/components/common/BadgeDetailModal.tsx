import React, { useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, FontSize, Radius, Spacing, OVERLAY_DARK } from '../../constants/theme';
import { BADGE_DEFINITIONS, RARITY_COLORS, RARITY_LABELS, RARITY_BG } from '../../constants/badges';
import { useBadgeStore } from '../../store/badgeStore';
import { useGoalStore } from '../../store/goalStore';
import { formatDisplayDate } from '../../utils/dateUtils';
import type { BadgeRarity } from '../../types';

const SCREEN_W = Dimensions.get('window').width;
const ICON_SIZE = 96;
const ICON_CONTAINER_SIZE = 140;
const PARTICLE_RADIUS = 80;

interface BadgeDetailModalProps {
  badgeId: string | null;
  onClose: () => void;
}

// ── Particle count per rarity ─────────────────────────────────────────────
function particleCount(rarity: BadgeRarity): number {
  switch (rarity) {
    case 'legendary': return 12;
    case 'rare':      return 8;
    case 'uncommon':  return 4;
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
  const endX = Math.cos(angle) * PARTICLE_RADIUS;
  const endY = Math.sin(angle) * PARTICLE_RADIUS;

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
  const earnedBadges = useBadgeStore(s => s.earnedBadges);
  const goals = useGoalStore(s => s.goals);

  const def = badgeId ? BADGE_DEFINITIONS.find(b => b.id === badgeId) ?? null : null;
  const earnedBadge = badgeId ? earnedBadges.find(b => b.badgeId === badgeId) ?? null : null;
  const isEarned = earnedBadge !== null;

  const rarity: BadgeRarity = def?.rarity ?? 'common';
  const rarityColor = RARITY_COLORS[rarity] ?? Colors.textDisabled;
  const numParticles = particleCount(rarity);

  // Goal name lookup
  const goalName = earnedBadge?.goalId
    ? goals.find(g => g.id === earnedBadge.goalId)?.name ?? null
    : null;

  // Animation shared values
  const particleTrigger = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const iconScale = useSharedValue(1);
  const legendaryShimmer = useSharedValue(0.3);
  const legendaryRingScale = useSharedValue(0);
  const legendaryRingOpacity = useSharedValue(0);

  // We need a JS-side trigger state to pass to Particle components
  const [jsTrigger, setJsTrigger] = React.useState(0);

  const triggerAnimations = useCallback(() => {
    'worklet';
    // Particles trigger
    particleTrigger.value += 1;

    if (rarity === 'uncommon' || rarity === 'rare' || rarity === 'legendary') {
      // Pulsing glow ring
      glowOpacity.value = withSequence(
        withTiming(0.8, { duration: 300 }),
        withRepeat(
          withSequence(
            withTiming(0.3, { duration: 600 }),
            withTiming(0.8, { duration: 600 }),
          ),
          3,
          true,
        ),
        withTiming(0, { duration: 400 }),
      );
    }

    if (rarity === 'rare' || rarity === 'legendary') {
      // Icon scales up gently
      iconScale.value = withSequence(
        withTiming(1.15, { duration: 300 }),
        withSpring(1, { damping: 8, stiffness: 100 }),
      );
    }

    if (rarity === 'legendary') {
      // Continuous shimmer on border
      legendaryShimmer.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.3, { duration: 800 }),
        ),
        -1,
        true,
      );
      // Gold expanding ring
      legendaryRingScale.value = 0;
      legendaryRingOpacity.value = 1;
      legendaryRingScale.value = withTiming(2.2, { duration: 900, easing: Easing.out(Easing.quad) });
      legendaryRingOpacity.value = withTiming(0, { duration: 900 });
    }
  }, [rarity, particleTrigger, glowOpacity, iconScale, legendaryShimmer, legendaryRingScale, legendaryRingOpacity]);

  // Fire animations when modal opens
  useEffect(() => {
    if (badgeId) {
      // Reset
      glowOpacity.value = 0;
      iconScale.value = 1;
      legendaryShimmer.value = 0.3;
      legendaryRingScale.value = 0;
      legendaryRingOpacity.value = 0;

      // Increment JS trigger for Particle components
      setJsTrigger(t => t + 1);

      // Fire worklet animations
      triggerAnimations();
    }
  }, [badgeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animated styles
  const glowRingStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    borderColor: rarityColor,
  }));

  const iconContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const legendaryBorderStyle = useAnimatedStyle(() => ({
    opacity: legendaryShimmer.value,
    borderColor: rarityColor,
  }));

  const legendaryRingStyle = useAnimatedStyle(() => ({
    opacity: legendaryRingOpacity.value,
    transform: [{ scale: legendaryRingScale.value }],
    borderColor: rarityColor,
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
      <View style={{ flex: 1, backgroundColor: OVERLAY_DARK, alignItems: 'center', justifyContent: 'center' }}>
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
            {/* Legendary shimmer border overlay */}
            {rarity === 'legendary' && (
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: Radius.xl,
                    borderWidth: 2,
                  },
                  legendaryBorderStyle,
                ]}
                pointerEvents="none"
              />
            )}

            {/* Icon area with particles */}
            <View style={{ width: ICON_CONTAINER_SIZE, height: ICON_CONTAINER_SIZE, alignItems: 'center', justifyContent: 'center' }}>
              {/* Legendary expanding ring */}
              {rarity === 'legendary' && (
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      width: ICON_CONTAINER_SIZE,
                      height: ICON_CONTAINER_SIZE,
                      borderRadius: ICON_CONTAINER_SIZE / 2,
                      borderWidth: 3,
                    },
                    legendaryRingStyle,
                  ]}
                  pointerEvents="none"
                />
              )}

              {/* Glow ring */}
              {(rarity === 'uncommon' || rarity === 'rare' || rarity === 'legendary') && (
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      width: ICON_CONTAINER_SIZE,
                      height: ICON_CONTAINER_SIZE,
                      borderRadius: ICON_CONTAINER_SIZE / 2,
                      borderWidth: 2,
                    },
                    glowRingStyle,
                  ]}
                  pointerEvents="none"
                />
              )}

              {/* Particles */}
              {Array.from({ length: numParticles }).map((_, i) => (
                <Particle
                  key={i}
                  index={i}
                  total={numParticles}
                  color={rarityColor}
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
            <Text style={{ color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800', textAlign: 'center' }}>
              {def.label}
            </Text>

            {/* Rarity tier label */}
            <View style={{
              backgroundColor: rarityColor + '22',
              borderRadius: Radius.full,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.xs,
              borderWidth: 1,
              borderColor: rarityColor + '66',
            }}>
              <Text style={{ color: rarityColor, fontSize: FontSize.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                {RARITY_LABELS[rarity]}
              </Text>
            </View>

            {/* Description */}
            <Text style={{ color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 }}>
              {def.description}
            </Text>

            {/* Earned date or not earned */}
            {isEarned && earnedBadge ? (
              <Text style={{ color: Colors.textSecondary, fontSize: FontSize.sm }}>
                Earned on{' '}
                <Text style={{ color: Colors.accentBright, fontWeight: '600' }}>
                  {formatDisplayDate(earnedBadge.earnedAt.slice(0, 10))}
                </Text>
              </Text>
            ) : (
              <Text style={{ color: Colors.textDisabled, fontSize: FontSize.sm }}>
                Not yet earned
              </Text>
            )}

            {/* Goal name (only if earnedBadge.goalId is not null and goal found) */}
            {isEarned && goalName && (
              <Text style={{ color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' }}>
                Earned with:{' '}
                <Text style={{ color: Colors.textPrimary, fontWeight: '600' }}>
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
              <Text style={{ color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
