import type { BadgeDefinition } from '../types';

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Streak badges
  { id: 'streak_1', category: 'streak', label: 'First Step', description: 'Start your first streak', icon: 'leaf', threshold: 1 },
  { id: 'streak_3', category: 'streak', label: 'Getting Serious', description: '3-day streak', icon: 'flame', threshold: 3 },
  { id: 'streak_7', category: 'streak', label: 'Week Warrior', description: '7-day streak', icon: 'flash', threshold: 7 },
  { id: 'streak_14', category: 'streak', label: 'Two Week Titan', description: '14-day streak', icon: 'fitness', threshold: 14 },
  { id: 'streak_21', category: 'streak', label: 'Habit Forged', description: '21-day streak — the habit is real', icon: 'brain', threshold: 21 },
  { id: 'streak_30', category: 'streak', label: 'Month Master', description: '30-day streak', icon: 'moon', threshold: 30 },
  { id: 'streak_60', category: 'streak', label: 'Iron Will', description: '60-day streak', icon: 'shield', threshold: 60 },
  { id: 'streak_90', category: 'streak', label: 'Quarter Legend', description: '90-day streak', icon: 'medal', threshold: 90 },
  { id: 'streak_180', category: 'streak', label: 'Half Year Hero', description: '180-day streak', icon: 'star', threshold: 180 },
  { id: 'streak_365', category: 'streak', label: 'Year God', description: '365-day streak', icon: 'trophy', threshold: 365 },

  // Log count badges
  { id: 'logs_1', category: 'logs', label: 'It Begins', description: 'Log for the first time', icon: 'play', threshold: 1 },
  { id: 'logs_5', category: 'logs', label: 'Early Bird', description: '5 total logs', icon: 'sunny', threshold: 5 },
  { id: 'logs_10', category: 'logs', label: 'Getting Started', description: '10 total logs', icon: 'checkmark-circle', threshold: 10 },
  { id: 'logs_25', category: 'logs', label: 'Building Momentum', description: '25 total logs', icon: 'trending-up', threshold: 25 },
  { id: 'logs_50', category: 'logs', label: 'Committed', description: '50 total logs', icon: 'ribbon', threshold: 50 },
  { id: 'logs_100', category: 'logs', label: 'Dedicated', description: '100 total logs', icon: 'diamond', threshold: 100 },
  { id: 'logs_250', category: 'logs', label: 'Relentless', description: '250 total logs', icon: 'infinite', threshold: 250 },
  { id: 'logs_500', category: 'logs', label: 'Legendary', description: '500 total logs', icon: 'skull', threshold: 500 },

  // Consistency badges (global, no goalId)
  { id: 'perfect_week', category: 'consistency', label: 'Perfect Week', description: 'Log every day for a week', icon: 'calendar', threshold: 1 },
  { id: 'perfect_month', category: 'consistency', label: 'Perfect Month', description: 'Log every day of a calendar month', icon: 'calendar-number', threshold: 1 },
  { id: 'comeback', category: 'consistency', label: 'The Phoenix', description: 'Come back after missing days', icon: 'refresh-circle', threshold: 1 },
  { id: 'new_best', category: 'consistency', label: 'Record Breaker', description: 'Beat your personal best streak', icon: 'podium', threshold: 1 },

  // Level badges (global)
  { id: 'level_1', category: 'level', label: 'Awakened', description: 'Reach Level 1', icon: 'sparkles', threshold: 1 },
  { id: 'level_3', category: 'level', label: 'Rising', description: 'Reach Level 3', icon: 'arrow-up-circle', threshold: 3 },
  { id: 'level_5', category: 'level', label: 'Established', description: 'Reach Level 5', icon: 'flag', threshold: 5 },
  { id: 'level_7', category: 'level', label: 'Driven', description: 'Reach Level 7', icon: 'rocket', threshold: 7 },
  { id: 'level_10', category: 'level', label: 'Achiever', description: 'Reach Level 10', icon: 'flash-circle', threshold: 10 },
  { id: 'level_15', category: 'level', label: 'Elite', description: 'Reach Level 15', icon: 'prism', threshold: 15 },
  { id: 'level_20', category: 'level', label: 'Master', description: 'Reach Level 20', icon: 'planet', threshold: 20 },
  { id: 'level_25', category: 'level', label: 'Grand Master', description: 'Reach Level 25', icon: 'thunderstorm', threshold: 25 },
  { id: 'level_50', category: 'level', label: 'Immortal', description: 'Reach Level 50', icon: 'infinite', threshold: 50 },
];
