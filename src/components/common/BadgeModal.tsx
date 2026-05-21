import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import type { BadgeDefinition } from '../../types';

interface Props {
  badges: BadgeDefinition[];
  bonusXP: number;
  visible: boolean;
  onClose: () => void;
}

export default function BadgeModal({ badges, bonusXP, visible, onClose }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>
            {badges.length === 1 ? 'Badge Unlocked!' : `${badges.length} Badges Unlocked!`}
          </Text>
          {badges.map(badge => (
            <View key={badge.id} style={styles.badgeRow}>
              <Ionicons name={badge.icon as any} size={24} color={Colors.accentBright} />
              <View style={styles.badgeText}>
                <Text style={styles.badgeName}>{badge.label}</Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
              </View>
            </View>
          ))}
          {bonusXP > 0 && (
            <View style={styles.bonusRow}>
              <Text style={styles.bonusXP}>+{bonusXP} Bonus XP!</Text>
            </View>
          )}
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Awesome!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  card: { backgroundColor: Colors.bg2, borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.accentDim },
  emoji: { fontSize: 48 },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, width: '100%', backgroundColor: Colors.bg3, borderRadius: Radius.md, padding: Spacing.md },
  badgeText: { flex: 1 },
  badgeName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  badgeDesc: { color: Colors.textSecondary, fontSize: FontSize.sm },
  bonusRow: { backgroundColor: Colors.accentDim, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  bonusXP: { color: Colors.accentBright, fontSize: FontSize.lg, fontWeight: '700' },
  button: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, marginTop: Spacing.sm },
  buttonText: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
});
