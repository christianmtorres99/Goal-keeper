import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
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
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.title}>{title}</Text>

          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}

          {badges.map(badge => (
            <View key={badge.id} style={styles.badgeRow}>
              <View style={styles.badgeIconWrap}>
                <Ionicons name={badge.icon as any} size={22} color={Colors.accentBright} />
              </View>
              <View style={styles.badgeText}>
                <Text style={styles.badgeName}>{badge.label}</Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
              </View>
            </View>
          ))}

          {bonusXP > 0 && (
            <View style={styles.bonusRow}>
              <Ionicons name="flash" size={18} color={Colors.accentBright} />
              <Text style={styles.bonusXP}>+{bonusXP} Bonus XP</Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.8}>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
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
    borderWidth: 1.5,
    borderColor: Colors.accentDim,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
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
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  badgeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { flex: 1 },
  badgeName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
  badgeDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  bonusXP: { color: Colors.accentBright, fontSize: FontSize.lg, fontWeight: '800' },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800', letterSpacing: 0.3 },
});
