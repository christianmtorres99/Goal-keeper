import { create } from 'zustand';
import { getDb } from '../db/client';
import type { Log } from '../types';
import { todayString, daysBetween } from '../utils/dateUtils';
import { calculateXPForLog } from '../logic/xpEngine';
import { computeStreakWithGrace, isAlreadyLoggedToday } from '../logic/streakEngine';
import { BONUS_XP } from '../constants/xp';

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface GraceState {
  graceDayUsed: boolean;
  graceDayRefillDate: string | null;
}

export type LogEvent = 'firstLog' | 'perfectWeek' | 'perfectMonth' | 'comeback' | 'newBest';

interface LogStore {
  logs: Log[];
  graceStates: Record<string, GraceState>;
  loadLogs: () => Promise<void>;
  addLog: (goalId: string, note?: string) => Promise<{ log: Log; bonusXP: number; events: LogEvent[] } | null>;
  removeLog: (logId: string) => Promise<void>;
  getLogsForGoal: (goalId: string) => Log[];
  getLogsForDate: (date: string) => Log[];
  getLogsForMonth: (year: number, month: number) => Log[];
}

export const useLogStore = create<LogStore>((set, get) => ({
  logs: [],
  graceStates: {},

  loadLogs: async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<any>('SELECT * FROM logs ORDER BY log_date ASC');
      const graceRows = await db.getAllAsync<any>('SELECT * FROM grace_days');

      const graceStates: Record<string, GraceState> = {};
      graceRows.forEach((r: any) => {
        graceStates[r.goal_id] = {
          graceDayUsed: r.grace_used === 1,
          graceDayRefillDate: r.refill_date,
        };
      });

      const logs: Log[] = rows.map((r: any) => ({
        id: r.id,
        goalId: r.goal_id,
        logDate: r.log_date,
        note: r.note ?? undefined,
        createdAt: r.created_at,
        xpAwarded: r.xp_awarded,
        bonusXp: r.bonus_xp ?? 0,
      }));

      set({ logs, graceStates });
    } catch (e) {
      console.error('loadLogs failed:', e);
      throw e;
    }
  },

  addLog: async (goalId, note) => {
    try {
      const { logs, graceStates } = get();
      const goalLogs = logs.filter(l => l.goalId === goalId);

      if (isAlreadyLoggedToday(goalLogs)) return null;

      const grace = graceStates[goalId] ?? { graceDayUsed: false, graceDayRefillDate: null };
      const prevStreak = computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);
      const isFirst = goalLogs.length === 0;

      // gap > 1 means streak was broken; comeback = they're logging again after a break
      const wasGap = prevStreak.lastLogDate
        ? daysBetween(prevStreak.lastLogDate, todayString()) > 1
        : false;

      const newStreak = prevStreak.currentStreak + 1;
      const xpAwarded = calculateXPForLog(newStreak);
      const today = todayString();

      const log: Log = {
        id: uuid(),
        goalId,
        logDate: today,
        note,
        createdAt: new Date().toISOString(),
        xpAwarded,
        bonusXp: 0,
      };

      const db = await getDb();
      await db.runAsync(
        'INSERT INTO logs (id, goal_id, log_date, note, created_at, xp_awarded, bonus_xp) VALUES (?,?,?,?,?,?,?)',
        [log.id, log.goalId, log.logDate, log.note ?? null, log.createdAt, log.xpAwarded, 0]
      );

      // Recompute streak with the new log included
      const updatedGoalLogs = [...goalLogs, log];
      const newGrace = computeStreakWithGrace(updatedGoalLogs, grace.graceDayUsed, grace.graceDayRefillDate);

      await db.runAsync(
        'INSERT OR REPLACE INTO grace_days (goal_id, grace_used, refill_date) VALUES (?,?,?)',
        [goalId, newGrace.graceDayUsed ? 1 : 0, newGrace.graceDayRefillDate ?? null]
      );

      // --- Detect bonus events ---
      const events: LogEvent[] = [];
      let bonusXP = 0;

      if (isFirst) {
        events.push('firstLog');
        bonusXP += BONUS_XP.firstLog;
      }

      if (!isFirst && wasGap) {
        events.push('comeback');
        bonusXP += BONUS_XP.comeback;
      }

      // Bug fix: compare new streak against PREVIOUS longest streak
      if (!isFirst && newGrace.currentStreak > prevStreak.longestStreak) {
        events.push('newBest');
        bonusXP += BONUS_XP.newPersonalBest;
      }

      if (newGrace.currentStreak > 0 && newGrace.currentStreak % 7 === 0) {
        events.push('perfectWeek');
        bonusXP += BONUS_XP.perfectWeek;
      }

      // Perfect month: every day from the 1st to today has a log
      const monthStart = `${today.slice(0, 7)}-01`;
      const daysInRange = daysBetween(monthStart, today) + 1;
      const logsThisMonth = updatedGoalLogs.filter(l => l.logDate >= monthStart && l.logDate <= today).length;
      if (logsThisMonth >= daysInRange && daysInRange > 1) {
        events.push('perfectMonth');
        bonusXP += BONUS_XP.perfectMonth;
      }

      // Persist bonus XP back to the log row
      if (bonusXP > 0) {
        await db.runAsync('UPDATE logs SET bonus_xp = ? WHERE id = ?', [bonusXP, log.id]);
        log.bonusXp = bonusXP;
      }

      set(s => ({
        logs: [...s.logs, log],
        graceStates: {
          ...s.graceStates,
          [goalId]: { graceDayUsed: newGrace.graceDayUsed, graceDayRefillDate: newGrace.graceDayRefillDate },
        },
      }));

      return { log, bonusXP, events };
    } catch (e) {
      console.error('addLog failed:', e);
      throw e;
    }
  },

  removeLog: async (logId) => {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM logs WHERE id = ?', [logId]);
      set(s => ({ logs: s.logs.filter(l => l.id !== logId) }));
    } catch (e) {
      console.error('removeLog failed:', e);
      throw e;
    }
  },

  getLogsForGoal: (goalId) => get().logs.filter(l => l.goalId === goalId),

  getLogsForDate: (date) => get().logs.filter(l => l.logDate === date),

  getLogsForMonth: (year, month) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return get().logs.filter(l => l.logDate.startsWith(prefix));
  },
}));
