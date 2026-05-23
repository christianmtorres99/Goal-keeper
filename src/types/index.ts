export type GoalType = 'habit' | 'milestone';
export type GoalCategory = 'creative' | 'physical' | 'learning' | 'wellness' | 'other';
export type GoalDifficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export interface Goal {
  id: string;
  name: string;
  description: string;
  type: GoalType;
  color: string;
  icon: string;
  createdAt: string;
  isArchived: boolean;
  targetCount?: number;
  unit?: string;
  sortOrder: number;
  category: GoalCategory;
  notificationTime?: string;   // "HH:MM"
  notificationId?: string;
  completedAt?: string;
  cycleCount: number;
  allowMultiplePerDay?: boolean;
  difficulty: GoalDifficulty;
  customCategoryLabel?: string;
}

export interface Log {
  id: string;
  goalId: string;
  logDate: string;
  note?: string;
  createdAt: string;
  xpAwarded: number;
  bonusXp: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null;
  graceDayUsed: boolean;
  graceDayRefillDate: string | null;
}

export type BadgeCategory = 'streak' | 'logs' | 'level' | 'consistency' | 'cycle';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface BadgeDefinition {
  id: string;
  category: BadgeCategory;
  label: string;
  description: string;
  icon: string;
  threshold: number;
  rarity: BadgeRarity;
}

export interface EarnedBadge {
  id: string;
  badgeId: string;
  goalId: string | null;
  earnedAt: string;
}

export interface DayActivity {
  date: string;
  goalIds: string[];
}

export interface PlayerStats {
  totalXP: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

export type LogEvent =
  | 'firstLog'
  | 'perfectWeek'
  | 'perfectMonth'
  | 'comeback'
  | 'newBest'
  | 'luckyDrop'
  | 'earlyBird'
  | 'nightOwl'
  | 'hotStreak'
  | 'dailyDouble'
  | 'streakRebuild';

export interface Quest {
  id: string;
  type: 'log_any' | 'log_all' | 'use_note' | 'early_log' | 'log_specific' | 'log_count';
  description: string;
  xpReward: number;
  progress: number;
  target: number;
  completed: boolean;
  goalId?: string; // if quest targets a specific goal
  goalName?: string;
}
