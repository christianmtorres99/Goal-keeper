import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Radius, Spacing, OVERLAY_DARK_MODE, OVERLAY_LIGHT_MODE } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';

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
  const { colors: Colors, isLight } = useColors();
  const [newTarget, setNewTarget] = useState(String(Math.round(currentTarget * 1.5)));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={[styles.overlay, { backgroundColor: isLight ? OVERLAY_LIGHT_MODE : OVERLAY_DARK_MODE }]}>
        <View style={[styles.card, { backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
          <Text style={styles.emoji}>🏆</Text>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>Milestone Complete!</Text>
          <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>{goalName}</Text>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: goalColor }]}>{totalLogs}</Text>
              <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>logs</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: goalColor }]}>{cycleCount + 1}</Text>
              <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>cycles</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: Colors.border }]} />

          <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Start a new cycle?</Text>
          <Text style={[styles.hint, { color: Colors.textSecondary }]}>Set a harder target to keep leveling up</Text>

          <View style={styles.targetRow}>
            <Text style={[styles.targetLabel, { color: Colors.textSecondary }]}>New target</Text>
            <TextInput
              style={[styles.targetInput, { backgroundColor: Colors.bg3, borderColor: Colors.border, color: Colors.textPrimary }]}
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
            <Text style={[styles.archiveText, { color: Colors.textSecondary }]}>Archive this goal instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  card: { borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', alignItems: 'center', gap: Spacing.md, borderWidth: 1 },
  emoji: { fontSize: 56 },
  title: { fontSize: FontSize.xxl, fontWeight: '800' },
  subtitle: { fontSize: FontSize.md },
  statRow: { flexDirection: 'row', gap: Spacing.xxl },
  stat: { alignItems: 'center' },
  statValue: { fontSize: FontSize.xxxl, fontWeight: '800' },
  statLabel: { fontSize: FontSize.sm },
  divider: { width: '100%', height: 1 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  hint: { fontSize: FontSize.sm },
  targetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  targetLabel: { fontSize: FontSize.md },
  targetInput: { borderRadius: Radius.md, borderWidth: 1, fontSize: FontSize.lg, fontWeight: '700', padding: Spacing.sm, width: 80, textAlign: 'center' },
  restartBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, padding: Spacing.md, paddingHorizontal: Spacing.xl, width: '100%', justifyContent: 'center' },
  restartText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  archiveBtn: { padding: Spacing.sm },
  archiveText: { fontSize: FontSize.sm, textDecorationLine: 'underline' },
});
