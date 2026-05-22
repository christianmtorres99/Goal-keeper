import type { Log } from '../types';

/** Single source of truth for summing XP — includes both streak XP and bonus XP. */
export function sumXP(logs: Log[]): number {
  return logs.reduce((s, l) => s + l.xpAwarded + l.bonusXp, 0);
}
