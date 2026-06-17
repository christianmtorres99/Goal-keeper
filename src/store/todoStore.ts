import { create } from 'zustand';
import { getDb } from '../db/client';
import type { Todo, SubItem } from '../types';
import { todayString } from '../utils/dateUtils';
import { useTodoXPStore } from './todoXPStore';
import { useBadgeStore } from './badgeStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function rowToSubItem(r: any): SubItem {
  return {
    id: r.id,
    todoId: r.todo_id,
    title: r.title,
    checked: r.checked === 1,
    sortOrder: r.sort_order ?? 0,
  };
}

function rowToTodo(r: any, subItems: SubItem[]): Todo {
  return {
    id: r.id,
    title: r.title,
    dueDate: r.due_date ?? undefined,
    dueTime: r.due_time ?? undefined,
    completed: r.completed === 1,
    completedAt: r.completed_at ?? undefined,
    xpReward: r.xp_reward ?? 15,
    createdAt: r.created_at,
    sortOrder: r.sort_order ?? 0,
    subItems: subItems.filter(s => s.todoId === r.id).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

interface TodoStore {
  todos: Todo[];
  loadTodos: () => Promise<void>;
  addTodo: (title: string, dueDate?: string, dueTime?: string, subItemTitles?: string[]) => Promise<void>;
  completeTodo: (id: string) => Promise<void>;
  uncompleteTodo: (id: string) => Promise<void>;
  toggleSubItem: (todoId: string, subItemId: string) => Promise<void>;
  addSubItem: (todoId: string, title: string) => Promise<void>;
  rescheduleTodo: (id: string, newDate: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  updateTodo: (id: string, title: string) => Promise<void>;
  clearExpiredTodos: () => Promise<void>;
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],

  loadTodos: async () => {
    try {
      const db = await getDb();
      const today = todayString();

      // Clean up completed todos from previous days
      await db.runAsync('DELETE FROM todos WHERE completed = 1 AND completed_at < ?', [today]);

      // Load: uncompleted todos (all dates up to today) + completed today
      const todoRows = await db.getAllAsync<any>(
        `SELECT * FROM todos
         WHERE (completed = 0 AND (due_date IS NULL OR due_date <= ?))
            OR (completed = 1 AND completed_at >= ?)
         ORDER BY completed ASC, CASE WHEN completed = 1 THEN completed_at END DESC, sort_order ASC`,
        [today, today]
      );

      const subRows = await db.getAllAsync<any>('SELECT * FROM todo_sub_items ORDER BY sort_order ASC');
      const subItems = subRows.map(rowToSubItem);

      const todos = todoRows.map(r => rowToTodo(r, subItems));
      set({ todos });
    } catch (e) {
      if (__DEV__) console.error('loadTodos failed:', e);
    }
  },

  addTodo: async (title, dueDate, dueTime, subItemTitles = []) => {
    try {
      const db = await getDb();
      const today = todayString();
      const maxOrder = get().todos.reduce((m, t) => Math.max(m, t.sortOrder), -1);
      const todo: Todo = {
        id: uuid(),
        title,
        dueDate,
        dueTime,
        completed: false,
        xpReward: 15,
        createdAt: new Date().toISOString(),
        sortOrder: maxOrder + 1,
        subItems: [],
      };

      await db.runAsync(
        `INSERT INTO todos (id, title, due_date, due_time, completed, xp_reward, created_at, sort_order)
         VALUES (?,?,?,?,0,15,?,?)`,
        [todo.id, todo.title, todo.dueDate ?? null, todo.dueTime ?? null, todo.createdAt, todo.sortOrder]
      );

      // Insert sub-items
      const insertedSubItems: SubItem[] = [];
      for (let i = 0; i < subItemTitles.length; i++) {
        const t = subItemTitles[i].trim();
        if (!t) continue;
        const subItem: SubItem = {
          id: uuid(),
          todoId: todo.id,
          title: t,
          checked: false,
          sortOrder: i,
        };
        await db.runAsync(
          'INSERT INTO todo_sub_items (id, todo_id, title, checked, sort_order) VALUES (?,?,?,0,?)',
          [subItem.id, subItem.todoId, subItem.title, subItem.sortOrder]
        );
        insertedSubItems.push(subItem);
      }

      const finalTodo = { ...todo, subItems: insertedSubItems };

      // Only show in today's list if no due_date or due_date <= today
      if (!dueDate || dueDate <= today) {
        set(s => ({ todos: [finalTodo, ...s.todos] }));
      }
    } catch (e) {
      if (__DEV__) console.error('addTodo failed:', e);
    }
  },

  completeTodo: async (id) => {
    try {
      const db = await getDb();
      const now = new Date().toISOString();
      const todo = get().todos.find(t => t.id === id);
      if (!todo || todo.completed) return;

      await db.runAsync(
        'UPDATE todos SET completed=1, completed_at=? WHERE id=?',
        [now, id]
      );

      // Award XP
      await useTodoXPStore.getState().addXP(todo.xpReward);

      // Increment persistent todo completion counter and check badges
      const existing = await AsyncStorage.getItem('totalTodosCompleted');
      const newCount = (parseInt(existing ?? '0', 10) || 0) + 1;
      await AsyncStorage.setItem('totalTodosCompleted', String(newCount));
      await useBadgeStore.getState().checkAndAwardGlobal({ totalTodosCompleted: newCount });

      set(s => ({
        todos: s.todos.map(t =>
          t.id === id ? { ...t, completed: true, completedAt: now } : t
        ),
      }));
    } catch (e) {
      if (__DEV__) console.error('completeTodo failed:', e);
    }
  },

  uncompleteTodo: async (id) => {
    try {
      const db = await getDb();
      await db.runAsync(
        'UPDATE todos SET completed=0, completed_at=NULL WHERE id=?',
        [id]
      );
      set(s => ({
        todos: s.todos.map(t =>
          t.id === id ? { ...t, completed: false, completedAt: undefined } : t
        ),
      }));
    } catch (e) {
      if (__DEV__) console.error('uncompleteTodo failed:', e);
    }
  },

  toggleSubItem: async (todoId, subItemId) => {
    try {
      const db = await getDb();
      const todo = get().todos.find(t => t.id === todoId);
      const sub = todo?.subItems.find(s => s.id === subItemId);
      if (!sub) return;

      const newChecked = sub.checked ? 0 : 1;
      await db.runAsync('UPDATE todo_sub_items SET checked=? WHERE id=?', [newChecked, subItemId]);

      set(s => ({
        todos: s.todos.map(t =>
          t.id === todoId
            ? {
                ...t,
                subItems: t.subItems.map(si =>
                  si.id === subItemId ? { ...si, checked: newChecked === 1 } : si
                ),
              }
            : t
        ),
      }));
    } catch (e) {
      if (__DEV__) console.error('toggleSubItem failed:', e);
    }
  },

  addSubItem: async (todoId, title) => {
    try {
      const db = await getDb();
      const todo = get().todos.find(t => t.id === todoId);
      if (!todo) return;

      const maxOrder = todo.subItems.reduce((m, s) => Math.max(m, s.sortOrder), -1);
      const subItem: SubItem = {
        id: uuid(),
        todoId,
        title,
        checked: false,
        sortOrder: maxOrder + 1,
      };

      await db.runAsync(
        'INSERT INTO todo_sub_items (id, todo_id, title, checked, sort_order) VALUES (?,?,?,0,?)',
        [subItem.id, todoId, title, subItem.sortOrder]
      );

      set(s => ({
        todos: s.todos.map(t =>
          t.id === todoId ? { ...t, subItems: [...t.subItems, subItem] } : t
        ),
      }));
    } catch (e) {
      if (__DEV__) console.error('addSubItem failed:', e);
    }
  },

  rescheduleTodo: async (id, newDate) => {
    try {
      const db = await getDb();
      await db.runAsync('UPDATE todos SET due_date=? WHERE id=?', [newDate, id]);

      const today = todayString();
      if (newDate > today) {
        // Remove from visible list (it's for a future date)
        set(s => ({ todos: s.todos.filter(t => t.id !== id) }));
      } else {
        set(s => ({
          todos: s.todos.map(t => t.id === id ? { ...t, dueDate: newDate } : t),
        }));
      }
    } catch (e) {
      if (__DEV__) console.error('rescheduleTodo failed:', e);
    }
  },

  deleteTodo: async (id) => {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM todo_sub_items WHERE todo_id=?', [id]);
      await db.runAsync('DELETE FROM todos WHERE id=?', [id]);
      set(s => ({ todos: s.todos.filter(t => t.id !== id) }));
    } catch (e) {
      if (__DEV__) console.error('deleteTodo failed:', e);
    }
  },

  updateTodo: async (id, title) => {
    try {
      const db = await getDb();
      await db.runAsync('UPDATE todos SET title = ? WHERE id = ?', [title, id]);
      set(s => ({ todos: s.todos.map(t => t.id === id ? { ...t, title } : t) }));
    } catch (e) {
      if (__DEV__) console.error('updateTodo failed:', e);
    }
  },

  clearExpiredTodos: async () => {
    try {
      const db = await getDb();
      const today = todayString();
      // Delete todos with no due date or due date before today (keep future-dated todos)
      await db.runAsync(
        "DELETE FROM todos WHERE due_date IS NULL OR (due_date < ? AND completed = 0)",
        [today]
      );
      // Also delete completed todos from any previous day
      await db.runAsync(
        "DELETE FROM todos WHERE completed = 1 AND completed_at < ?",
        [today + 'T00:00:00']
      );
    } catch (e) {
      if (__DEV__) console.error('clearExpiredTodos failed:', e);
    }
  },
}));
