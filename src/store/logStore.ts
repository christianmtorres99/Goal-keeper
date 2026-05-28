import { create } from 'zustand';
import { getDb } from '../db/client';
import type { Log, LogEvent } from '../types';
import { todayString, daysBetween } from '../utils/dateUtils';
import { calculateXPForLog } from '../logic/xpEngine';
import { computeStreakWithGrace, isAlreadyLoggedToday } from '../logic/streakEngine';
import { BONUS_XP, DIFFICULTY_MULTIPLIERS, LUCKY_DROP_CHANCE } from '../constants/xp';
import { useGoalStore } from './goalStore';
import { useRestDayStore } from './restDayStore';

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface GraceState {
  graceDayUsed: boolean;
  graceDayRefillDate: string | null;
}

export type { LogEvent } from '../types';

interface LogStore {
  logs: Log[];
  graceStates: Record<string, GraceState>;
  loadLogs: () => Promise<void>;
  addLog: (goalId: string, note?: string, logDate?: string, allowMultiple?: boolean) => Promise<{ log: Log; bonusXP: number; events: LogEvent[] } | null>;
  removeLog: (logId: string) => Promise<void>;
  getLogsForGoal: (goalId: string) => Log[];
  getLogsForDate: (date: string) => Log[];
  getLogsForMonth: (year: number, month: number) => Log[];
  addBonusXP: (logId: string, amount: number) => Promise<void>;
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

  addLog: async (goalId, note, logDate?, allowMultiple?) => {
    try {
      const { logs, graceStates } = get();
      const goalLogs = logs.filter(l => l.goalId === goalId);
      const today = todayString();
      const dateToLog = logDate ?? today;
      const isPastDay = dateToLog !== today;

      // Block duplicate logs on the same date (unless allowMultiple is true)
      if (!allowMultiple && goalLogs.some(l => l.logDate === dateToLog)) return null;

      const grace = graceStates[goalId] ?? { graceDayUsed: false, graceDayRefillDate: null };
      const prevStreak = computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);
      const isFirst = goalLogs.length === 0;

      const goalData = useGoalStore.getState().goals.find(g => g.id === goalId);
      const diffMult = DIFFICULTY_MULTIPLIERS[goalData?.difficulty ?? 'medium'] ?? 1.0;

      // For past-day logs, award base XP only (no retroactive streak bonuses)
      let xpAwarded: number;
      if (isPastDay) {
        xpAwarded = 15;
      } else {
        const newStreak = prevStreak.currentStreak + 1;
        xpAwarded = Math.round(calculateXPForLog(newStreak) * diffMult);
      }

      // Lucky drop: 15% chance to double xpAwarded (only for today's logs)
      const events: LogEvent[] = [];
      let bonusXP = 0;
      if (!isPastDay) {
        const isLucky = Math.random() < LUCKY_DROP_CHANCE;
        if (isLucky) {
          xpAwarded = Math.round(xpAwarded * 2);
          events.push('luckyDrop');
        }
      }

      const log: Log = {
        id: uuid(),
        goalId,
        logDate: dateToLog,
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

      // For past-day logs: skip grace day update and bonus event detection
      if (isPastDay) {
        set(s => ({ logs: [...s.logs, log] }));
        return { log, bonusXP: 0, events: [] };
      }

      // Recompute streak with the new log included
      const updatedGoalLogs = [...goalLogs, log];
      const newGrace = computeStreakWithGrace(updatedGoalLogs, grace.graceDayUsed, grace.graceDayRefillDate);

      await db.runAsync(
        'INSERT OR REPLACE INTO grace_days (goal_id, grace_used, refill_date) VALUES (?,?,?)',
        [goalId, newGrace.graceDayUsed ? 1 : 0, newGrace.graceDayRefillDate ?? null]
      );

      // --- Detect bonus events ---
      // (events and bonusXP already initialized above)

      // Time bonus: earlyBird before 9am, nightOwl after 10pm
      const hour = new Date().getHours();
      if (hour < 9) {
        bonusXP += BONUS_XP.earlyBird;
        events.push('earlyBird');
      } else if (hour >= 22) {
        bonusXP += BONUS_XP.nightOwl;
        events.push('nightOwl');
      }

      // gap > 1 means streak was broken; comeback = they're logging again after a break
      const wasGap = prevStreak.lastLogDate
        ? daysBetween(prevStreak.lastLogDate, today) > 1
        : false;

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

      const graceConsumedThisLog = !grace.graceDayUsed && newGrace.graceDayUsed;
      if (newGrace.currentStreak > 0 && newGrace.currentStreak % 7 === 0 && !graceConsumedThisLog) {
        events.push('perfectWeek');
        bonusXP += BONUS_XP.perfectWeek;
      }

      // Perfect month: every day from the 1st to today has at least one log (unique dates)
      const monthStart = `${today.slice(0, 7)}-01`;
      const daysInRange = daysBetween(monthStart, today) + 1;
      const uniqueDaysLogged = new Set(
        updatedGoalLogs.filter(l => l.logDate >= monthStart && l.logDate <= today).map(l => l.logDate)
      ).size;
      if (uniqueDaysLogged >= daysInRange && daysInRange > 1) {
        events.push('perfectMonth');
        bonusXP += BONUS_XP.perfectMonth;
      }

      // Persist bonus XP back to the log row
      if (bonusXP > 0) {
        await db.runAsync('UPDATE logs SET bonus_xp = ? WHERE id = ?', [bonusXP, log.id]);
        log.bonusXp = bonusXP;
      }

      const hadAnyLogToday = get().logs.some(l => l.logDate === today);
      set(s => ({
        logs: [...s.logs, log],
        graceStates: {
          ...s.graceStates,
          [goalId]: { graceDayUsed: newGrace.graceDayUsed, graceDayRefillDate: newGrace.graceDayRefillDate },
        },
      }));

      // Increment active day count when the very first log of the day is added
      if (!hadAnyLogToday) {
        useRestDayStore.getState().incrementActiveDay().catch(e =>
          console.error('incrementActiveDay failed:', e)
        );
      }

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

  addBonusXP: async (logId: string, amount: number) => {
    try {
      const db = await getDb();
      await db.runAsync('UPDATE logs SET bonus_xp = bonus_xp + ? WHERE id = ?', [amount, logId]);
      set(s => ({
        logs: s.logs.map(l => l.id === logId ? { ...l, bonusXp: l.bonusXp + amount } : l),
      }));
    } catch (e) {
      console.error('addBonusXP failed:', e);
    }
  },
}));
