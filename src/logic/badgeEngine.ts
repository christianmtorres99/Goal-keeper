import { BADGE_DEFINITIONS } from '../constants/badges';
import type { BadgeDefinition, EarnedBadge } from '../types';

const GLOBAL_BADGE_IDS = new Set(['streak_1']);

export function checkBadges(params: {
  goalId: string;
  currentStreak: number;
  totalLogs: number;
  playerLevel: number;
  cycleCount?: number;
  earnedBadges: EarnedBadge[];
  isFirstLog?: boolean;
  isPerfectWeek?: boolean;
  isPerfectMonth?: boolean;
  isComeback?: boolean;
  isNewBest?: boolean;
  totalTodosCompleted?: number;
  journalStreak?: number;
  logHour?: number;
  quitGoalMaxStreak?: number;
}): BadgeDefinition[] {
  const {
    goalId, currentStreak, totalLogs, playerLevel, cycleCount = 0,
    earnedBadges, isFirstLog, isPerfectWeek, isPerfectMonth, isComeback, isNewBest,
  } = params;

  // Global badges (logs, level, consistency) are earned once across all goals.
  // Per-goal badges (streak, cycle) check only this goal's earned set.
  const globalEarnedIds = new Set(earnedBadges.map(b => b.badgeId));
  const perGoalEarnedIds = new Set(
    earnedBadges.filter(b => b.goalId === goalId || b.goalId === null).map(b => b.badgeId)
  );

  return BADGE_DEFINITIONS.filter(def => {
    // Global categories use the full earned set (once per account)
    const isGlobal = def.category === 'logs' || def.category === 'level'
      || def.category === 'consistency' || def.category === 'todos'
      || def.category === 'journal' || def.category === 'time'
      || GLOBAL_BADGE_IDS.has(def.id);
    if (isGlobal ? globalEarnedIds.has(def.id) : perGoalEarnedIds.has(def.id)) return false;

    switch (def.category) {
      case 'streak':      return currentStreak >= def.threshold;
      case 'logs':        return totalLogs >= def.threshold;
      case 'level':       return playerLevel >= def.threshold;
      case 'cycle':       return cycleCount >= def.threshold;
      case 'consistency': {
        if (def.id === 'perfect_week')  return !!isPerfectWeek;
        if (def.id === 'perfect_month') return !!isPerfectMonth;
        if (def.id === 'comeback')      return !!isComeback;
        if (def.id === 'new_best')      return !!isNewBest;
        // Quit goal badges use quitGoalMaxStreak
        if (def.id === 'quit_first_day')   return (params.quitGoalMaxStreak ?? 0) >= 1;
        if (def.id === 'quit_week_clean')  return (params.quitGoalMaxStreak ?? 0) >= 7;
        if (def.id === 'quit_month_clean') return (params.quitGoalMaxStreak ?? 0) >= 30;
        return false;
      }
      case 'todos':
        return (params.totalTodosCompleted ?? 0) >= def.threshold;
      case 'journal':
        return (params.journalStreak ?? 0) >= def.threshold;
      case 'time': {
        const h = params.logHour ?? -1;
        if (def.id === 'early_bird') return h >= 0 && h < 8;
        if (def.id === 'night_owl')  return h >= 22;
        return false;
      }
      default: return false;
    }
  });
}
