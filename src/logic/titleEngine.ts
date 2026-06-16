import type { TitleDefinition, GoalCategory, BossTier, GoalRank } from '../types';
import { TITLE_DEFINITIONS } from '../constants/titles';
import { getGoalRank } from '../utils/goalRank';

export interface TitleCheckParams {
  earnedTitleIds: string[];
  earnedBadgeIds: string[];
  maxCurrentStreak: number;           // highest current streak across all goals
  categoryLogCounts: Partial<Record<GoalCategory, number>>; // per-category log count
  completedQuestCount: number;
  defeatedBossIds: string[];          // 'defId:startDate'
  defeatedBossTiers: BossTier[];      // tier of each defeated boss
  hasCompletedSeason: boolean;
  maxGoalLogCount: number;            // highest log count for any single goal
  prestigeLevel: number;
  lifetimeCoins: number;
  luckyDropCount: number;
}

export function checkTitles(params: TitleCheckParams): TitleDefinition[] {
  const {
    earnedTitleIds,
    earnedBadgeIds,
    maxCurrentStreak,
    categoryLogCounts,
    completedQuestCount,
    defeatedBossIds,
    defeatedBossTiers,
    hasCompletedSeason,
    maxGoalLogCount,
    prestigeLevel,
    lifetimeCoins,
    luckyDropCount,
  } = params;

  return TITLE_DEFINITIONS.filter(title => {
    if (earnedTitleIds.includes(title.id)) return false;

    const cond = title.condition;
    switch (cond.type) {
      case 'streak':
        return maxCurrentStreak >= cond.min;
      case 'badge':
        return earnedBadgeIds.includes(cond.badgeId);
      case 'category_logs':
        return (categoryLogCounts[cond.category] ?? 0) >= cond.min;
      case 'quest_count':
        return completedQuestCount >= cond.min;
      case 'boss_defeat':
        if (cond.tier) {
          return defeatedBossTiers.includes(cond.tier);
        }
        return defeatedBossIds.length > 0;
      case 'season_complete':
        return hasCompletedSeason;
      case 'goal_rank': {
        const { rank } = getGoalRank(maxGoalLogCount);
        const rankOrder: GoalRank[] = ['novice', 'apprentice', 'journeyman', 'expert', 'master', 'legend'];
        return rankOrder.indexOf(rank) >= rankOrder.indexOf(cond.rank);
      }
      case 'prestige':
        return prestigeLevel >= 1;
      case 'lifetime_coins':
        return lifetimeCoins >= cond.min;
      case 'lucky_drop_count':
        return luckyDropCount >= cond.min;
      default:
        return false;
    }
  });
}
