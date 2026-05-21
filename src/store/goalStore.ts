import { create } from 'zustand';
import { getDb } from '../db/client';
import type { Goal } from '../types';
import { Colors } from '../constants/theme';
import { todayString } from '../utils/dateUtils';

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface GoalStore {
  goals: Goal[];
  loadGoals: () => Promise<void>;
  addGoal: (input: Omit<Goal, 'id' | 'createdAt' | 'isArchived'>) => Promise<Goal>;
  updateGoal: (id: string, updates: Partial<Omit<Goal, 'id'>>) => Promise<void>;
  archiveGoal: (id: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  getGoal: (id: string) => Goal | undefined;
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],

  loadGoals: async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      id: string; name: string; description: string; type: string;
      color: string; icon: string; created_at: string;
      is_archived: number; target_count: number | null; unit: string | null;
    }>('SELECT * FROM goals ORDER BY created_at ASC');

    const goals: Goal[] = rows.map(r => ({
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
    }));
    set({ goals });
  },

  addGoal: async (input) => {
    const db = await getDb();
    const goal: Goal = {
      ...input,
      id: uuid(),
      createdAt: todayString(),
      isArchived: false,
    };
    await db.runAsync(
      'INSERT INTO goals (id, name, description, type, color, icon, created_at, is_archived, target_count, unit) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [goal.id, goal.name, goal.description, goal.type, goal.color, goal.icon, goal.createdAt, 0, goal.targetCount ?? null, goal.unit ?? null]
    );
    set(s => ({ goals: [...s.goals, goal] }));
    return goal;
  },

  updateGoal: async (id, updates) => {
    const db = await getDb();
    const goal = get().goals.find(g => g.id === id);
    if (!goal) return;
    const updated = { ...goal, ...updates };
    await db.runAsync(
      'UPDATE goals SET name=?, description=?, type=?, color=?, icon=?, is_archived=?, target_count=?, unit=? WHERE id=?',
      [updated.name, updated.description, updated.type, updated.color, updated.icon, updated.isArchived ? 1 : 0, updated.targetCount ?? null, updated.unit ?? null, id]
    );
    set(s => ({ goals: s.goals.map(g => g.id === id ? updated : g) }));
  },

  archiveGoal: async (id) => {
    const db = await getDb();
    await db.runAsync('UPDATE goals SET is_archived=1 WHERE id=?', [id]);
    set(s => ({ goals: s.goals.map(g => g.id === id ? { ...g, isArchived: true } : g) }));
  },

  deleteGoal: async (id) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM logs WHERE goal_id=?', [id]);
    await db.runAsync('DELETE FROM earned_badges WHERE goal_id=?', [id]);
    await db.runAsync('DELETE FROM grace_days WHERE goal_id=?', [id]);
    await db.runAsync('DELETE FROM goals WHERE id=?', [id]);
    set(s => ({ goals: s.goals.filter(g => g.id !== id) }));
  },

  getGoal: (id) => get().goals.find(g => g.id === id),
}));
