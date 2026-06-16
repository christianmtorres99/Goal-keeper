import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'seasonStore_v1';

interface SeasonStore {
  completedChallengeIds: string[];
  claimedSeasonIds: string[];

  load: () => Promise<void>;
  completeChallenge: (id: string) => Promise<boolean>; // true if newly completed
  claimSeason: (seasonId: string) => Promise<void>;
  hasCompletedChallenge: (id: string) => boolean;
  hasClaimedSeason: (seasonId: string) => boolean;
}

const DEFAULT_STATE = {
  completedChallengeIds: [] as string[],
  claimedSeasonIds: [] as string[],
};

async function persist(data: typeof DEFAULT_STATE) {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export const useSeasonStore = create<SeasonStore>((set, get) => ({
  ...DEFAULT_STATE,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({ ...DEFAULT_STATE, ...data });
      }
    } catch {}
  },

  completeChallenge: async (id) => {
    const { completedChallengeIds, claimedSeasonIds } = get();
    if (completedChallengeIds.includes(id)) return false;
    const next = { completedChallengeIds: [...completedChallengeIds, id], claimedSeasonIds };
    set(next);
    await persist(next);
    return true;
  },

  claimSeason: async (seasonId) => {
    const { completedChallengeIds, claimedSeasonIds } = get();
    if (claimedSeasonIds.includes(seasonId)) return;
    const next = { completedChallengeIds, claimedSeasonIds: [...claimedSeasonIds, seasonId] };
    set(next);
    await persist(next);
  },

  hasCompletedChallenge: (id) => get().completedChallengeIds.includes(id),
  hasClaimedSeason: (seasonId) => get().claimedSeasonIds.includes(seasonId),
}));
