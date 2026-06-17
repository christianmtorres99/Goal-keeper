export type GoalType = 'habit' | 'milestone' | 'count' | 'quit';
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
  count: number;  // default 1 for habit/milestone, actual count for 'count' goals
  isRelapse?: boolean;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null;
  graceDayUsed: boolean;
  graceDayRefillDate: string | null;
}

export type BadgeCategory = 'streak' | 'logs' | 'level' | 'consistency' | 'cycle' | 'todos' | 'journal' | 'time';
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
  | 'streakRebuild'
  | 'rankUp'
  | 'relapsed';

// ── Weekly Challenges ─────────────────────────────────────────────────────────
export type WeeklyChallengeType =
  | 'log_days'
  | 'streak_reach'
  | 'log_total'
  | 'category_logs'
  | 'quit_checkin';

export interface WeeklyChallengeDefinition {
  id: string;
  type: WeeklyChallengeType;
  target: number;
  label: string;
  category?: GoalCategory;
}

// ── Goal Ranks ────────────────────────────────────────────────────────────────
export type GoalRank = 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master' | 'legend';

export interface GoalRankInfo {
  rank: GoalRank;
  label: string;
  logThreshold: number;       // logs needed to reach this rank
  nextThreshold: number | null; // null at legend
}

// ── Boss Raids ────────────────────────────────────────────────────────────────
export type BossTier = 'normal' | 'elite' | 'legendary';
export type DebuffType = 'xp_penalty' | 'no_lucky_drop' | 'quest_penalty' | 'no_coins' | 'streak_cap' | 'all_half';

export interface BossDefinition {
  id: string;
  tier: BossTier;
  name: string;
  icon: string;
  flavor: string;
  debuffType: DebuffType;
  debuffMag: number;
  debuffLabel: string;
}

export interface ActiveBoss {
  definitionId: string;
  maxHP: number;
  startDate: string;
  endDate: string;
}

export interface Debuff {
  type: DebuffType;
  magnitude: number;
  label: string;
  activeForDate: string;
}

// ── Seasonal Challenges ───────────────────────────────────────────────────────
export type ChallengeType =
  | 'total_logs_distinct'
  | 'streak_reach'
  | 'quest_count'
  | 'boss_defeat'
  | 'category_logs'
  | 'consecutive_days';

export interface SeasonChallenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  target: number;
  category?: GoalCategory;  // for category_logs type
  coinReward: number;
}

export interface SeasonDefinition {
  id: string;
  name: string;
  theme: string;
  accentColor: string;
  icon: string;
  startDate: string;
  endDate: string;
  challenges: SeasonChallenge[];
  completionBadgeId: string;
  completionCoinBonus: number;
}

// ── Perks ─────────────────────────────────────────────────────────────────────
export type PerkCategory = 'xp' | 'streak' | 'quest' | 'coins';

export interface PerkDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  category: PerkCategory;
}

// ── Titles ────────────────────────────────────────────────────────────────────
export type TitleEarnCondition =
  | { type: 'streak'; min: number }
  | { type: 'badge'; badgeId: string }
  | { type: 'category_logs'; category: GoalCategory; min: number }
  | { type: 'quest_count'; min: number }
  | { type: 'boss_defeat'; tier?: BossTier }
  | { type: 'season_complete' }
  | { type: 'goal_rank'; rank: GoalRank }
  | { type: 'prestige' }
  | { type: 'lifetime_coins'; min: number }
  | { type: 'lucky_drop_count'; min: number };

export interface TitleDefinition {
  id: string;
  label: string;
  condition: TitleEarnCondition;
  description: string;
}

// ── Crafting ──────────────────────────────────────────────────────────────────
export type ConsumableType = 'xp_surge' | 'lucky_boost' | 'coin_cache' | 'grace_refill' | 'quest_boost';

export interface Consumable {
  id: string;
  type: ConsumableType;
  craftedAt: string;
}

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

// ── Todos ─────────────────────────────────────────────────────────────────────
export interface SubItem {
  id: string;
  todoId: string;
  title: string;
  checked: boolean;
  sortOrder: number;
}

export interface Todo {
  id: string;
  title: string;
  dueDate?: string;   // YYYY-MM-DD
  dueTime?: string;   // HH:MM
  completed: boolean;
  completedAt?: string;
  xpReward: number;
  createdAt: string;
  sortOrder: number;
  subItems: SubItem[];
}

// ── Scheduled Tasks ──────────────────────────────────────────────────────────
export interface ScheduledTask {
  id: string;
  title: string;
  daysOfWeek: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
  icon: string;
  color: string;
  createdAt: string;
}

// ── Journal ───────────────────────────────────────────────────────────────────
export interface DrawingPath {
  d: string;
  color: string;
  strokeWidth: number;
}

export interface JournalEntry {
  id: string;
  entryDate: string;
  mood: number;     // 1-5
  energy: number;   // 1-5
  textContent: string;
  drawingData: DrawingPath[];
  createdAt: string;
  updatedAt: string;
}
