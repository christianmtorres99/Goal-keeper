import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayString, daysBetween } from '../utils/dateUtils';
import { BONUS_XP, HOT_STREAK_MIN_DAYS, REBUILD_BONUS_DAYS } from '../constants/xp';

const KEY = 'gameStore_v1';

interface PersonalRecords {
  bestWeekXP: number;
  bestMonthXP: number;
  longestStreak: number;
  mostLogsInDay: number;
}

interface GameStore {
  // Login bonus
  loginStreak: number;
  lastLoginDate: string | null;
  pendingLoginXP: number; // >0 = not yet shown to user

  // XP streak (consecutive days earning any XP)
  xpStreak: number;
  lastXpDate: string | null;

  // Hot streak (consecutive days all goals logged)
  hotStreakDays: number;
  lastPerfectDate: string | null;

  // Daily double
  dailyDoubleGoalId: string | null;
  dailyDoubleDate: string | null;

  // Streak rebuild (per goal, maps goalId -> rebuild start date)
  rebuildGoals: Record<string, string>;

  // Personal records
  personalRecords: PersonalRecords;

  // Prestige
  prestigeLevel: number;

  // Actions
  load: () => Promise<void>;
  checkAndClaimLoginBonus: () => number; // returns XP to award (0 if already claimed)
  markLoginClaimed: () => Promise<void>;
  onXpEarned: () => Promise<void>; // call after any log; updates xpStreak
  checkHotStreak: (allGoalsLoggedToday: boolean) => Promise<boolean>; // returns true if hot streak active
  refreshDailyDouble: (goalIds: string[]) => Promise<string | null>;
  startRebuild: (goalId: string) => Promise<void>;
  endRebuild: (goalId: string) => Promise<void>;
  isInRebuild: (goalId: string) => boolean;
  getRebuildDay: (goalId: string) => number; // 1-7 if in rebuild, 0 otherwise
  updatePersonalRecords: (weekXP: number, monthXP: number, streak: number, dayLogs: number) => Promise<void>;
  prestige: () => Promise<void>;
}

const DEFAULT_STATE = {
  loginStreak: 0 as number,
  lastLoginDate: null as string | null,
  pendingLoginXP: 0 as number,
  xpStreak: 0 as number,
  lastXpDate: null as string | null,
  hotStreakDays: 0 as number,
  lastPerfectDate: null as string | null,
  dailyDoubleGoalId: null as string | null,
  dailyDoubleDate: null as string | null,
  rebuildGoals: {} as Record<string, string>,
  personalRecords: { bestWeekXP: 0, bestMonthXP: 0, longestStreak: 0, mostLogsInDay: 0 } as PersonalRecords,
  prestigeLevel: 0 as number,
};

