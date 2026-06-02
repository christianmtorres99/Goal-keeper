import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Radius, Spacing, OVERLAY_DARK_MODE, OVERLAY_LIGHT_MODE } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';
import type { BadgeDefinition } from '../../types';
import type { LogEvent } from '../../store/logStore';
import { getEventTitle, getEventSubtitle } from '../../utils/motivationUtils';

interface Props {
  badges: BadgeDefinition[];
  bonusXP: number;
  events?: LogEvent[];
  visible: boolean;
  onClose: () => void;
}

export default function BadgeModal({ badges, bonusXP, events = [], visible, onClose }: Props) {
  const { colors: Colors, isLight } = useColors();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const title = getEventTitle(events, badges.length);
  const subtitle = getEventSubtitle(events);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim, backgroundColor: isLight ? OVERLAY_LIGHT_MODE : OVERLAY_DARK_MODE }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], backgroundColor: Colors.bg2, borderColor: Colors.accentDim }]}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{title}</Text>

          {subtitle && (
            <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>{subtitle}</Text>
          )}

          {badges.map(badge => (
            <View key={badge.id} style={[styles.badgeRow, { backgroundColor: Colors.bg3 }]}>
              <View style={[styles.badgeIconWrap, { backgroundColor: Colors.accentDim }]}>
                <Ionicons name={badge.icon as any} size={22} color={Colors.accentBright} />
              </View>
              <View style={styles.badgeText}>
                <Text style={[styles.badgeName, { color: Colors.textPrimary }]}>{badge.label}</Text>
                <Text style={[styles.badgeDesc, { color: Colors.textSecondary }]}>{badge.description}</Text>
              </View>
            </View>
          ))}

          {bonusXP > 0 && (
            <View style={[styles.bonusRow, { backgroundColor: Colors.accentDim }]}>
              <Ionicons name="flash" size={18} color={Colors.accentBright} />
              <Text style={[styles.bonusXP, { color: Colors.accentBright }]}>+{bonusXP} Bonus XP</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.button, { backgroundColor: Colors.accent }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Let's go!</Text>
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
    borderWidth: 1.5,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  badgeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { flex: 1 },
  badgeName: { fontSize: FontSize.md, fontWeight: '700' },
  badgeDesc: { fontSize: FontSize.sm, marginTop: 2 },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  bonusXP: { fontSize: FontSize.lg, fontWeight: '800' },
  button: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800', letterSpacing: 0.3 },
});
