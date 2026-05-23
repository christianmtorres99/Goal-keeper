import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { useTodoStore } from '../../store/todoStore';
import type { Todo, SubItem } from '../../types';
import { todayString, formatTime12h } from '../../utils/dateUtils';

// ── Add Todo Modal ─────────────────────────────────────────────────────────────
interface AddTodoModalProps {
  visible: boolean;
  onClose: () => void;
}

function AddTodoModal({ visible, onClose }: AddTodoModalProps) {
  const { addTodo } = useTodoStore();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [dueTime, setDueTime] = useState('');
  const [subItemInputs, setSubItemInputs] = useState<string[]>(['']);

  const today = todayString();
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const reset = () => {
    setTitle('');
    setDueDate(undefined);
    setDueTime('');
    setSubItemInputs(['']);
  };

  const handleSave = useCallback(async () => {
    const t = title.trim();
    if (!t) return;
    const validSubs = subItemInputs.filter(s => s.trim().length > 0);
    await addTodo(t, dueDate, dueTime.trim() || undefined, validSubs);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reset();
    onClose();
  }, [title, dueDate, dueTime, subItemInputs, addTodo, onClose]);

  const updateSubItem = (idx: number, val: string) => {
    setSubItemInputs(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const addSubItemField = () => {
    setSubItemInputs(prev => [...prev, '']);
  };

  const removeSubItem = (idx: number) => {
    setSubItemInputs(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>New Task</Text>

        <TextInput
          style={styles.titleInput}
          placeholder="Task title"
          placeholderTextColor={Colors.textDisabled}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
        />

        {/* Due date quick buttons */}
        <Text style={styles.fieldLabel}>Due Date</Text>
        <View style={styles.dateBtnRow}>
          {[
            { label: 'Today', value: today },
            { label: 'Tomorrow', value: tomorrow },
          ].map(opt => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.dateBtn, dueDate === opt.value && styles.dateBtnActive]}
              onPress={() => setDueDate(prev => prev === opt.value ? undefined : opt.value)}
            >
              <Text style={[styles.dateBtnText, dueDate === opt.value && styles.dateBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
          {dueDate && dueDate !== today && dueDate !== tomorrow && (
            <View style={[styles.dateBtn, styles.dateBtnActive]}>
              <Text style={styles.dateBtnTextActive}>{dueDate}</Text>
            </View>
          )}
          {dueDate && (
            <TouchableOpacity style={styles.dateBtn} onPress={() => setDueDate(undefined)}>
              <Ionicons name="close-circle-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Due time */}
        <Text style={styles.fieldLabel}>Time (optional, HH:MM)</Text>
        <TextInput
          style={styles.timeInput}
          placeholder="e.g. 09:30"
          placeholderTextColor={Colors.textDisabled}
          value={dueTime}
          onChangeText={setDueTime}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />

        {/* Sub-items */}
        <Text style={styles.fieldLabel}>Sub-tasks</Text>
        <ScrollView style={styles.subItemScroll} keyboardShouldPersistTaps="handled">
          {subItemInputs.map((val, idx) => (
            <View key={idx} style={styles.subItemRow}>
              <Ionicons name="remove-circle-outline" size={18} color={Colors.danger} style={{ marginRight: 4 }} />
              <TextInput
                style={styles.subItemInput}
                placeholder={`Sub-task ${idx + 1}`}
                placeholderTextColor={Colors.textDisabled}
                value={val}
                onChangeText={v => updateSubItem(idx, v)}
                returnKeyType="next"
                onSubmitEditing={addSubItemField}
              />
              {subItemInputs.length > 1 && (
                <TouchableOpacity onPress={() => removeSubItem(idx)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={Colors.textDisabled} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addSubItemBtn} onPress={addSubItemField}>
            <Ionicons name="add-circle-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.addSubItemText}>Add sub-task</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity
          style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!title.trim()}
        >
          <Text style={styles.saveBtnText}>Save Task</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Sub-item row ───────────────────────────────────────────────────────────────
interface SubItemRowProps {
  subItem: SubItem;
  onToggle: () => void;
}

function SubItemRow({ subItem, onToggle }: SubItemRowProps) {
  return (
    <TouchableOpacity style={styles.subItemCheckRow} onPress={onToggle} activeOpacity={0.7}>
      <Ionicons
        name={subItem.checked ? 'checkmark-circle' : 'ellipse-outline'}
        size={18}
        color={subItem.checked ? Colors.success : Colors.textDisabled}
      />
      <Text style={[styles.subItemCheckText, subItem.checked && styles.strikethrough]}>
        {subItem.title}
      </Text>
    </TouchableOpacity>
  );
}

// ── Todo Card ─────────────────────────────────────────────────────────────────
interface TodoCardProps {
  todo: Todo;
  onComplete: () => void;
  onToggleSub: (subId: string) => void;
  onDelete: () => void;
  onReschedule: () => void;
}

function TodoCard({ todo, onComplete, onToggleSub, onDelete, onReschedule }: TodoCardProps) {
  const [expanded, setExpanded] = useState(false);

  const completedCount = todo.subItems.filter(s => s.checked).length;
  const totalCount = todo.subItems.length;

  const handleMorePress = () => {
    Alert.alert(
      todo.title,
      'What would you like to do?',
      [
        { text: 'Reschedule to Tomorrow', onPress: onReschedule },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={[styles.todoCard, todo.completed && styles.todoCardDone]}>
      <View style={styles.todoRow}>
        {/* Checkbox */}
        <TouchableOpacity onPress={onComplete} hitSlop={8} disabled={todo.completed}>
          <Ionicons
            name={todo.completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={todo.completed ? Colors.success : Colors.accent}
          />
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.todoContent}>
          <Text style={[styles.todoTitle, todo.completed && styles.strikethrough]} numberOfLines={2}>
            {todo.title}
          </Text>
          <View style={styles.todoMeta}>
            {todo.dueTime ? (
              <Text style={styles.todoTime}>
                <Ionicons name="time-outline" size={11} /> {formatTime12h(todo.dueTime)}
              </Text>
            ) : null}
            {totalCount > 0 && (
              <Text style={styles.subCount}>{completedCount}/{totalCount} tasks</Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.todoActions}>
          {totalCount > 0 && (
            <TouchableOpacity onPress={() => setExpanded(v => !v)} hitSlop={8}>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          {!todo.completed && (
            <TouchableOpacity onPress={handleMorePress} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sub-items */}
      {expanded && totalCount > 0 && (
        <View style={styles.subItemsList}>
          {todo.subItems.map(sub => (
            <SubItemRow
              key={sub.id}
              subItem={sub}
              onToggle={() => onToggleSub(sub.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main TodoSection ──────────────────────────────────────────────────────────
export default function TodoSection() {
  const { todos, completeTodo, toggleSubItem, deleteTodo, rescheduleTodo } = useTodoStore();
  const [expanded, setExpanded] = useState(true);
  const [addVisible, setAddVisible] = useState(false);

  const today = todayString();
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const pendingTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);
  const count = pendingTodos.length;

  const handleComplete = useCallback(async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await completeTodo(id);
  }, [completeTodo]);

  const handleReschedule = useCallback(async (id: string) => {
    await rescheduleTodo(id, tomorrow);
  }, [rescheduleTodo, tomorrow]);

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <TouchableOpacity
          style={styles.sectionHeaderLeft}
          onPress={() => setExpanded(v => !v)}
          activeOpacity={0.7}
        >
          <Ionicons name="checkbox-outline" size={18} color={Colors.accent} />
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          {count > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{count}</Text>
            </View>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addTaskBtn}
          onPress={() => setAddVisible(true)}
          hitSlop={8}
        >
          <Ionicons name="add" size={20} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Task list */}
      {expanded && (
        <View style={styles.taskList}>
          {todos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No tasks for today</Text>
              <TouchableOpacity onPress={() => setAddVisible(true)}>
                <Text style={styles.emptyStateLink}>Add your first task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {pendingTodos.map(todo => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  onComplete={() => handleComplete(todo.id)}
                  onToggleSub={(subId) => toggleSubItem(todo.id, subId)}
                  onDelete={() => deleteTodo(todo.id)}
                  onReschedule={() => handleReschedule(todo.id)}
                />
              ))}
              {completedTodos.map(todo => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  onComplete={() => {}}
                  onToggleSub={(subId) => toggleSubItem(todo.id, subId)}
                  onDelete={() => deleteTodo(todo.id)}
                  onReschedule={() => {}}
                />
              ))}
            </>
          )}
        </View>
      )}

      <AddTodoModal visible={addVisible} onClose={() => setAddVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeText: {
    color: Colors.textPrimary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  addTaskBtn: {
    padding: Spacing.xs,
  },

  taskList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
  },
  emptyStateText: {
    color: Colors.textDisabled,
    fontSize: FontSize.sm,
  },
  emptyStateLink: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },

  // TodoCard
  todoCard: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  todoCardDone: {
    opacity: 0.5,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  todoContent: {
    flex: 1,
    gap: 2,
  },
  todoTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: Colors.textDisabled,
  },
  todoMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  todoTime: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  subCount: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  todoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },

  // Sub-items
  subItemsList: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 2,
  },
  subItemCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.xs,
  },
  subItemCheckText: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    flex: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bg1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  titleInput: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -Spacing.sm,
  },
  dateBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  dateBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateBtnActive: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accent,
  },
  dateBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  dateBtnTextActive: {
    color: Colors.accentBright,
    fontWeight: '600',
  },
  timeInput: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subItemScroll: {
    maxHeight: 180,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  subItemInput: {
    flex: 1,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addSubItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.xs,
    alignSelf: 'flex-start',
  },
  addSubItemText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
