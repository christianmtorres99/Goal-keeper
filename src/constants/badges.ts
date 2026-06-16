import type { BadgeDefinition } from '../types';
import { Colors } from './theme';

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Streak badges
  { id: 'streak_1',   category: 'streak', rarity: 'common',    label: 'First Step',       description: 'Start your first streak',             icon: 'leaf',             threshold: 1 },
  { id: 'streak_3',   category: 'streak', rarity: 'common',    label: 'Getting Serious',  description: '3-day streak',                        icon: 'flame',            threshold: 3 },
  { id: 'streak_7',   category: 'streak', rarity: 'uncommon',  label: 'Week Warrior',     description: '7-day streak',                        icon: 'flash',            threshold: 7 },
  { id: 'streak_14',  category: 'streak', rarity: 'uncommon',  label: 'Two Week Titan',   description: '14-day streak',                       icon: 'fitness',          threshold: 14 },
  { id: 'streak_21',  category: 'streak', rarity: 'rare',      label: 'Habit Forged',     description: '21-day streak — the habit is real',   icon: 'body',             threshold: 21 },
  { id: 'streak_30',  category: 'streak', rarity: 'rare',      label: 'Month Master',     description: '30-day streak',                       icon: 'moon',             threshold: 30 },
  { id: 'streak_45',  category: 'streak', rarity: 'rare',      label: 'Unstoppable',      description: '45-day streak',                       icon: 'shield-checkmark', threshold: 45 },
  { id: 'streak_60',  category: 'streak', rarity: 'legendary', label: 'Iron Will',        description: '60-day streak',                       icon: 'shield',           threshold: 60 },
  { id: 'streak_90',  category: 'streak', rarity: 'legendary', label: 'Quarter Legend',   description: '90-day streak',                       icon: 'medal',            threshold: 90 },
  { id: 'streak_120', category: 'streak', rarity: 'legendary', label: 'Storm Chaser',     description: '120-day streak',                      icon: 'thunderstorm',     threshold: 120 },
  { id: 'streak_180', category: 'streak', rarity: 'legendary', label: 'Half Year Hero',   description: '180-day streak',                      icon: 'star',             threshold: 180 },
  { id: 'streak_240', category: 'streak', rarity: 'legendary', label: 'Eternal Flame',    description: '240-day streak',                      icon: 'infinite',         threshold: 240 },
  { id: 'streak_365', category: 'streak', rarity: 'legendary', label: 'Year God',         description: '365-day streak',                      icon: 'trophy',           threshold: 365 },

  // Log count badges
  { id: 'logs_1',   category: 'logs', rarity: 'common',    label: 'It Begins',         description: 'Log for the first time',   icon: 'play',             threshold: 1 },
  { id: 'logs_5',   category: 'logs', rarity: 'common',    label: 'Early Bird',        description: '5 total logs',             icon: 'sunny',            threshold: 5 },
  { id: 'logs_10',  category: 'logs', rarity: 'common',    label: 'Getting Started',   description: '10 total logs',            icon: 'checkmark-circle', threshold: 10 },
  { id: 'logs_25',  category: 'logs', rarity: 'uncommon',  label: 'Building Momentum', description: '25 total logs',            icon: 'trending-up',      threshold: 25 },
  { id: 'logs_50',  category: 'logs', rarity: 'uncommon',  label: 'Committed',         description: '50 total logs',            icon: 'ribbon',           threshold: 50 },
  { id: 'logs_100', category: 'logs', rarity: 'rare',      label: 'Dedicated',         description: '100 total logs',           icon: 'diamond',          threshold: 100 },
  { id: 'logs_250', category: 'logs', rarity: 'legendary', label: 'Relentless',        description: '250 total logs',           icon: 'infinite',         threshold: 250 },
  { id: 'logs_500', category: 'logs', rarity: 'legendary', label: 'Legendary',         description: '500 total logs',           icon: 'skull',            threshold: 500 },

  // Consistency badges
  { id: 'perfect_week',  category: 'consistency', rarity: 'uncommon',  label: 'Perfect Week',   description: 'Log every day for a week',          icon: 'calendar',        threshold: 1 },
  { id: 'perfect_month', category: 'consistency', rarity: 'rare',      label: 'Perfect Month',  description: 'Log every day of a calendar month', icon: 'calendar-number', threshold: 1 },
  { id: 'comeback',      category: 'consistency', rarity: 'common',    label: 'The Phoenix',    description: 'Come back after missing days',      icon: 'refresh-circle',  threshold: 1 },
  { id: 'new_best',      category: 'consistency', rarity: 'uncommon',  label: 'Record Breaker', description: 'Beat your personal best streak',    icon: 'podium',          threshold: 1 },

  // Cycle badges
  { id: 'cycle_1', category: 'cycle', rarity: 'common',   label: 'First Finish',    description: 'Complete a milestone goal',           icon: 'checkmark-done', threshold: 1 },
  { id: 'cycle_3', category: 'cycle', rarity: 'uncommon', label: 'Hat Trick',       description: 'Complete 3 cycles of a milestone',   icon: 'repeat',         threshold: 3 },
  { id: 'cycle_5', category: 'cycle', rarity: 'rare',     label: 'Serial Achiever', description: 'Complete 5 cycles of a milestone',   icon: 'rocket',         threshold: 5 },

  // Todo completion badges
  { id: 'todos_10',  category: 'todos', rarity: 'common',    label: 'Task Starter',  description: 'Complete 10 tasks',  icon: 'checkmark-circle-outline', threshold: 10 },
  { id: 'todos_50',  category: 'todos', rarity: 'uncommon',  label: 'Productive',    description: 'Complete 50 tasks',  icon: 'list-circle',              threshold: 50 },
  { id: 'todos_100', category: 'todos', rarity: 'rare',      label: 'Task Master',   description: 'Complete 100 tasks', icon: 'trophy',                   threshold: 100 },
  { id: 'todos_250', category: 'todos', rarity: 'legendary', label: 'Todo Legend',   description: 'Complete 250 tasks', icon: 'skull',                    threshold: 250 },

  // Journal streak badges
  { id: 'journal_3',  category: 'journal', rarity: 'common',   label: 'Reflective',    description: 'Journal 3 days in a row',  icon: 'book-outline',    threshold: 3 },
  { id: 'journal_7',  category: 'journal', rarity: 'uncommon', label: 'Soul Writer',   description: 'Journal 7 days in a row',  icon: 'journal-outline', threshold: 7 },
  { id: 'journal_30', category: 'journal', rarity: 'rare',     label: 'Inner Scholar', description: 'Journal 30 days in a row', icon: 'library-outline', threshold: 30 },

  // Time-of-day habit badges
  { id: 'early_bird', category: 'time', rarity: 'uncommon', label: 'Early Bird', description: 'Log a goal before 8am', icon: 'sunny-outline', threshold: 0 },
  { id: 'night_owl',  category: 'time', rarity: 'uncommon', label: 'Night Owl',  description: 'Log a goal after 10pm', icon: 'moon-outline',  threshold: 0 },

  // Level badges
  { id: 'level_1',  category: 'level', rarity: 'common',    label: 'Awakened',     description: 'Reach Level 1',  icon: 'sparkles',        threshold: 1 },
  { id: 'level_3',  category: 'level', rarity: 'common',    label: 'Rising',       description: 'Reach Level 3',  icon: 'arrow-up-circle', threshold: 3 },
  { id: 'level_5',  category: 'level', rarity: 'uncommon',  label: 'Established',  description: 'Reach Level 5',  icon: 'flag',            threshold: 5 },
  { id: 'level_7',  category: 'level', rarity: 'uncommon',  label: 'Driven',       description: 'Reach Level 7',  icon: 'rocket',          threshold: 7 },
  { id: 'level_10', category: 'level', rarity: 'rare',      label: 'Achiever',     description: 'Reach Level 10', icon: 'flash',           threshold: 10 },
  { id: 'level_15', category: 'level', rarity: 'rare',      label: 'Elite',        description: 'Reach Level 15', icon: 'prism',           threshold: 15 },
  { id: 'level_20', category: 'level', rarity: 'legendary', label: 'Master',       description: 'Reach Level 20', icon: 'planet',          threshold: 20 },
  { id: 'level_25', category: 'level', rarity: 'legendary', label: 'Grand Master', description: 'Reach Level 25', icon: 'thunderstorm',    threshold: 25 },
  { id: 'level_50', category: 'level', rarity: 'legendary', label: 'Immortal',     description: 'Reach Level 50', icon: 'infinite',        threshold: 50 },

  // Boss Raid badges
  { id: 'raid_normal_1',    category: 'consistency', rarity: 'uncommon',  label: 'First Blood',           description: 'Defeat your first boss',            icon: 'skull-outline',    threshold: 1 },
  { id: 'raid_elite_1',     category: 'consistency', rarity: 'rare',      label: 'Elite Slayer',          description: 'Defeat your first elite boss',      icon: 'skull',            threshold: 1 },
  { id: 'raid_legendary_1', category: 'consistency', rarity: 'legendary', label: 'Legendary Vanquisher',  description: 'Defeat your first legendary boss',  icon: 'trophy',           threshold: 1 },
  { id: 'raid_streak_3',    category: 'consistency', rarity: 'rare',      label: 'Raid Runner',           description: 'Defeat 3 raid bosses total',        icon: 'flame',            threshold: 3 },

  // Seasonal badges
  { id: 'season_winter_2026', category: 'consistency', rarity: 'legendary', label: 'Winter Warrior',   description: 'Complete all Winter 2026 challenges',  icon: 'snow-outline',          threshold: 1 },
  { id: 'season_spring_2026', category: 'consistency', rarity: 'legendary', label: 'Spring Surge',     description: 'Complete all Spring 2026 challenges',  icon: 'leaf-outline',          threshold: 1 },
  { id: 'season_summer_2026', category: 'consistency', rarity: 'legendary', label: 'Summer Grinder',   description: 'Complete all Summer 2026 challenges',  icon: 'sunny-outline',         threshold: 1 },
  { id: 'season_fall_2026',   category: 'consistency', rarity: 'legendary', label: 'Fall Finisher',    description: 'Complete all Fall 2026 challenges',    icon: 'partly-sunny-outline',  threshold: 1 },

  // Prestige badges
  { id: 'prestige_1', category: 'level', rarity: 'legendary', label: 'First Ascension', description: 'Complete your first prestige',  icon: 'star',          threshold: 1 },
  { id: 'prestige_2', category: 'level', rarity: 'legendary', label: 'Twice Reborn',    description: 'Complete your second prestige', icon: 'star-half',     threshold: 2 },
  { id: 'prestige_3', category: 'level', rarity: 'legendary', label: 'The Eternal',     description: 'Complete your third prestige',  icon: 'infinite',      threshold: 3 },
];

export const RARITY_COLORS: Record<string, string> = {
  common:    '#6E7689',
  uncommon:  '#1EAE5A',
  rare:      '#6460E8',
  legendary: '#E58E10',
};

export const RARITY_LABELS: Record<string, string> = {
  common:    'Common',
  uncommon:  'Uncommon',
  rare:      'Rare',
  legendary: 'Legendary',
};

export const RARITY_BG: Record<string, string> = {
  common:    'rgba(110,118,137,0.15)',
  uncommon:  'rgba(30,174,90,0.15)',
  rare:      'rgba(100,96,232,0.15)',
  legendary: 'rgba(229,142,16,0.15)',
};
