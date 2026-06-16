import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'perkStore_v1';
const MAX_EQUIPPED = 2;

interface PerkStore {
  ownedPerkIds: string[];
  equippedPerkIds: string[];

  load: () => Promise<void>;
  addPerk: (id: string) => Promise<void>;
  equipPerk: (id: string) => Promise<void>;
  unequipPerk: (id: string) => Promise<void>;
  hasPerk: (id: string) => boolean;
  isEquipped: (id: string) => boolean;
}

const DEFAULT_STATE = {
  ownedPerkIds: [] as string[],
  equippedPerkIds: [] as string[],
};

async function persist(data: typeof DEFAULT_STATE) {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export const usePerkStore = create<PerkStore>((set, get) => ({
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

  addPerk: async (id) => {
    const { ownedPerkIds, equippedPerkIds } = get();
    if (ownedPerkIds.includes(id)) return;
    const next = { ownedPerkIds: [...ownedPerkIds, id], equippedPerkIds };
    set(next);
    await persist(next);
  },

  equipPerk: async (id) => {
    const { ownedPerkIds, equippedPerkIds } = get();
    if (!ownedPerkIds.includes(id)) return;
    if (equippedPerkIds.includes(id)) return;
    const newEquipped = equippedPerkIds.length >= MAX_EQUIPPED
      ? [...equippedPerkIds.slice(1), id]
      : [...equippedPerkIds, id];
    const next = { ownedPerkIds, equippedPerkIds: newEquipped };
    set(next);
    await persist(next);
  },

  unequipPerk: async (id) => {
    const { ownedPerkIds, equippedPerkIds } = get();
    const next = { ownedPerkIds, equippedPerkIds: equippedPerkIds.filter(e => e !== id) };
    set(next);
    await persist(next);
  },

  hasPerk: (id) => get().ownedPerkIds.includes(id),
  isEquipped: (id) => get().equippedPerkIds.includes(id),
}));
