import { create } from 'zustand';
import { getDb } from '../db/client';
import type { Log } from '../types';
import { todayString } from '../utils/dateUtils';
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

interface LogStore {
  logs: Log[];
  graceStates: Record<string, GraceState>;
  loadLogs: () => Promise<void>;
  addLog: (goalId: string, note?: string) => Promise<{ log: Log; bonusXP: number; events: LogEvent[] } | null>;
  getLogsForGoal: (goalId: string) => Log[];
  getLogsForDate: (date: string) => Log[];
  getLogsForMonth: (year: number, month: number) => Log[];
}

export type LogEvent =
  | 'firstLog'
  | 'perfectWeek'
  | 'perfectMonth'
  | 'comeback'
  | 'newBest';

export const useLogStore = create<LogStore>((set, get) => ({
  logs: [],
  graceStates: {},

  loadLogs: async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      id: string; goal_id: string; log_date: string;
      note: string | null; created_at: string; xp_awarded: number;
    }>('SELECT * FROM logs ORDER BY log_date ASC');

    const graceRows = await db.getAllAsync<{
      goal_id: string; grace_used: number; refill_date: string | null;
    }>('SELECT * FROM grace_days');

    const graceStates: Record<string, GraceState> = {};
    graceRows.forEach(r => {
      graceStates[r.goal_id] = {
        graceDayUsed: r.grace_used === 1,
        graceDayRefillDate: r.refill_date,
      };
    });

    const logs: Log[] = rows.map(r => ({
      id: r.id,
      goalId: r.goal_id,
      logDate: r.log_date,
      note: r.note ?? undefined,
      createdAt: r.created_at,
      xpAwarded: r.xp_awarded,
    }));

    set({ logs, graceStates });
  },

  addLog: async (goalId, note) => {
    const { logs, graceStates } = get();
    const goalLogs = logs.filter(l => l.goalId === goalId);

    if (isAlreadyLoggedToday(goalLogs)) return null;

    const grace = graceStates[goalId] ?? { graceDayUsed: false, graceDayRefillDate: null };
    const prevStreak = computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);
    const isFirst = goalLogs.length === 0;
    const wasGap = prevStreak.lastLogDate
      ? Math.abs(new Date(todayString()).getTime() - new Date(prevStreak.lastLogDate).getTime()) / 86400000 > 1
      : false;

    const newStreak = prevStreak.currentStreak + 1;
    const xpAwarded = calculateXPForLog(newStreak);

    const log: Log = {
      id: uuid(),
      goalId,
      logDate: todayString(),
      note,
      createdAt: new Date().toISOString(),
      xpAwarded,
    };

    const db = await getDb();
    await db.runAsync(
      'INSERT INTO logs (id, goal_id, log_date, note, created_at, xp_awarded) VALUES (?,?,?,?,?,?)',
      [log.id, log.goalId, log.logDate, log.note ?? null, log.createdAt, log.xpAwarded]
    );

    // Update grace day state
    const newGrace = computeStreakWithGrace(
      [...goalLogs, log],
      grace.graceDayUsed,
      grace.graceDayRefillDate
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO grace_days (goal_id, grace_used, refill_date) VALUES (?,?,?)',
      [goalId, newGrace.graceDayUsed ? 1 : 0, newGrace.graceDayRefillDate ?? null]
    );

    set(s => ({
      logs: [...s.logs, log],
      graceStates: {
        ...s.graceStates,
        [goalId]: { graceDayUsed: newGrace.graceDayUsed, graceDayRefillDate: newGrace.graceDayRefillDate },
      },
    }));

    // Detect bonus events
    const events: LogEvent[] = [];
    let bonusXP = 0;

    if (isFirst) {
      events.push('firstLog');
      bonusXP += BONUS_XP.firstLog;
    }
    if (wasGap && prevStreak.lastLogDate) {
      events.push('comeback');
      bonusXP += BONUS_XP.comeback;
    }
    if (newGrace.currentStreak > newGrace.longestStreak && !isFirst) {
      events.push('newBest');
      bonusXP += BONUS_XP.newPersonalBest;
    }
    if (newGrace.currentStreak > 0 && newGrace.currentStreak % 7 === 0) {
      events.push('perfectWeek');
      bonusXP += BONUS_XP.perfectWeek;
    }

    return { log, bonusXP, events };
  },

  getLogsForGoal: (goalId) => get().logs.filter(l => l.goalId === goalId),

  getLogsForDate: (date) => get().logs.filter(l => l.logDate === date),

  getLogsForMonth: (year, month) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return get().logs.filter(l => l.logDate.startsWith(prefix));
  },
}));