async function persist(partial: Record<string, unknown>) {
  const current = await AsyncStorage.getItem(KEY);
  const prev = current ? JSON.parse(current) : DEFAULT_STATE;
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...prev, ...partial }));
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...DEFAULT_STATE,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({ ...DEFAULT_STATE, ...data });
      }
    } catch {}
  },

  checkAndClaimLoginBonus: () => {
    const { lastLoginDate, loginStreak } = get();
    const today = todayString();
    if (lastLoginDate === today) return 0; // already claimed
    const xp = Math.min(BONUS_XP.loginBase + loginStreak * BONUS_XP.loginPerStreak, BONUS_XP.loginMax);
    return xp;
  },

  markLoginClaimed: async () => {
    const { lastLoginDate, loginStreak } = get();
    const today = todayString();
    if (lastLoginDate === today) return;
    const yesterday = lastLoginDate ? daysBetween(lastLoginDate, today) : 99;
    const newStreak = yesterday === 1 ? loginStreak + 1 : 1;
    const xp = Math.min(BONUS_XP.loginBase + loginStreak * BONUS_XP.loginPerStreak, BONUS_XP.loginMax);
    set({ loginStreak: newStreak, lastLoginDate: today, pendingLoginXP: xp });
    await persist({ loginStreak: newStreak, lastLoginDate: today, pendingLoginXP: xp });
  },

  onXpEarned: async () => {
    const { lastXpDate, xpStreak } = get();
    const today = todayString();
    if (lastXpDate === today) return;
    const gap = lastXpDate ? daysBetween(lastXpDate, today) : 99;
    const newStreak = gap === 1 ? xpStreak + 1 : 1;
    set({ xpStreak: newStreak, lastXpDate: today });
    await persist({ xpStreak: newStreak, lastXpDate: today });
  },

  checkHotStreak: async (allGoalsLoggedToday: boolean) => {
    const { lastPerfectDate, hotStreakDays } = get();
    const today = todayString();
    if (!allGoalsLoggedToday) {
      if (lastPerfectDate === today) return hotStreakDays >= HOT_STREAK_MIN_DAYS; // already perfect today
      return false;
    }
    if (lastPerfectDate === today) return hotStreakDays >= HOT_STREAK_MIN_DAYS; // don't double-count
    const gap = lastPerfectDate ? daysBetween(lastPerfectDate, today) : 99;
    const newDays = gap === 1 ? hotStreakDays + 1 : 1;
    set({ hotStreakDays: newDays, lastPerfectDate: today });
    await persist({ hotStreakDays: newDays, lastPerfectDate: today });
    return newDays >= HOT_STREAK_MIN_DAYS;
  },

  refreshDailyDouble: async (goalIds: string[]) => {
    const { dailyDoubleDate, dailyDoubleGoalId } = get();
    const today = todayString();
    if (dailyDoubleDate === today && dailyDoubleGoalId) return dailyDoubleGoalId;
    if (goalIds.length === 0) return null;
    // Pick based on date seed so it's consistent throughout the day
    const seed = parseInt(today.replace(/-/g, ''), 10);
    const idx = seed % goalIds.length;
    const goalId = goalIds[idx];
    set({ dailyDoubleGoalId: goalId, dailyDoubleDate: today });
    await persist({ dailyDoubleGoalId: goalId, dailyDoubleDate: today });
    return goalId;
  },

  startRebuild: async (goalId: string) => {
    const today = todayString();
    const { rebuildGoals } = get();
    if (rebuildGoals[goalId]) return; // already in rebuild
    const updated = { ...rebuildGoals, [goalId]: today };
    set({ rebuildGoals: updated });
    await persist({ rebuildGoals: updated });
  },

  endRebuild: async (goalId: string) => {
    const { rebuildGoals } = get();
    const updated = { ...rebuildGoals };
    delete updated[goalId];
    set({ rebuildGoals: updated });
    await persist({ rebuildGoals: updated });
  },

  isInRebuild: (goalId: string) => {
    const { rebuildGoals } = get();
    if (!rebuildGoals[goalId]) return false;
    const today = todayString();
    const days = daysBetween(rebuildGoals[goalId], today) + 1;
    return days <= REBUILD_BONUS_DAYS;
  },

  getRebuildDay: (goalId: string) => {
    const { rebuildGoals } = get();
    if (!rebuildGoals[goalId]) return 0;
    const today = todayString();
    const days = daysBetween(rebuildGoals[goalId], today) + 1;
    if (days > REBUILD_BONUS_DAYS) return 0;
    return days;
  },

  updatePersonalRecords: async (weekXP, monthXP, streak, dayLogs) => {
    const { personalRecords } = get();
    const updated = {
      bestWeekXP: Math.max(personalRecords.bestWeekXP, weekXP),
      bestMonthXP: Math.max(personalRecords.bestMonthXP, monthXP),
      longestStreak: Math.max(personalRecords.longestStreak, streak),
      mostLogsInDay: Math.max(personalRecords.mostLogsInDay, dayLogs),
    };
    set({ personalRecords: updated });
    await persist({ personalRecords: updated });
  },

  prestige: async () => {
    const { prestigeLevel } = get();
    const newLevel = prestigeLevel + 1;
    set({ prestigeLevel: newLevel });
    await persist({ prestigeLevel: newLevel });
  },
}));
