import { create } from 'zustand';
import { getDb } from '../db/client';
import type { Log, LogEvent } from '../types';
import { todayString, daysBetween } from '../utils/dateUtils';
import { calculateXPForLog } from '../logic/xpEngine';
import { computeStreakWithGrace, isAlreadyLoggedToday } from '../logic/streakEngine';
import {
  BONUS_XP,
  DIFFICULTY_MULTIPLIERS,
  LUCKY_DROP_CHANCE,
  STREAK_MULTIPLIERS,
  COIN_PER_LOG,
  COIN_STREAK_TIER_BONUS,
  SHARD_DROP_CHANCE,
} from '../constants/xp';
import { useGoalStore } from './goalStore';
import { useRestDayStore } from './restDayStore';
import { usePerkStore } from './perkStore';
import { useGameStore } from './gameStore';
import { useCoinStore } from './coinStore';
import { useCraftingStore } from './craftingStore';
import { useRaidStore } from './raidStore';
import { getGoalRank } from '../utils/goalRank';

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
  comebackAwardedDate: string | null;
  loadLogs: () => Promise<void>;
  addLog: (
    goalId: string,
    note?: string,
    logDate?: string,
    allowMultiple?: boolean,
    count?: number,
    isRelapse?: boolean,
  ) => Promise<{
    log: Log;
    bonusXP: number;
    events: LogEvent[];
    coinsAwarded: number;
    shardDropped: boolean;
    rankUp: boolean;
  } | null>;
  removeLog: (logId: string) => Promise<void>;
  getLogsForGoal: (goalId: string) => Log[];
  getLogsForDate: (date: string) => Log[];
  getLogsForMonth: (year: number, month: number) => Log[];
  addBonusXP: (logId: string, amount: number) => Promise<void>;
}

