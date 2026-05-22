import { create } from 'zustand';
import { getDb } from '../db/client';
import type { BadgeDefinition, EarnedBadge } from '../types';
import { checkBadges } from '../logic/badgeEngine';

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface BadgeStore {
  earnedBadges: EarnedBadge[];
  loadBadges: () => Promise<void>;
  checkAndAward: (params: {
    goalId: string;
    currentStreak: number;
    totalLogs: number;
    playerLevel: number;
    cycleCount?: number;
    isPerfectWeek?: boolean;
    isPerfectMonth?: boolean;
    isComeback?: boolean;
    isNewBest?: boolean;
  }) => Promise<BadgeDefinition[]>;
  getBadgesForGoal: (goalId: string) => EarnedBadge[];
}

export const useBadgeStore = create<BadgeStore>((set, get) => ({
  earnedBadges: [],

  loadBadges: async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<any>('SELECT * FROM earned_badges ORDER BY earned_at ASC');
      set({ earnedBadges: rows.map((r: any) => ({ id: r.id, badgeId: r.badge_id, goalId: r.goal_id, earnedAt: r.earned_at })) });
    } catch (e) {
      console.error('loadBadges failed:', e);
      throw e;
    }
  },

  checkAndAward: async (params) => {
    try {
      const { earnedBadges } = get();
      const newBadgeDefs = checkBadges({ ...params, earnedBadges });
      if (newBadgeDefs.length === 0) return [];

      const db = await getDb();
      const now = new Date().toISOString();
      const newEarned: EarnedBadge[] = newBadgeDefs.map(def => ({
        id: uuid(),
        badgeId: def.id,
        goalId: def.category === 'level' || def.category === 'consistency' ? null : params.goalId,
        earnedAt: now,
      }));

      for (const badge of newEarned) {
        await db.runAsync(
          'INSERT OR IGNORE INTO earned_badges (id, badge_id, goal_id, earned_at) VALUES (?,?,?,?)',
          [badge.id, badge.badgeId, badge.goalId, badge.earnedAt]
        );
      }

      set(s => ({ earnedBadges: [...s.earnedBadges, ...newEarned] }));
      return newBadgeDefs;
    } catch (e) {
      console.error('checkAndAward failed:', e);
      throw e;
    }
  },

  getBadgesForGoal: (goalId) => get().earnedBadges.filter(b => b.goalId === goalId || b.goalId === null),
}));
