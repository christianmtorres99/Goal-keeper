import { BASE_XP, LEVEL_BASE, LEVEL_EXPONENT, STREAK_MULTIPLIERS, TIER_DEFS } from '../constants/xp';
import type { TierDef } from '../constants/xp';

export function getStreakMultiplier(streak: number): number {
  for (const { minDay, multiplier } of STREAK_MULTIPLIERS) {
    if (streak >= minDay) return multiplier;
  }
  return 1.0;
}

export function calculateXPForLog(streak: number): number {
  return Math.round(BASE_XP * getStreakMultiplier(streak));
}

export function xpThresholdForLevel(level: number): number {
  if (level === 0) return 0;
  return Math.round(LEVEL_BASE * Math.pow(level, LEVEL_EXPONENT));
}

export function getLevelFromXP(totalXP: number): number {
  let level = 0;
  while (xpThresholdForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

export function getTierForLevel(level: number): TierDef {
  return (
    TIER_DEFS.find(t => level >= t.minLevel && level <= t.maxLevel) ??
    TIER_DEFS[TIER_DEFS.length - 1]
  );
}

export function getPlayerStats(totalXP: number) {
  const level = getLevelFromXP(totalXP);
  const xpAtCurrentLevel = xpThresholdForLevel(level);
  const xpAtNextLevel = xpThresholdForLevel(level + 1);
  const xpIntoLevel = totalXP - xpAtCurrentLevel;
  const xpForNextLevel = xpAtNextLevel - xpAtCurrentLevel;
  return {
    totalXP,
    level,
    xpIntoLevel,
    xpForNextLevel,
    progressPercent: xpForNextLevel > 0 ? xpIntoLevel / xpForNextLevel : 0,
  };
}
