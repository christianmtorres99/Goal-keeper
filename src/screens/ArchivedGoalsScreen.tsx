import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Radius, Spacing } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import { useGoalStore } from '../store/goalStore';

export default function ArchivedGoalsScreen() {
  const { colors: Colors } = useColors();
  const { archivedGoals, loadArchivedGoals, restoreGoal, deleteGoal } = useGoalStore();

  useEffect(() => { loadArchivedGoals(); }, []);

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Goal', `Permanently delete "${name}" and all its logs?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(id) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg0 }]}>
      <FlatList
        data={archivedGoals}
        keyExtractor={g => g.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<Text style={[styles.title, { color: Colors.textPrimary }]}>Archived Goals</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="archive-outline" size={48} color={Colors.textDisabled} />
            <Text style={[styles.emptyText, { color: Colors.textDisabled }]}>No archived goals</Text>
          </View>
        }
        renderItem={({ item: goal }) => (
          <View style={[styles.row, { backgroundColor: Colors.bg1, borderColor: Colors.border, borderLeftColor: goal.color }]}>
            <Ionicons name={goal.icon as any} size={24} color={goal.color} style={styles.icon} />
            <View style={styles.info}>
              <Text style={[styles.name, { color: Colors.textPrimary }]}>{goal.name}</Text>
              <Text style={[styles.meta, { color: Colors.textSecondary }]}>{goal.type} · archived {goal.createdAt}</Text>
            </View>
            <TouchableOpacity style={[styles.restoreBtn, { backgroundColor: Colors.success + '22' }]} onPress={() => restoreGoal(goal.id)}>
              <Ionicons name="refresh" size={16} color={Colors.success} />
              <Text style={[styles.restoreText, { color: Colors.success }]}>Restore</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(goal.id, goal.name)}>
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  title: { fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.md },
  row: { borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderLeftWidth: 3 },
  icon: { width: 28 },
  info: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: '600' },
  meta: { fontSize: FontSize.xs },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  restoreText: { fontSize: FontSize.sm, fontWeight: '600' },
  deleteBtn: { padding: Spacing.xs },
  empty: { paddingTop: Spacing.xxl, alignItems: 'center', gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md },
});
