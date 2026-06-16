import type { GoalRankInfo, GoalRank } from '../types';

const RANK_THRESHOLDS: { rank: GoalRank; label: string; logThreshold: number }[] = [
  { rank: 'novice',      label: 'Novice',      logThreshold: 0 },
  { rank: 'apprentice',  label: 'Apprentice',  logThreshold: 10 },
  { rank: 'journeyman',  label: 'Journeyman',  logThreshold: 25 },
  { rank: 'expert',      label: 'Expert',      logThreshold: 50 },
  { rank: 'master',      label: 'Master',      logThreshold: 100 },
  { rank: 'legend',      label: 'Legend',      logThreshold: 200 },
];

export function getGoalRank(logCount: number): GoalRankInfo {
  let current = RANK_THRESHOLDS[0];
  for (const tier of RANK_THRESHOLDS) {
    if (logCount >= tier.logThreshold) {
      current = tier;
    } else {
      break;
    }
  }

  const currentIndex = RANK_THRESHOLDS.indexOf(current);
  const next = RANK_THRESHOLDS[currentIndex + 1] ?? null;

  return {
    rank: current.rank,
    label: current.label,
    logThreshold: current.logThreshold,
    nextThreshold: next?.logThreshold ?? null,
  };
}

export function rankUpThreshold(rank: GoalRank): number | null {
  const found = RANK_THRESHOLDS.find(r => r.rank === rank);
  return found ? found.logThreshold : null;
}

export const RANK_THRESHOLDS_LIST = RANK_THRESHOLDS;
