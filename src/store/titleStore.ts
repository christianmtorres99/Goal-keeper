import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'titleStore_v1';

interface TitleStore {
  earnedTitleIds: string[];
  equippedTitleId: string | null;

  load: () => Promise<void>;
  awardTitle: (id: string) => Promise<boolean>; // returns true if newly awarded
  equipTitle: (id: string) => Promise<void>;
  hasTitle: (id: string) => boolean;
}

const DEFAULT_STATE = {
  earnedTitleIds: [] as string[],
  equippedTitleId: null as string | null,
};

async function persist(data: typeof DEFAULT_STATE) {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export const useTitleStore = create<TitleStore>((set, get) => ({
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

  awardTitle: async (id) => {
    const { earnedTitleIds, equippedTitleId } = get();
    if (earnedTitleIds.includes(id)) return false;
    const next = { earnedTitleIds: [...earnedTitleIds, id], equippedTitleId };
    set(next);
    await persist(next);
    return true;
  },

  equipTitle: async (id) => {
    const { earnedTitleIds } = get();
    const newEquipped = earnedTitleIds.includes(id) ? id : get().equippedTitleId;
    const next = { earnedTitleIds, equippedTitleId: newEquipped };
    set(next);
    await persist(next);
  },

  hasTitle: (id) => get().earnedTitleIds.includes(id),
}));