export const useLogStore = create<LogStore>((set, get) => ({
  logs: [],
  graceStates: {},
  comebackAwardedDate: null,

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
        count: r.count ?? 1,
        isRelapse: r.is_relapse === 1,
      }));

      set({ logs, graceStates });
    } catch (e) {
      console.error('loadLogs failed:', e);
      throw e;
    }
  },

  addLog: async (goalId, note, logDate?, allowMultiple?, count = 1, isRelapse = false) => {
    try {
      const { logs, graceStates } = get();
      const goalLogs = logs.filter(l => l.goalId === goalId);
      const today = todayString();
      const dateToLog = logDate ?? today;
      const isPastDay = dateToLog !== today;

      // Block duplicate logs on the same date (unless allowMultiple is true)
      if (!allowMultiple && !isRelapse && goalLogs.some(l => l.logDate === dateToLog)) return null;

      // For quit goals: block duplicate same-day relapses
      if (isRelapse && goalLogs.some((l: any) => l.logDate === dateToLog && l.isRelapse === 1)) return null;

      // Anti-cheat: For habit goals, only the first log of the day earns XP/coins/shards
      const goalData = useGoalStore.getState().goals.find(g => g.id === goalId);
      const isHabitDuplicate =
        goalData?.type === 'habit' &&
        goalLogs.some(l => l.logDate === dateToLog && l.xpAwarded > 0);
      const isZeroAward = isHabitDuplicate && !isPastDay;

      const grace = graceStates[goalId] ?? { graceDayUsed: false, graceDayRefillDate: null };
      const prevStreak = computeStreakWithGrace(goalLogs, grace.graceDayUsed, grace.graceDayRefillDate);
      const isFirst = goalLogs.length === 0;

      const diffMult = DIFFICULTY_MULTIPLIERS[goalData?.difficulty ?? 'medium'] ?? 1.0;

      // For past-day logs, award base XP only (no retroactive streak bonuses)
      let xpAwarded: number;
      let newStreak = 0;
      if (isPastDay) {
        xpAwarded = 15;
      } else {
        newStreak = prevStreak.currentStreak + 1;
        xpAwarded = Math.round(calculateXPForLog(newStreak) * diffMult);
      }

      // Lucky drop: use lucky_charm perk or crafting boost to adjust chance
      const events: LogEvent[] = [];
      let bonusXP = 0;
      if (!isPastDay && !isZeroAward) {
        const luckyBoostActive = useCraftingStore.getState().isLuckyBoostActive();
        const baseChance = usePerkStore.getState().isEquipped('lucky_charm')
          ? 0.25
          : LUCKY_DROP_CHANCE;
        const luckyChance = luckyBoostActive ? baseChance * 2 : baseChance;

        const isLucky = Math.random() < luckyChance;
        if (isLucky) {
          xpAwarded = Math.round(xpAwarded * 2);
          events.push('luckyDrop');
          useCraftingStore.getState().incrementLuckyDropCount().catch(() => {});
        }
      } else if (!isPastDay) {
        // isZeroAward: skip lucky drop
      } else {
        // isPastDay: skip lucky drop
      }

      // XP surge consumable
      if (!isPastDay && !isZeroAward) {
        const { isSurgeActive, consumeSurge, activeSurge } = useCraftingStore.getState();
        if (isSurgeActive()) {
          xpAwarded = Math.round(xpAwarded * (activeSurge?.multiplier ?? 1.5));
          consumeSurge().catch(() => {});
        }
      }

      // Scholar's Mark perk: +15% XP
      if (usePerkStore.getState().isEquipped('scholars_mark') && !isPastDay && !isZeroAward) {
        xpAwarded = Math.round(xpAwarded * 1.15);
      }

      // Prestige XP bonus
      const prestigeBonus = useGameStore.getState().prestigeXPBonus;
      if (prestigeBonus > 0 && !isPastDay && !isZeroAward) {
        xpAwarded = Math.round(xpAwarded * (1 + prestigeBonus));
      }

      // Debuff effects on XP (from raid)
      const debuff = useRaidStore.getState().getActiveDebuff();
      if (debuff && !isPastDay && !isZeroAward) {
        if (debuff.type === 'xp_penalty') {
          xpAwarded = Math.round(xpAwarded * debuff.magnitude);
        } else if (debuff.type === 'all_half') {
          xpAwarded = Math.round(xpAwarded * (1 - (1 - 0.80) * debuff.magnitude));
        }
        if (debuff.type === 'streak_cap' && !isPastDay) {
          const difficultyBonus = { easy: 0, medium: 2, hard: 5, extreme: 10 }[goalData?.difficulty ?? 'medium'] ?? 2;
          // Cap multiplier: streak_cap.magnitude = max allowed streak tier multiplier
          const cappedXP = Math.round(calculateXPForLog(Math.min(newStreak, 3)) * diffMult);
          if (xpAwarded > cappedXP) xpAwarded = cappedXP;
        }
      }

      // Zero-award: override all xp to 0 for extra habit logs
      if (isZeroAward) {
        xpAwarded = 0;
      }

      // Relapse: record with 0 XP/coins/shards, reset grace, return early
      if (isRelapse) {
        const relapseLog: Log = {
          id: uuid(),
          goalId,
          logDate: dateToLog,
          note,
          createdAt: new Date().toISOString(),
          xpAwarded: 0,
          bonusXp: 0,
          count: 1,
        };
        const db = await getDb();
        await db.runAsync(
          'INSERT INTO logs (id, goal_id, log_date, note, created_at, xp_awarded, bonus_xp, count, is_relapse) VALUES (?,?,?,?,?,?,?,?,?)',
          [relapseLog.id, relapseLog.goalId, relapseLog.logDate, relapseLog.note ?? null, relapseLog.createdAt, 0, 0, 1, 1]
        );
        // Reset grace day on relapse
        await db.runAsync(
          'INSERT OR REPLACE INTO grace_days (goal_id, grace_used, refill_date) VALUES (?,?,?)',
          [goalId, 0, null]
        );
        set(s => ({
          logs: [...s.logs, relapseLog],
          graceStates: { ...s.graceStates, [goalId]: { graceDayUsed: false, graceDayRefillDate: null } },
        }));
        return { log: relapseLog, bonusXP: 0, events: ['relapsed'], coinsAwarded: 0, shardDropped: false, rankUp: false };
      }

      const log: Log = {
        id: uuid(),
        goalId,
        logDate: dateToLog,
        note,
        createdAt: new Date().toISOString(),
        xpAwarded,
        bonusXp: 0,
        count: count ?? 1,
      };

      const db = await getDb();
      await db.runAsync(
        'INSERT INTO logs (id, goal_id, log_date, note, created_at, xp_awarded, bonus_xp, count) VALUES (?,?,?,?,?,?,?,?)',
        [log.id, log.goalId, log.logDate, log.note ?? null, log.createdAt, log.xpAwarded, 0, log.count]
      );

      // For past-day logs: skip grace day update and bonus event detection
      if (isPastDay) {
        set(s => ({ logs: [...s.logs, log] }));
        return { log, bonusXP: 0, events: [], coinsAwarded: 0, shardDropped: false, rankUp: false };
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

      if (!isZeroAward) {
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

        if (!isFirst && wasGap && get().comebackAwardedDate !== today) {
          events.push('comeback');
          bonusXP += BONUS_XP.comeback;
          set(s => ({ ...s, comebackAwardedDate: today }));
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
      }

      // Persist bonus XP back to the log row
      if (bonusXP > 0) {
        await db.runAsync('UPDATE logs SET bonus_xp = ? WHERE id = ?', [bonusXP, log.id]);
        log.bonusXp = bonusXP;
      }

      const hadAnyLogToday = get().logs.some(l => l.logDate === today);

      // Rank-up detection (before updating state so we have previous count)
      const prevCount = goalLogs.length;
      const newCount = prevCount + 1;
      const prevRankInfo = getGoalRank(prevCount);
      const newRankInfo = getGoalRank(newCount);
      const didRankUp = prevRankInfo.rank !== newRankInfo.rank;
      if (didRankUp) {
        events.push('rankUp');
      }

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

      // --- Coin award ---
      let coinsAwarded = 0;
      if (!isZeroAward && !useGameStore.getState().timeManipulated) {
        const streakTier = Math.max(
          0,
          STREAK_MULTIPLIERS.filter(m => newStreak >= m.minDay).length - 1,
        );
        let coinAmount = COIN_PER_LOG + streakTier * COIN_STREAK_TIER_BONUS;
        if (usePerkStore.getState().isEquipped('coin_magnet')) {
          coinAmount = Math.round(coinAmount * 1.5);
        }
        const coinDebuff = useRaidStore.getState().getActiveDebuff();
        const noCoins =
          coinDebuff?.type === 'no_coins' ||
          (coinDebuff?.type === 'all_half' && Math.random() > 0.5);
        if (!noCoins) {
          useCoinStore.getState().addCoins(coinAmount, 'log').catch(() => {});
          coinsAwarded = coinAmount;
        }
      }

      // --- Shard drop ---
      let shardDropped = false;
      if (!isZeroAward && !useGameStore.getState().timeManipulated) {
        if (Math.random() < SHARD_DROP_CHANCE) {
          useCraftingStore.getState().addShard(1).catch(() => {});
          events.push('shardDrop');
          shardDropped = true;
        }
      }

      // --- Raid damage ---
      if (!isZeroAward) {
        const raidState = useRaidStore.getState();
        if (raidState.isRaidActive() && !raidState.isBossDefeated()) {
          const difficultyBonus =
            { easy: 0, medium: 2, hard: 5, extreme: 10 }[goalData?.difficulty ?? 'medium'] ?? 2;
          const streakTierForDmg = Math.max(
            0,
            STREAK_MULTIPLIERS.filter(m => newStreak >= m.minDay).length - 1,
          );
          const damage = Math.round(10 + Math.max(0, streakTierForDmg - 1) * 5 + difficultyBonus);
          const applied = await raidState.applyDamage(damage);
          if (applied > 0) {
            const currentState = useRaidStore.getState();
            if (
              currentState.damageDealt >= (currentState.currentBoss?.maxHP ?? Infinity) &&
              !currentState.isBossDefeated()
            ) {
              await currentState.defeatBoss();
            }
          }
        }
      }

      return { log, bonusXP, events, coinsAwarded, shardDropped, rankUp: didRankUp };
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
