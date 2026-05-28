import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useGoalStore } from '../store/goalStore';

export default function ArchivedGoalsScreen() {
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
        ListHeaderComponent={<Text style={styles.title}>Archived Goals</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="archive-outline" size={48} color={Colors.textDisabled} />
            <Text style={styles.emptyText}>No archived goals</Text>
          </View>
        }
        renderItem={({ item: goal }) => (
          <View style={[styles.row, { borderLeftColor: goal.color }]}>
            <Ionicons name={goal.icon as any} size={24} color={goal.color} style={styles.icon} />
            <View style={styles.info}>
              <Text style={styles.name}>{goal.name}</Text>
              <Text style={styles.meta}>{goal.type} · archived {goal.createdAt}</Text>
            </View>
            <TouchableOpacity style={styles.restoreBtn} onPress={() => restoreGoal(goal.id)}>
              <Ionicons name="refresh" size={16} color={Colors.success} />
              <Text style={styles.restoreText}>Restore</Text>
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
  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.md },
  row: { backgroundColor: Colors.bg1, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3 },
  icon: { width: 28 },
  info: { flex: 1 },
  name: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  meta: { color: Colors.textSecondary, fontSize: FontSize.xs },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.success + '22', borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  restoreText: { color: Colors.success, fontSize: FontSize.sm, fontWeight: '600' },
  deleteBtn: { padding: Spacing.xs },
  empty: { paddingTop: Spacing.xxl, alignItems: 'center', gap: Spacing.sm },
  emptyText: { color: Colors.textDisabled, fontSize: FontSize.md },
});
