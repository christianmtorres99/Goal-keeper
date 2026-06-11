import type { Log } from '../types';

/** Single source of truth for summing XP — includes both streak XP and bonus XP. */
export function sumXP(logs: Log[]): number {
  return logs.reduce((s, l) => s + l.xpAwarded + l.bonusXp, 0);
}

/** Stat-tile display: abbreviate 10,000+ as "12.4k" so values fit on one line. */
export function formatStatValue(n: number): string {
  if (n >= 100000) return `${Math.round(n / 1000)}k`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}
