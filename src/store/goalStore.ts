import { create } from 'zustand';
import { getDb } from '../db/client';
import type { Goal, GoalCategory } from '../types';
import { todayString } from '../utils/dateUtils';
import { cancelGoalReminder } from '../utils/notifications';

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface GoalStore {
  goals: Goal[];
  archivedGoals: Goal[];
  loadGoals: () => Promise<void>;
  loadArchivedGoals: () => Promise<void>;
  addGoal: (input: Omit<Goal, 'id' | 'createdAt' | 'isArchived' | 'sortOrder' | 'cycleCount'>) => Promise<Goal>;
  updateGoal: (id: string, updates: Partial<Omit<Goal, 'id'>>) => Promise<void>;
  archiveGoal: (id: string) => Promise<void>;
  restoreGoal: (id: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  reorderGoals: (orderedIds: string[]) => Promise<void>;
  resetMilestoneLogs: (goalId: string) => Promise<void>;
  getGoal: (id: string) => Goal | undefined;
}

function rowToGoal(r: any): Goal {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type as 'habit' | 'milestone',
    color: r.color,
    icon: r.icon,
    createdAt: r.created_at,
    isArchived: r.is_archived === 1,
    targetCount: r.target_count ?? undefined,
    unit: r.unit ?? undefined,
    sortOrder: r.sort_order ?? 0,
    category: (r.category ?? 'other') as GoalCategory,
    notificationTime: r.notification_time ?? undefined,
    notificationId: r.notification_id ?? undefined,
    completedAt: r.completed_at ?? undefined,
    cycleCount: r.cycle_count ?? 0,
    allowMultiplePerDay: r.allow_multiple_per_day === 1,
  };
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],
  archivedGoals: [],

  loadGoals: async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<any>('SELECT * FROM goals WHERE is_archived = 0 ORDER BY sort_order ASC, created_at ASC');
      set({ goals: rows.map(rowToGoal) });
    } catch (e) {
      console.error('loadGoals failed:', e);
      throw e;
    }
  },

  loadArchivedGoals: async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<any>('SELECT * FROM goals WHERE is_archived = 1 ORDER BY created_at DESC');
      set({ archivedGoals: rows.map(rowToGoal) });
    } catch (e) {
      console.error('loadArchivedGoals failed:', e);
      throw e;
    }
  },

  addGoal: async (input) => {
    try {
      const db = await getDb();
      const maxOrder = get().goals.reduce((m, g) => Math.max(m, g.sortOrder), -1);
      const goal: Goal = {
        ...input,
        id: uuid(),
        createdAt: todayString(),
        isArchived: false,
        sortOrder: maxOrder + 1,
        cycleCount: 0,
      };
      await db.runAsync(
        `INSERT INTO goals (id, name, description, type, color, icon, created_at, is_archived,
          target_count, unit, sort_order, category, notification_time, notification_id, completed_at, cycle_count, allow_multiple_per_day)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [goal.id, goal.name, goal.description, goal.type, goal.color, goal.icon,
         goal.createdAt, 0, goal.targetCount ?? null, goal.unit ?? null,
         goal.sortOrder, goal.category, goal.notificationTime ?? null,
         goal.notificationId ?? null, goal.completedAt ?? null, goal.cycleCount,
         goal.allowMultiplePerDay ? 1 : 0]
      );
      set(s => ({ goals: [...s.goals, goal] }));
      return goal;
    } catch (e) {
      console.error('addGoal failed:', e);
      throw e;
    }
  },

  updateGoal: async (id, updates) => {
    try {
      const db = await getDb();
      const goal = get().goals.find(g => g.id === id) ?? get().archivedGoals.find(g => g.id === id);
      if (!goal) return;
      const updated = { ...goal, ...updates };
      await db.runAsync(
        `UPDATE goals SET name=?, description=?, type=?, color=?, icon=?, is_archived=?,
          target_count=?, unit=?, sort_order=?, category=?, notification_time=?,
          notification_id=?, completed_at=?, cycle_count=?, allow_multiple_per_day=? WHERE id=?`,
        [updated.name, updated.description, updated.type, updated.color, updated.icon,
         updated.isArchived ? 1 : 0, updated.targetCount ?? null, updated.unit ?? null,
         updated.sortOrder, updated.category, updated.notificationTime ?? null,
         updated.notificationId ?? null, updated.completedAt ?? null, updated.cycleCount,
         updated.allowMultiplePerDay ? 1 : 0, id]
      );
      set(s => ({
        goals: s.goals.map(g => g.id === id ? updated : g),
        archivedGoals: s.archivedGoals.map(g => g.id === id ? updated : g),
      }));
    } catch (e) {
      console.error('updateGoal failed:', e);
      throw e;
    }
  },

  archiveGoal: async (id) => {
    try {
      const db = await getDb();
      const goal = get().goals.find(g => g.id === id);
      if (goal?.notificationId) {
        await cancelGoalReminder(goal.notificationId).catch(() => {});
      }
      await db.runAsync('UPDATE goals SET is_archived=1, notification_id=NULL WHERE id=?', [id]);
      const archived = get().goals.find(g => g.id === id);
      set(s => ({
        goals: s.goals.filter(g => g.id !== id),
        archivedGoals: archived ? [{ ...archived, isArchived: true }, ...s.archivedGoals] : s.archivedGoals,
      }));
    } catch (e) {
      console.error('archiveGoal failed:', e);
      throw e;
    }
  },

  restoreGoal: async (id) => {
    try {
      const db = await getDb();
      const maxOrder = get().goals.reduce((m, g) => Math.max(m, g.sortOrder), -1);
      await db.runAsync('UPDATE goals SET is_archived=0, sort_order=? WHERE id=?', [maxOrder + 1, id]);
      const restored = get().archivedGoals.find(g => g.id === id);
      if (!restored) return;
      const updatedGoal = { ...restored, isArchived: false, sortOrder: maxOrder + 1 };
      set(s => ({
        archivedGoals: s.archivedGoals.filter(g => g.id !== id),
        goals: [...s.goals, updatedGoal],
      }));
    } catch (e) {
      console.error('restoreGoal failed:', e);
      throw e;
    }
  },

  deleteGoal: async (id) => {
    try {
      const db = await getDb();
      const goal = get().goals.find(g => g.id === id) ?? get().archivedGoals.find(g => g.id === id);
      if (goal?.notificationId) {
        await cancelGoalReminder(goal.notificationId).catch(() => {});
      }
      await db.runAsync('DELETE FROM logs WHERE goal_id=?', [id]);
      await db.runAsync('DELETE FROM earned_badges WHERE goal_id=?', [id]);
      await db.runAsync('DELETE FROM grace_days WHERE goal_id=?', [id]);
      await db.runAsync('DELETE FROM goals WHERE id=?', [id]);
      set(s => ({
        goals: s.goals.filter(g => g.id !== id),
        archivedGoals: s.archivedGoals.filter(g => g.id !== id),
      }));
    } catch (e) {
      console.error('deleteGoal failed:', e);
      throw e;
    }
  },

  reorderGoals: async (orderedIds) => {
    try {
      const db = await getDb();
      for (let i = 0; i < orderedIds.length; i++) {
        await db.runAsync('UPDATE goals SET sort_order=? WHERE id=?', [i, orderedIds[i]]);
      }
      set(s => {
        const orderMap = Object.fromEntries(orderedIds.map((id, i) => [id, i]));
        return { goals: [...s.goals].sort((a, b) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0)).map((g, i) => ({ ...g, sortOrder: i })) };
      });
    } catch (e) {
      console.error('reorderGoals failed:', e);
      throw e;
    }
  },

  resetMilestoneLogs: async (goalId) => {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM logs WHERE goal_id=?', [goalId]);
      await db.runAsync('DELETE FROM grace_days WHERE goal_id=?', [goalId]);
    } catch (e) {
      console.error('resetMilestoneLogs failed:', e);
      throw e;
    }
  },

  getGoal: (id) => get().goals.find(g => g.id === id) ?? get().archivedGoals.find(g => g.id === id),
}));
