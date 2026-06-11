import type { Goal, GoalCategory, Log, PlayerStats } from '../types';
import { getPlayerStats } from '../logic/xpEngine';
import { sumXP } from './xpUtils';

export function getCategoryDisplayLabel(goals: Goal[], category: GoalCategory): string {
  if (category === 'other') {
    const customLabel = goals.find(g => g.category === 'other' && g.customCategoryLabel)?.customCategoryLabel;
    if (customLabel) return customLabel;
  }
  return CATEGORY_LABELS[category];
}

export const CATEGORY_LABELS: Record<GoalCategory, string> = {
  creative: 'Creative',
  physical: 'Physical',
  learning: 'Learning',
  wellness: 'Wellness',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<GoalCategory, string> = {
  creative: 'brush',
  physical: 'barbell',
  learning: 'book',
  wellness: 'heart',
  other: 'grid',
};

export interface CustomTrack {
  label: string;
  goals: Goal[];
}

/**
 * Groups active 'other'-category goals into named skill tracks by customCategoryLabel.
 * Goals without a label fall into a generic 'Other' track. Label matching is
 * case-insensitive; the first-seen casing is used for display.
 */
export function getCustomTracks(goals: Goal[]): CustomTrack[] {
  const tracks: CustomTrack[] = [];
  const byKey = new Map<string, CustomTrack>();
  goals.filter(g => !g.isArchived && g.category === 'other').forEach(g => {
    const label = g.customCategoryLabel?.trim() || 'Other';
    const key = label.toLowerCase();
    let track = byKey.get(key);
    if (!track) {
      track = { label, goals: [] };
      byKey.set(key, track);
      tracks.push(track);
    }
    track.goals.push(g);
  });
  return tracks;
}

export function getCategoryStats(
  goals: Goal[],
  logs: Log[]
): Partial<Record<GoalCategory, { stats: PlayerStats; goalCount: number }>> {
  const result: Partial<Record<GoalCategory, { stats: PlayerStats; goalCount: number }>> = {};

  const categories = [...new Set(goals.filter(g => !g.isArchived && g.category !== 'other').map(g => g.category))];

  for (const cat of categories) {
    const catGoalIds = new Set(goals.filter(g => g.category === cat && !g.isArchived).map(g => g.id));
    const catLogs = logs.filter(l => catGoalIds.has(l.goalId));
    const totalXP = sumXP(catLogs);
    result[cat] = {
      stats: getPlayerStats(totalXP),
      goalCount: catGoalIds.size,
    };
  }

  return result;
}
