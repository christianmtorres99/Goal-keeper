import type { JournalEntry } from '../types';
import { todayString, addDays } from './dateUtils';

export type SuggestionTrigger = 'low_energy' | 'low_mood' | 'mixed_fatigue';

export interface MoodSuggestion {
  id: string;
  trigger: SuggestionTrigger;
  message: string;
  severity: 'medium' | 'high';
}

export function detectMoodSuggestion(entries: JournalEntry[]): MoodSuggestion | null {
  const today = todayString();
  // Get last 7 days entries sorted descending
  const recent = entries
    .filter(e => e.entryDate <= today && e.entryDate >= addDays(today, -6))
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate));

  if (recent.length === 0) return null;

  // Check consecutive low energy (3+ days, energy ≤ 2)
  let consecutiveLowEnergy = 0;
  for (const e of recent) {
    if (e.energy <= 2) consecutiveLowEnergy++;
    else break;
  }
  if (consecutiveLowEnergy >= 3) {
    return {
      id: `low_energy_${today}`,
      trigger: 'low_energy',
      message: `You've logged low energy for ${consecutiveLowEnergy} days in a row. Consider a lighter session or rest today.`,
      severity: 'medium',
    };
  }

  // Check consecutive low mood (3+ days, mood ≤ 2)
  let consecutiveLowMood = 0;
  for (const e of recent) {
    if (e.mood <= 2) consecutiveLowMood++;
    else break;
  }
  if (consecutiveLowMood >= 3) {
    return {
      id: `low_mood_${today}`,
      trigger: 'low_mood',
      message: `You've been feeling low for ${consecutiveLowMood} days. Be gentle with yourself — progress still counts.`,
      severity: consecutiveLowMood >= 4 ? 'high' : 'medium',
    };
  }

  // Check mixed fatigue: avg mood + energy < 4 over 4+ days
  if (recent.length >= 4) {
    const last4 = recent.slice(0, 4);
    const avgSum = last4.reduce((s, e) => s + e.mood + e.energy, 0) / last4.length;
    if (avgSum < 4) {
      return {
        id: `mixed_fatigue_${today}`,
        trigger: 'mixed_fatigue',
        message: `Your mood and energy have been below average lately. A rest day might help you recharge.`,
        severity: 'medium',
      };
    }
  }

  return null;
}
