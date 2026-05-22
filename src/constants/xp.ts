export const BASE_XP = 15;

export const STREAK_MULTIPLIERS: { minDay: number; multiplier: number }[] = [
  { minDay: 365, multiplier: 8.0 },
  { minDay: 180, multiplier: 6.0 },
  { minDay: 90,  multiplier: 4.5 },
  { minDay: 60,  multiplier: 3.5 },
  { minDay: 30,  multiplier: 2.8 },
  { minDay: 21,  multiplier: 2.4 },
  { minDay: 14,  multiplier: 2.0 },
  { minDay: 7,   multiplier: 1.7 },
  { minDay: 3,   multiplier: 1.3 },
  { minDay: 1,   multiplier: 1.0 },
];

export const BONUS_XP = {
  firstLog:        50,
  perfectWeek:    100,
  perfectMonth:   400,
  comeback:        30,
  newPersonalBest: 25,
  cycleComplete:  200,
  earlyBird:       10,
  nightOwl:         5,
  loginBase:        5,
  loginPerStreak:   2,
  loginMax:        25,
  monthlyBonus:   150,
};

export const DIFFICULTY_MULTIPLIERS: Record<string, number> = {
  easy: 0.8,
  medium: 1.0,
  hard: 1.3,
  extreme: 1.7,
};

export const LUCKY_DROP_CHANCE = 0.15; // 15% chance
export const REBUILD_BONUS_DAYS = 7;
export const HOT_STREAK_MIN_DAYS = 3; // days of all goals logged to activate
export const TIME_BONUS_EARLY_BIRD = 10; // +10 XP before 9am
export const TIME_BONUS_NIGHT_OWL = 5;  // +5 XP after 10pm
export const MONTHLY_CHALLENGE_BONUS_XP = 150; // for hitting 150% of monthly target

export const LEVEL_BASE = 80;
export const LEVEL_EXPONENT = 1.65;
export const GRACE_DAY_REFILL_DAYS = 14;
export const GRACE_DAY_MIN_STREAK = 7;
