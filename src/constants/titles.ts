import type { TitleDefinition } from '../types';

export const TITLE_DEFINITIONS: TitleDefinition[] = [
  { id: 'consistent',   label: 'The Consistent',         description: 'Maintain a 7-day streak',           condition: { type: 'streak', min: 7 } },
  { id: 'relentless',   label: 'The Relentless',         description: 'Maintain a 30-day streak',          condition: { type: 'streak', min: 30 } },
  { id: 'dawn_chaser',  label: 'Dawn Chaser',            description: 'Earn the Early Bird badge',         condition: { type: 'badge', badgeId: 'early_bird' } },
  { id: 'night_owl',    label: 'Night Owl',              description: 'Earn the Night Owl badge',          condition: { type: 'badge', badgeId: 'night_owl' } },
  { id: 'scholar',      label: 'The Scholar',            description: 'Log a learning goal 25 times',     condition: { type: 'category_logs', category: 'learning', min: 25 } },
  { id: 'athlete',      label: 'The Athlete',            description: 'Log a physical goal 25 times',     condition: { type: 'category_logs', category: 'physical', min: 25 } },
  { id: 'artist',       label: 'The Artist',             description: 'Log a creative goal 25 times',     condition: { type: 'category_logs', category: 'creative', min: 25 } },
  { id: 'healer',       label: 'The Healer',             description: 'Log a wellness goal 25 times',     condition: { type: 'category_logs', category: 'wellness', min: 25 } },
  { id: 'perfectionist',label: 'The Perfectionist',      description: 'Earn the Perfect Week badge',      condition: { type: 'badge', badgeId: 'perfect_week' } },
  { id: 'month_master', label: 'Month Master',           description: 'Earn the Perfect Month badge',     condition: { type: 'badge', badgeId: 'perfect_month' } },
  { id: 'comeback_kid', label: 'Comeback Kid',           description: 'Earn the Phoenix badge',           condition: { type: 'badge', badgeId: 'comeback' } },
  { id: 'quest_runner', label: 'Quest Runner',           description: 'Complete 30 daily quests',         condition: { type: 'quest_count', min: 30 } },
  { id: 'raid_slayer',  label: 'Raid Slayer',            description: 'Defeat your first boss',           condition: { type: 'boss_defeat' } },
  { id: 'vanquisher',   label: 'Legendary Vanquisher',   description: 'Defeat a legendary boss',          condition: { type: 'boss_defeat', tier: 'legendary' } },
  { id: 'champion',     label: 'Seasonal Champion',      description: 'Complete all challenges in a season', condition: { type: 'season_complete' } },
  { id: 'journeyman_t', label: 'Journeyman',             description: 'Any goal reaches Journeyman rank', condition: { type: 'goal_rank', rank: 'journeyman' } },
  { id: 'legendary_t',  label: 'The Legendary',          description: 'Any goal reaches Legend rank',     condition: { type: 'goal_rank', rank: 'legend' } },
  { id: 'ascendant',    label: 'The Ascendant',          description: 'Complete your first prestige',     condition: { type: 'prestige' } },
  { id: 'coin_hoarder', label: 'Coin Hoarder',           description: 'Earn 1000 lifetime coins',         condition: { type: 'lifetime_coins', min: 1000 } },
  { id: 'lucky_streak', label: 'Lucky One',              description: 'Trigger Lucky Drop 10 times',      condition: { type: 'lucky_drop_count', min: 10 } },
];

export function getTitleDefinition(id: string): TitleDefinition | undefined {
  return TITLE_DEFINITIONS.find(t => t.id === id);
}
