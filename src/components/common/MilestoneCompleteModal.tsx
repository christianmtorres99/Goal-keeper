import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  visible: boolean;
  goalName: string;
  goalColor: string;
  totalLogs: number;
  currentTarget: number;
  cycleCount: number;
  onRestart: (newTarget: number) => void;
  onArchive: () => void;
}

export default function MilestoneCompleteModal({
  visible, goalName, goalColor, totalLogs, currentTarget, cycleCount, onRestart, onArchive,
}: Props) {
  const [newTarget, setNewTarget] = useState(String(Math.round(currentTarget * 1.5)));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🏆</Text>
          <Text style={styles.title}>Milestone Complete!</Text>
          <Text style={styles.subtitle}>{goalName}</Text>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: goalColor }]}>{totalLogs}</Text>
              <Text style={styles.statLabel}>logs</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: goalColor }]}>{cycleCount + 1}</Text>
              <Text style={styles.statLabel}>cycles</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Start a new cycle?</Text>
          <Text style={styles.hint}>Set a harder target to keep leveling up</Text>

          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>New target</Text>
            <TextInput
              style={styles.targetInput}
              value={newTarget}
              onChangeText={setNewTarget}
              keyboardType="number-pad"
              selectTextOnFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.restartBtn, { backgroundColor: goalColor }]}
            onPress={() => onRestart(parseInt(newTarget) || currentTarget)}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.restartText}>Start New Cycle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.archiveBtn} onPress={onArchive}>
            <Text style={styles.archiveText}>Archive this goal instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  card: { backgroundColor: Colors.bg2, borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  emoji: { fontSize: 56 },
  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.md },
  statRow: { flexDirection: 'row', gap: Spacing.xxl },
  stat: { alignItems: 'center' },
  statValue: { fontSize: FontSize.xxxl, fontWeight: '800' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  divider: { width: '100%', height: 1, backgroundColor: Colors.border },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  hint: { color: Colors.textSecondary, fontSize: FontSize.sm },
  targetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  targetLabel: { color: Colors.textSecondary, fontSize: FontSize.md },
  targetInput: { backgroundColor: Colors.bg3, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700', padding: Spacing.sm, width: 80, textAlign: 'center' },
  restartBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, padding: Spacing.md, paddingHorizontal: Spacing.xl, width: '100%', justifyContent: 'center' },
  restartText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  archiveBtn: { padding: Spacing.sm },
  archiveText: { color: Colors.textSecondary, fontSize: FontSize.sm, textDecorationLine: 'underline' },
});
