import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, FontFamily, hexAlpha, Radius, Spacing, OVERLAY_DARK_MODE, OVERLAY_LIGHT_MODE } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';
import { getLevelTier } from './ProfileShareCard';

interface Props {
  visible: boolean;
  oldLevel: number;
  newLevel: number;
  onClose: () => void;
}

export default function LevelUpModal({ visible, oldLevel, newLevel, onClose }: Props) {
  const { colors: Colors, isLight } = useColors();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const tier = getLevelTier(newLevel);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 20, friction: 3, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const overlayBg = isLight ? OVERLAY_LIGHT_MODE : OVERLAY_DARK_MODE;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim, backgroundColor: overlayBg }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
          <LinearGradient
            colors={[hexAlpha(tier.color, 0.20), Colors.bg2, Colors.bg2]}
            style={styles.gradient}
          />

          <Text style={[styles.label, { color: Colors.textDisabled }]}>LEVEL UP</Text>

          <View style={[styles.iconCircle, { borderColor: tier.color, backgroundColor: hexAlpha(tier.color, 0.13) }]}>
            <Ionicons name={tier.icon as any} size={48} color={tier.color} />
          </View>

          <View style={styles.levelRow}>
            <Text style={[styles.oldLevel, { color: Colors.textDisabled }]}>{oldLevel}</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.textSecondary} style={{ marginHorizontal: 8 }} />
            <Text style={[styles.newLevel, { color: tier.color }]}>{newLevel}</Text>
          </View>

          <Text style={[styles.tierName, { color: tier.color }]}>{tier.title}</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: tier.color }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  gradient: {
    ...StyleSheet.absoluteFill,
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.extraBold,
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
    fontFamily: FontFamily.bold,
  },
  newLevel: {
    fontSize: 52,
    fontFamily: FontFamily.extraBold,
  },
  tierName: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.extraBold,
    letterSpacing: 0.5,
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
