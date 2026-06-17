import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, Easing as RNEasing,
} from 'react-native-reanimated';
import { FontSize, FontFamily, hexAlpha, Radius, Spacing, OVERLAY_DARK_MODE, OVERLAY_LIGHT_MODE } from '../../constants/theme';
import AnimatedPressable from './AnimatedPressable';
import { useColors } from '../../hooks/useColors';
import { getLevelTier } from './ProfileShareCard';
import { useFriendsStore } from '../../store/friendsStore';

interface Props {
  visible: boolean;
  oldLevel: number;
  newLevel: number;
  currentXP: number;
  onClose: () => void;
}

// ─── Confetti ────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#34D399', '#F9A8D4', '#60A5FA'];
const PARTICLE_COUNT = 28;

interface ParticleSpec {
  dx: number;
  dy: number;
  color: string;
  size: number;
  delay: number;
}

function ConfettiLayer({ active, tierColor }: { active: boolean; tierColor: string }) {
  const particles = useMemo<ParticleSpec[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const radius = 60 + Math.random() * 80;
      return {
        dx: Math.cos(angle) * radius,
        dy: -120 - Math.random() * 80,
        color: i % 5 === 0 ? tierColor : CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 4 + Math.floor(Math.random() * 4),
        delay: Math.floor(Math.random() * 120),
      };
    });
  }, [tierColor]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Particle key={i} spec={p} active={active} />
      ))}
    </View>
  );
}

function Particle({ spec, active }: { spec: ParticleSpec; active: boolean }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (active) {
      x.value = withDelay(spec.delay, withTiming(spec.dx, { duration: 700, easing: RNEasing.out(RNEasing.cubic) }));
      y.value = withDelay(spec.delay, withTiming(spec.dy, { duration: 700, easing: RNEasing.out(RNEasing.cubic) }));
      rotate.value = withDelay(spec.delay, withTiming(360, { duration: 700 }));
      opacity.value = withDelay(spec.delay, withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(400, withTiming(0, { duration: 250 })),
      ));
    } else {
      x.value = 0;
      y.value = 0;
      opacity.value = 0;
      rotate.value = 0;
    }
  }, [active]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View
      style={[
        style,
        {
          position: 'absolute',
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 4,
          backgroundColor: spec.color,
          // Center the burst origin in the card
          top: '50%',
          left: '50%',
        },
      ]}
    />
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export default function LevelUpModal({ visible, oldLevel, newLevel, currentXP, onClose }: Props) {
  const { colors: Colors, isLight } = useColors();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const levelAnim = useRef(new Animated.Value(newLevel - 1));
  const [displayLevel, setDisplayLevel] = useState(newLevel - 1);
  const [confettiActive, setConfettiActive] = useState(false);

  const tier = getLevelTier(newLevel);
  const oldTier = getLevelTier(oldLevel);
  const isTierUp = oldTier.title !== tier.title;

  const leaderboard = useFriendsStore(s => s.leaderboard);
  const rankedPercent = useMemo(() => {
    if (leaderboard.length < 2) return null;
    const belowCount = leaderboard.filter(p => p.xp < currentXP).length;
    return Math.round((belowCount / leaderboard.length) * 100);
  }, [leaderboard, currentXP]);

  const overlayBg = isLight ? OVERLAY_LIGHT_MODE : OVERLAY_DARK_MODE;

  useEffect(() => {
    if (visible) {
      levelAnim.current.setValue(newLevel - 1);
      setDisplayLevel(newLevel - 1);
      scaleAnim.setValue(0.72);
      flashAnim.setValue(0);
      setConfettiActive(false);

      const id = levelAnim.current.addListener(({ value }) => {
        setDisplayLevel(Math.round(value));
      });

      // Flash then reveal
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: isTierUp ? 0.3 : 0.18, duration: 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start();

      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 35, friction: 7, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(levelAnim.current, {
          toValue: newLevel,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start(() => {
        setConfettiActive(true);
      });

      return () => {
        levelAnim.current.removeListener(id);
      };
    } else {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      flashAnim.setValue(0);
      setConfettiActive(false);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Screen flash */}
      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flashAnim }]} />
      <Animated.View style={[styles.overlay, { opacity: opacityAnim, backgroundColor: overlayBg }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], backgroundColor: Colors.bg2, borderColor: tier.color, borderWidth: isTierUp ? 2 : 1.5 }]}>
          <LinearGradient
            colors={[hexAlpha(tier.color, isTierUp ? 0.45 : 0.35), Colors.bg2, Colors.bg2]}
            style={styles.gradient}
          />

          {/* Confetti burst */}
          <ConfettiLayer active={confettiActive} tierColor={tier.color} />

          {isTierUp && (
            <Text style={[styles.tierUpLabel, { color: tier.color }]}>NEW TIER UNLOCKED</Text>
          )}
          <Text style={[styles.label, { color: Colors.textDisabled }]}>LEVEL UP</Text>

          <View style={[styles.iconCircle, { borderColor: tier.color, backgroundColor: hexAlpha(tier.color, 0.13), width: isTierUp ? 112 : 100, height: isTierUp ? 112 : 100, borderRadius: isTierUp ? 56 : 50 }]}>
            <Ionicons name={tier.icon as any} size={isTierUp ? 52 : 48} color={tier.color} />
          </View>

          <View style={styles.levelRow}>
            <Text style={[styles.oldLevel, { color: Colors.textDisabled }]}>{oldLevel}</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.textSecondary} style={{ marginHorizontal: 8 }} />
            <Text style={[styles.newLevel, { color: tier.color }]}>{displayLevel}</Text>
          </View>

          <Text style={[styles.tierName, { color: tier.color }]}>{tier.title}</Text>

          {rankedPercent !== null && (
            <Text style={[styles.rankedStat, { color: Colors.textDisabled }]}>
              🌍 Ranked higher than {rankedPercent}% of tracked players
            </Text>
          )}

          <AnimatedPressable
            scale={0.97}
            style={[styles.button, { backgroundColor: tier.color }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </AnimatedPressable>
        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flash: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 999,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gradient: { ...StyleSheet.absoluteFill },
  tierUpLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.extraBold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.extraBold,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  iconCircle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center' },
  oldLevel: { fontSize: 32, fontFamily: FontFamily.bold },
  newLevel: { fontSize: 52, fontFamily: FontFamily.extraBold },
  tierName: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.extraBold,
    letterSpacing: 0.5,
  },
  rankedStat: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    opacity: 0.75,
  },
  button: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontFamily: FontFamily.extraBold,
    letterSpacing: 0.3,
  },
});
