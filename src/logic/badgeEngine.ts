import { BADGE_DEFINITIONS } from '../constants/badges';
import type { BadgeDefinition, EarnedBadge } from '../types';

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
}): BadgeDefinition[] {
  const {
    goalId, currentStreak, totalLogs, playerLevel, cycleCount = 0,
    earnedBadges, isFirstLog, isPerfectWeek, isPerfectMonth, isComeback, isNewBest,
  } = params;

  const earnedIds = new Set(
    earnedBadges
      .filter(b => b.goalId === goalId || b.goalId === null)
      .map(b => b.badgeId)
  );

  return BADGE_DEFINITIONS.filter(def => {
    if (earnedIds.has(def.id)) return false;

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
        return false;
      }
      default: return false;
    }
  });
}
