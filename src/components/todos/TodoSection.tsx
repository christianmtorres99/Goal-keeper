import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { useTodoStore } from '../../store/todoStore';
import type { Todo, SubItem } from '../../types';
import { todayString, formatTime12h } from '../../utils/dateUtils';
import ScheduledTaskModal from './ScheduledTaskModal';

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

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(60);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 60, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]).start(() => {
        backdropOpacity.setValue(0);
        sheetTranslateY.setValue(60);
      });
    }
  }, [visible]);

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
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdropOpacity }]}
        pointerEvents="none"
      />
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalKAV}
      >
        <Animated.View style={[styles.modalSheet, { backgroundColor: Colors.bg1, borderColor: Colors.border, transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={[styles.modalHandle, { backgroundColor: Colors.border }]} />
          <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>New Task</Text>

          <TextInput
            style={[styles.titleInput, { backgroundColor: Colors.bg2, color: Colors.textPrimary, borderColor: Colors.border }]}
            placeholder="Task title"
            placeholderTextColor={Colors.textDisabled}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
          />

          {/* Due date quick buttons */}
          <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>Due Date</Text>
          <View style={styles.dateBtnRow}>
            {[
              { label: 'Today', value: today },
              { label: 'Tomorrow', value: tomorrow },
            ].map(opt => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.dateBtn, { backgroundColor: Colors.bg2, borderColor: Colors.border }, dueDate === opt.value && styles.dateBtnActive]}
                onPress={() => setDueDate(prev => prev === opt.value ? undefined : opt.value)}
              >
                <Text style={[styles.dateBtnText, { color: Colors.textSecondary }, dueDate === opt.value && styles.dateBtnTextActive]}>
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
              <TouchableOpacity style={[styles.dateBtn, { backgroundColor: Colors.bg2, borderColor: Colors.border }]} onPress={() => setDueDate(undefined)}>
                <Ionicons name="close-circle-outline" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Due time */}
          <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>Time (optional, HH:MM)</Text>
          <TextInput
            style={[styles.timeInput, { backgroundColor: Colors.bg2, color: Colors.textPrimary, borderColor: Colors.border }]}
            placeholder="e.g. 09:30"
            placeholderTextColor={Colors.textDisabled}
            value={dueTime}
            onChangeText={setDueTime}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          {/* Sub-items */}
          <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>Sub-tasks</Text>
          <ScrollView style={styles.subItemScroll} keyboardShouldPersistTaps="handled">
            {subItemInputs.map((val, idx) => (
              <View key={idx} style={styles.subItemRow}>
                <Ionicons name="remove-circle-outline" size={18} color={Colors.danger} style={{ marginRight: 4 }} />
                <TextInput
                  style={[styles.subItemInput, { backgroundColor: Colors.bg2, color: Colors.textPrimary, borderColor: Colors.border }]}
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
              <Text style={[styles.addSubItemText, { color: Colors.textSecondary }]}>Add sub-task</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!title.trim()}
          >
            <Text style={[styles.saveBtnText, { color: Colors.textPrimary }]}>Save Task</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
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
      <Text style={[styles.subItemCheckText, { color: Colors.textPrimary }, subItem.checked && styles.strikethrough]}>
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
  onMorePress: (todo: Todo) => void;
}

function TodoCard({ todo, onComplete, onToggleSub, onDelete, onReschedule, onMorePress }: TodoCardProps) {
  const [expanded, setExpanded] = useState(false);

  const completedCount = todo.subItems.filter(s => s.checked).length;
  const totalCount = todo.subItems.length;

  return (
    <View style={[styles.todoCard, { backgroundColor: Colors.bg2, borderColor: Colors.border }, todo.completed && styles.todoCardDone]}>
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
          <Text style={[styles.todoTitle, { color: Colors.textPrimary }, todo.completed && styles.strikethrough]} numberOfLines={2}>
            {todo.title}
          </Text>
          <View style={styles.todoMeta}>
            {todo.dueTime ? (
              <Text style={[styles.todoTime, { color: Colors.textSecondary }]}>
                <Ionicons name="time-outline" size={11} /> {formatTime12h(todo.dueTime)}
              </Text>
            ) : null}
            {totalCount > 0 && (
              <Text style={[styles.subCount, { color: Colors.textSecondary }]}>{completedCount}/{totalCount} tasks</Text>
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
            <TouchableOpacity onPress={() => onMorePress(todo)} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sub-items */}
      {expanded && totalCount > 0 && (
        <View style={[styles.subItemsList, { borderTopColor: Colors.border }]}>
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
  const { todos, completeTodo, toggleSubItem, deleteTodo, rescheduleTodo, updateTodo } = useTodoStore();
  const [expanded, setExpanded] = useState(true);
  const [addVisible, setAddVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [actionTodo, setActionTodo] = useState<Todo | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editText, setEditText] = useState('');

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
    <View style={[styles.section, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <TouchableOpacity
          style={styles.sectionHeaderLeft}
          onPress={() => setExpanded(v => !v)}
          activeOpacity={0.7}
        >
          <Ionicons name="checkbox-outline" size={18} color={Colors.accent} />
          <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Today's Tasks</Text>
          {count > 0 && (
            <View style={[styles.countBadge, { backgroundColor: Colors.accent }]}>
              <Text style={[styles.countBadgeText, { color: Colors.textPrimary }]}>{count}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addTaskBtn}
          onPress={() => setScheduleModalVisible(true)}
          hitSlop={8}
        >
          <Ionicons name="repeat" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addTaskBtn}
          onPress={() => setAddVisible(true)}
          hitSlop={8}
        >
          <Ionicons name="add" size={20} color={Colors.accent} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setExpanded(v => !v)} hitSlop={8} style={styles.addTaskBtn}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Task list */}
      {expanded && (
        <View style={styles.taskList}>
          {todos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: Colors.textDisabled }]}>No tasks for today</Text>
              <TouchableOpacity onPress={() => setAddVisible(true)}>
                <Text style={[styles.emptyStateLink, { color: Colors.accent }]}>Add your first task</Text>
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
                  onMorePress={setActionTodo}
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
                  onMorePress={setActionTodo}
                />
              ))}
            </>
          )}
        </View>
      )}

      <AddTodoModal visible={addVisible} onClose={() => setAddVisible(false)} />
      <ScheduledTaskModal visible={scheduleModalVisible} onClose={() => setScheduleModalVisible(false)} />

      {/* Action sheet modal */}
      <Modal
        visible={!!actionTodo}
        transparent
        animationType="slide"
        onRequestClose={() => setActionTodo(null)}
      >
        <TouchableOpacity style={styles.actionBackdrop} activeOpacity={1} onPress={() => setActionTodo(null)} />
        <View style={[styles.actionSheet, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
          <View style={[styles.actionHandle, { backgroundColor: Colors.border }]} />
          <Text style={[styles.actionTitle, { color: Colors.textSecondary }]} numberOfLines={1}>{actionTodo?.title}</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditText(actionTodo?.title ?? ''); setEditingTodo(actionTodo); setActionTodo(null); }}>
            <Ionicons name="pencil-outline" size={20} color={Colors.textPrimary} />
            <Text style={[styles.actionBtnText, { color: Colors.textPrimary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { if (actionTodo) { rescheduleTodo(actionTodo.id, tomorrow); } setActionTodo(null); }}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textPrimary} />
            <Text style={[styles.actionBtnText, { color: Colors.textPrimary }]}>Reschedule to Tomorrow</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderTopWidth: 1, borderTopColor: Colors.border }]} onPress={() => { if (actionTodo) deleteTodo(actionTodo.id); setActionTodo(null); }}>
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { marginTop: Spacing.xs }]} onPress={() => setActionTodo(null)}>
            <Text style={[styles.actionBtnText, { color: Colors.textSecondary, textAlign: 'center', width: '100%' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal visible={!!editingTodo} transparent animationType="fade" onRequestClose={() => setEditingTodo(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editOverlay}>
          <View style={[styles.editCard, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <Text style={[styles.editTitle, { color: Colors.textPrimary }]}>Edit Task</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: Colors.bg2, color: Colors.textPrimary, borderColor: Colors.border }]}
              value={editText}
              onChangeText={setEditText}
              autoFocus
              placeholder="Task name..."
              placeholderTextColor={Colors.textDisabled}
              maxLength={100}
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={[styles.editCancel, { backgroundColor: Colors.bg2, borderColor: Colors.border }]} onPress={() => setEditingTodo(null)}>
                <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.editSave, { backgroundColor: Colors.accent }]} onPress={async () => { if (editingTodo && editText.trim()) { await updateTodo(editingTodo.id, editText.trim()); } setEditingTodo(null); }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: Radius.lg,
    borderWidth: 1,
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
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  countBadge: {
    borderRadius: Radius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeText: {
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
    fontSize: FontSize.sm,
  },
  emptyStateLink: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },

  // TodoCard
  todoCard: {
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
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
    fontSize: FontSize.xs,
  },
  subCount: {
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
    fontSize: FontSize.sm,
    flex: 1,
  },

  // Add Todo Modal
  modalKAV: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  modalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
    maxHeight: '85%',
    borderWidth: 1,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  titleInput: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    borderWidth: 1,
  },
  fieldLabel: {
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
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateBtnActive: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accent,
  },
  dateBtnText: {
    fontSize: FontSize.sm,
  },
  dateBtnTextActive: {
    color: Colors.accentBright,
    fontWeight: '600',
  },
  timeInput: {
    borderRadius: Radius.md,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    borderWidth: 1,
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
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.md,
    borderWidth: 1,
  },
  addSubItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.xs,
    alignSelf: 'flex-start',
  },
  addSubItemText: {
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
    fontSize: FontSize.md,
    fontWeight: '700',
  },

  // Action sheet
  actionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  actionSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
    borderWidth: 1,
  },
  actionHandle: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  actionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  actionBtnText: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },

  // Edit modal
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  editCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    gap: Spacing.md,
    borderWidth: 1,
  },
  editTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  editInput: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    borderWidth: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'flex-end',
  },
  editCancel: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  editSave: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
});
