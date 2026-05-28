import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing, OVERLAY_DARK } from '../../constants/theme';
import { getLevelTier } from './ProfileShareCard';

interface Props {
  visible: boolean;
  oldLevel: number;
  newLevel: number;
  onClose: () => void;
}

const { width: W } = Dimensions.get('window');

export default function LevelUpModal({ visible, oldLevel, newLevel, onClose }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  const tier = getLevelTier(newLevel);

  useEffect(() => {
    if (visible) {
      flashAnim.setValue(0.4);
      Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, tension: 30, friction: 4, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
          ])
        ),
      ]).start();
    } else {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      glowAnim.setValue(0);
      flashAnim.setValue(0);
    }
  }, [visible]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={[tier.color + '33', Colors.bg2, Colors.bg2]}
            style={styles.gradient}
          />

          {/* Glow ring */}
          <Animated.View style={[styles.glowRing, { borderColor: tier.color, opacity: glowOpacity }]} />

          <Text style={styles.label}>LEVEL UP</Text>

          <View style={[styles.iconCircle, { borderColor: tier.color, backgroundColor: tier.color + '22' }]}>
            <Ionicons name={tier.icon as any} size={48} color={tier.color} />
          </View>

          <View style={styles.levelRow}>
            <Text style={[styles.oldLevel, { color: Colors.textDisabled }]}>{oldLevel}</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.textSecondary} style={{ marginHorizontal: 8 }} />
            <Text style={[styles.newLevel, { color: tier.color }]}>{newLevel}</Text>
          </View>

          <Text style={[styles.tierName, { color: tier.color }]}>{tier.title}</Text>
          <Text style={styles.subtitle}>You've reached a new level!</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: tier.color }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Keep going! ⚡</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* White flash overlay */}
        <Animated.View
          style={[styles.flashOverlay, { opacity: flashAnim }]}
          pointerEvents="none"
        />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: OVERLAY_DARK,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFill,
  },
  glowRing: {
    position: 'absolute',
    width: W * 0.8,
    height: W * 0.8,
    borderRadius: W * 0.4,
    borderWidth: 2,
    top: -W * 0.25,
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
  label: {
    color: Colors.textDisabled,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  oldLevel: {
    fontSize: 32,
    fontWeight: '700',
  },
  newLevel: {
    fontSize: 52,
    fontWeight: '900',
  },
  tierName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
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
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
