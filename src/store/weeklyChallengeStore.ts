import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'weeklyChallenges_v1';

interface WeeklyChallengeStore {
  claimedIds: string[];
  load: () => Promise<void>;
  claimChallenge: (weekId: string, challengeId: string) => Promise<void>;
  hasClaimedChallenge: (weekId: string, challengeId: string) => boolean;
  hasClaimedAll: (weekId: string, challengeIds: string[]) => boolean;
}

export const useWeeklyChallengeStore = create<WeeklyChallengeStore>((set, get) => ({
  claimedIds: [],

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const claimedIds: string[] = raw ? JSON.parse(raw) : [];
      set({ claimedIds });
    } catch {
      set({ claimedIds: [] });
    }
  },

  claimChallenge: async (weekId, challengeId) => {
    const key = `${weekId}_${challengeId}`;
    const current = get().claimedIds;
    if (current.includes(key)) return;
    const updated = [...current, key];
    set({ claimedIds: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  },

  hasClaimedChallenge: (weekId, challengeId) => {
    return get().claimedIds.includes(`${weekId}_${challengeId}`);
  },

  hasClaimedAll: (weekId, challengeIds) => {
    const { claimedIds } = get();
    return challengeIds.every(id => claimedIds.includes(`${weekId}_${id}`));
  },
}));
