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
    logHour?: number;
    quitGoalMaxStreak?: number;
  }) => Promise<BadgeDefinition[]>;
  checkAndAwardGlobal: (params: {
    totalTodosCompleted?: number;
    journalStreak?: number;
    logHour?: number;
    prestigeLevel?: number;
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
      if (__DEV__) console.error('loadBadges failed:', e);
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
        goalId: (def.category === 'level' || def.category === 'prestige'
          || def.category === 'consistency' || def.category === 'todos'
          || def.category === 'journal' || def.category === 'time')
          ? null : params.goalId,
        earnedAt: now,
      }));

      // Double-check DB to prevent race-condition duplicates (INSERT OR IGNORE only guards on PK)
      const alreadyInDb = await db.getAllAsync<{ badge_id: string }>(
        `SELECT badge_id FROM earned_badges WHERE badge_id IN (${newBadgeDefs.map(() => '?').join(',')})`,
        newBadgeDefs.map(d => d.id)
      );
      const alreadyEarnedInDb = new Set(alreadyInDb.map(r => r.badge_id));
      const badgesToInsert = newEarned.filter(b => !alreadyEarnedInDb.has(b.badgeId));

      for (const badge of badgesToInsert) {
        await db.runAsync(
          'INSERT OR IGNORE INTO earned_badges (id, badge_id, goal_id, earned_at) VALUES (?,?,?,?)',
          [badge.id, badge.badgeId, badge.goalId, badge.earnedAt]
        );
      }

      set(s => ({ earnedBadges: [...s.earnedBadges, ...badgesToInsert] }));
      return newBadgeDefs;
    } catch (e) {
      if (__DEV__) console.error('checkAndAward failed:', e);
      throw e;
    }
  },

  checkAndAwardGlobal: async (params) => {
    try {
      const { earnedBadges } = get();
      const newBadgeDefs = checkBadges({
        goalId: 'global',
        currentStreak: 0,
        totalLogs: 0,
        playerLevel: 0,
        earnedBadges,
        ...params,
      });
      if (newBadgeDefs.length === 0) return [];

      const db = await getDb();
      const now = new Date().toISOString();
      const newEarned: EarnedBadge[] = newBadgeDefs.map(def => ({
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        badgeId: def.id,
        goalId: null,
        earnedAt: now,
      }));

      const alreadyInDb = await db.getAllAsync<{ badge_id: string }>(
        `SELECT badge_id FROM earned_badges WHERE badge_id IN (${newBadgeDefs.map(() => '?').join(',')})`,
        newBadgeDefs.map(d => d.id),
      );
      const alreadyEarnedInDb = new Set(alreadyInDb.map(r => r.badge_id));
      const badgesToInsert = newEarned.filter(b => !alreadyEarnedInDb.has(b.badgeId));

      for (const badge of badgesToInsert) {
        await db.runAsync(
          'INSERT OR IGNORE INTO earned_badges (id, badge_id, goal_id, earned_at) VALUES (?,?,?,?)',
          [badge.id, badge.badgeId, badge.goalId, badge.earnedAt],
        );
      }

      set(s => ({ earnedBadges: [...s.earnedBadges, ...badgesToInsert] }));
      return newBadgeDefs;
    } catch (e) {
      if (__DEV__) console.error('checkAndAwardGlobal failed:', e);
      return [];
    }
  },

  getBadgesForGoal: (goalId) => get().earnedBadges.filter(b => b.goalId === goalId || b.goalId === null),
}));
