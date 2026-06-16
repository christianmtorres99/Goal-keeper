import type { SeasonDefinition } from '../types';

export const SEASON_DEFINITIONS: SeasonDefinition[] = [
  {
    id: 'winter_2026',
    name: 'Winter 2026',
    theme: 'frost',
    accentColor: '#7EB8F7',
    icon: 'snow-outline',
    startDate: '2025-12-01',
    endDate: '2026-02-28',
    completionBadgeId: 'season_winter_2026',
    completionCoinBonus: 100,
    challenges: [
      { id: 'w26_c1', title: 'Frost Walker', description: 'Log any goal on 14 distinct days this season', type: 'total_logs_distinct', target: 14, coinReward: 30 },
      { id: 'w26_c2', title: 'Ice Streak', description: 'Reach a 7-day streak on any goal', type: 'streak_reach', target: 7, coinReward: 30 },
      { id: 'w26_c3', title: 'Quest Keeper', description: 'Complete 10 daily quests this season', type: 'quest_count', target: 10, coinReward: 30 },
      { id: 'w26_c4', title: 'Boss Slayer', description: 'Defeat any raid boss this season', type: 'boss_defeat', target: 1, coinReward: 30 },
      { id: 'w26_c5', title: 'Winter Warrior', description: 'Log a physical goal 10 times', type: 'category_logs', target: 10, category: 'physical', coinReward: 30 },
      { id: 'w26_c6', title: 'Cold Streak', description: 'Log any goal every day for 7 consecutive days', type: 'consecutive_days', target: 7, coinReward: 30 },
    ],
  },
  {
    id: 'spring_2026',
    name: 'Spring 2026',
    theme: 'bloom',
    accentColor: '#6FCF97',
    icon: 'leaf-outline',
    startDate: '2026-03-01',
    endDate: '2026-05-31',
    completionBadgeId: 'season_spring_2026',
    completionCoinBonus: 100,
    challenges: [
      { id: 'sp26_c1', title: 'New Growth', description: 'Log any goal on 20 distinct days this season', type: 'total_logs_distinct', target: 20, coinReward: 30 },
      { id: 'sp26_c2', title: 'Spring Surge', description: 'Reach a 14-day streak on any goal', type: 'streak_reach', target: 14, coinReward: 30 },
      { id: 'sp26_c3', title: 'Quest Bloom', description: 'Complete 20 daily quests this season', type: 'quest_count', target: 20, coinReward: 30 },
      { id: 'sp26_c4', title: 'Raid Season', description: 'Defeat 2 raid bosses this season', type: 'boss_defeat', target: 2, coinReward: 30 },
      { id: 'sp26_c5', title: 'Inner Garden', description: 'Log a wellness goal 15 times', type: 'category_logs', target: 15, category: 'wellness', coinReward: 30 },
      { id: 'sp26_c6', title: 'Spring Streak', description: 'Log any goal every day for 14 consecutive days', type: 'consecutive_days', target: 14, coinReward: 30 },
    ],
  },
  {
    id: 'summer_2026',
    name: 'Summer 2026',
    theme: 'heat',
    accentColor: '#F2994A',
    icon: 'sunny-outline',
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    completionBadgeId: 'season_summer_2026',
    completionCoinBonus: 100,
    challenges: [
      { id: 'su26_c1', title: 'Heat Wave', description: 'Log any goal on 25 distinct days this season', type: 'total_logs_distinct', target: 25, coinReward: 30 },
      { id: 'su26_c2', title: 'Summer Grind', description: 'Reach a 21-day streak on any goal', type: 'streak_reach', target: 21, coinReward: 30 },
      { id: 'su26_c3', title: 'Quest Surge', description: 'Complete 30 daily quests this season', type: 'quest_count', target: 30, coinReward: 30 },
      { id: 'su26_c4', title: 'Boss Hunter', description: 'Defeat 3 raid bosses this season', type: 'boss_defeat', target: 3, coinReward: 30 },
      { id: 'su26_c5', title: 'Creative Fire', description: 'Log a creative goal 20 times', type: 'category_logs', target: 20, category: 'creative', coinReward: 30 },
      { id: 'su26_c6', title: 'Scorched Earth', description: 'Log any goal every day for 21 consecutive days', type: 'consecutive_days', target: 21, coinReward: 30 },
    ],
  },
  {
    id: 'fall_2026',
    name: 'Fall 2026',
    theme: 'harvest',
    accentColor: '#EB9C2D',
    icon: 'partly-sunny-outline',
    startDate: '2026-09-01',
    endDate: '2026-11-30',
    completionBadgeId: 'season_fall_2026',
    completionCoinBonus: 100,
    challenges: [
      { id: 'fa26_c1', title: 'Harvest Run', description: 'Log any goal on 30 distinct days this season', type: 'total_logs_distinct', target: 30, coinReward: 30 },
      { id: 'fa26_c2', title: 'Fall Streak', description: 'Reach a 30-day streak on any goal', type: 'streak_reach', target: 30, coinReward: 30 },
      { id: 'fa26_c3', title: 'Quest Harvest', description: 'Complete 40 daily quests this season', type: 'quest_count', target: 40, coinReward: 30 },
      { id: 'fa26_c4', title: 'Boss Reaper', description: 'Defeat 4 raid bosses this season', type: 'boss_defeat', target: 4, coinReward: 30 },
      { id: 'fa26_c5', title: 'Scholar\'s Harvest', description: 'Log a learning goal 25 times', type: 'category_logs', target: 25, category: 'learning', coinReward: 30 },
      { id: 'fa26_c6', title: 'Golden Month', description: 'Log any goal every day for 30 consecutive days', type: 'consecutive_days', target: 30, coinReward: 30 },
    ],
  },
];

export function getCurrentSeason(dateStr: string): SeasonDefinition | null {
  return SEASON_DEFINITIONS.find(s => dateStr >= s.startDate && dateStr <= s.endDate) ?? null;
}

export function getPastSeasons(dateStr: string): SeasonDefinition[] {
  return SEASON_DEFINITIONS.filter(s => dateStr > s.endDate);
}
