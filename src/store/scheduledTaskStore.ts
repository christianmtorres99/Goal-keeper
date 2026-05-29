import { create } from 'zustand';
import { getDb } from '../db/client';
import type { ScheduledTask } from '../types';
import { todayString } from '../utils/dateUtils';

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface ScheduledTaskStore {
  scheduledTasks: ScheduledTask[];
  loadScheduledTasks: () => Promise<void>;
  addScheduledTask: (task: Omit<ScheduledTask, 'id' | 'createdAt'>) => Promise<ScheduledTask>;
  deleteScheduledTask: (id: string) => Promise<void>;
  generateTodaysTasks: () => Promise<void>;
}

export const useScheduledTaskStore = create<ScheduledTaskStore>((set, get) => ({
  scheduledTasks: [],

  loadScheduledTasks: async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM scheduled_tasks ORDER BY created_at ASC');
    set({
      scheduledTasks: rows.map(r => ({
        id: r.id as string,
        title: r.title as string,
        daysOfWeek: JSON.parse(r.days_of_week as string) as number[],
        icon: r.icon as string,
        color: r.color as string,
        createdAt: r.created_at as string,
      })),
    });
  },

  addScheduledTask: async (task) => {
    const db = await getDb();
    const newTask: ScheduledTask = { ...task, id: uuid(), createdAt: new Date().toISOString() };
    await db.runAsync(
      'INSERT INTO scheduled_tasks (id, title, days_of_week, icon, color, created_at) VALUES (?,?,?,?,?,?)',
      [newTask.id, newTask.title, JSON.stringify(newTask.daysOfWeek), newTask.icon, newTask.color, newTask.createdAt],
    );
    set(s => ({ scheduledTasks: [...s.scheduledTasks, newTask] }));
    return newTask;
  },

  deleteScheduledTask: async (id) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM scheduled_tasks WHERE id = ?', [id]);
    set(s => ({ scheduledTasks: s.scheduledTasks.filter(t => t.id !== id) }));
  },

  generateTodaysTasks: async () => {
    const { scheduledTasks } = get();
    if (scheduledTasks.length === 0) return;
    const todayStr = todayString(); // Use LOCAL date, not UTC
    const todayDow = new Date().getDay(); // 0=Sun
    // Import todoStore dynamically to avoid circular dependency
    const { useTodoStore } = await import('./todoStore');
    const todos = useTodoStore.getState().todos;
    for (const task of scheduledTasks) {
      if (!task.daysOfWeek.includes(todayDow)) continue;
      // Check if a todo with this title already exists for today
      const alreadyExists = todos.some(t => t.title === task.title && t.dueDate === todayStr);
      if (!alreadyExists) {
        await useTodoStore.getState().addTodo(task.title, todayStr);
      }
    }
  },
}));
