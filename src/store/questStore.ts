import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayString } from '../utils/dateUtils';
import type { Quest } from '../types';

const KEY = 'dailyQuests_v1';

interface QuestStore {
  quests: Quest[];
  questsDate: string | null;

  loadOrGenerate: (activeGoalIds: string[], activeGoalNames: string[]) => Promise<void>;
  markProgress: (type: Quest['type'], goalId?: string) => void; // updates progress
  markAllGoals: (uniqueCount: number) => void;
  complete: (questId: string) => { xp: number } | null; // returns XP if newly completed
  getTotalAvailableXP: () => number;
  getTotalEarnedXP: () => number;
}

function generateQuests(goalIds: string[], goalNames: string[]): Quest[] {
  const today = todayString();
  const seed = parseInt(today.replace(/-/g, ''), 10);
  const quests: Quest[] = [];

  // Always include "log any goal"
  quests.push({
    id: 'q_log_any',
    type: 'log_any',
    description: 'Log any goal today',
    xpReward: 20,
    progress: 0,
    target: 1,
    completed: false,
  });

  if (goalIds.length >= 2) {
    // Pick a specific goal based on date seed
    const idx = seed % goalIds.length;
    quests.push({
      id: 'q_log_specific',
      type: 'log_specific',
      description: `Log "${goalNames[idx]}" today`,
      xpReward: 25,
      progress: 0,
      target: 1,
      completed: false,
      goalId: goalIds[idx],
      goalName: goalNames[idx],
    });
  }

  if (goalIds.length >= 1) {
    // Rotate between different third quests based on date
    const variant = seed % 4;
    if (variant === 0) {
      quests.push({ id: 'q_use_note', type: 'use_note', description: 'Add a note to any log', xpReward: 20, progress: 0, target: 1, completed: false });
    } else if (variant === 1) {
      quests.push({ id: 'q_early_log', type: 'early_log', description: 'Log any goal before 10am', xpReward: 30, progress: 0, target: 1, completed: false });
    } else if (variant === 2) {
      quests.push({ id: 'q_log_count', type: 'log_count', description: 'Log any goal 3 times today', xpReward: 35, progress: 0, target: 3, completed: false });
    } else {
      quests.push({ id: 'q_log_all', type: 'log_all', description: `Log all ${goalIds.length} goals today`, xpReward: 50, progress: 0, target: Math.max(goalIds.length, 2), completed: false });
    }
  }

  return quests;
}

export const useQuestStore = create<QuestStore>((set, get) => ({
  quests: [],
  questsDate: null,

  loadOrGenerate: async (goalIds, goalNames) => {
    const today = todayString();
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.date === today) {
          set({ quests: saved.quests, questsDate: today });
          return;
        }
      }
    } catch {}
    const newQuests = generateQuests(goalIds, goalNames);
    set({ quests: newQuests, questsDate: today });
    try { await AsyncStorage.setItem(KEY, JSON.stringify({ date: today, quests: newQuests })); } catch {}
  },

  markProgress: (type, goalId) => {
    set(s => {
      const updated = s.quests.map(q => {
        if (q.completed) return q;
        let matches = false;
        if (q.type === type) matches = true;
        if (q.type === 'log_specific' && goalId && q.goalId === goalId) matches = true;
        // log_any matches any log event
        if (q.type === 'log_any' && (type === 'log_any' || type === 'log_specific' || type === 'log_count' || type === 'log_all')) matches = true;
        // log_count increments on any log; log_all is handled separately via markAllGoals
        if (q.type === 'log_count' && (type === 'log_any' || type === 'log_specific' || type === 'log_count')) matches = true;
        if (!matches) return q;
        const newProgress = Math.min(q.progress + 1, q.target);
        return { ...q, progress: newProgress };
      });
      // Save async
      const today = todayString();
      AsyncStorage.setItem(KEY, JSON.stringify({ date: today, quests: updated })).catch(() => {});
      return { quests: updated };
    });
  },

  markAllGoals: (uniqueCount: number) => {
    set(s => {
      const updated = s.quests.map(q => {
        if (q.completed || q.type !== 'log_all') return q;
        return { ...q, progress: Math.min(uniqueCount, q.target) };
      });
      const today = todayString();
      AsyncStorage.setItem(KEY, JSON.stringify({ date: today, quests: updated })).catch(() => {});
      return { quests: updated };
    });
  },

  complete: (questId) => {
    const quest = get().quests.find(q => q.id === questId);
    if (!quest || quest.completed || quest.progress < quest.target) return null;
    set(s => {
      const updated = s.quests.map(q => q.id === questId ? { ...q, completed: true } : q);
      const today = todayString();
      AsyncStorage.setItem(KEY, JSON.stringify({ date: today, quests: updated })).catch(() => {});
      return { quests: updated };
    });
    return { xp: quest.xpReward };
  },

  getTotalAvailableXP: () => get().quests.reduce((s, q) => s + q.xpReward, 0),
  getTotalEarnedXP: () => get().quests.filter(q => q.completed).reduce((s, q) => s + q.xpReward, 0),
}));
