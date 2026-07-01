import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'perkStore_v1';
const MAX_EQUIPPED = 2;

export interface ActiveBuff {
  id: string;
  type: 'xp_boost' | 'streak_shield' | 'coin_magnet';
  multiplier?: number;
  expiresAt: number; // Unix ms
  purchasedAt: number;
}

interface PerkStore {
  ownedPerkIds: string[];
  equippedPerkIds: string[];
  activeBuffs: ActiveBuff[];

  load: () => Promise<void>;
  addPerk: (id: string) => Promise<void>;
  equipPerk: (id: string) => Promise<void>;
  unequipPerk: (id: string) => Promise<void>;
  hasPerk: (id: string) => boolean;
  isEquipped: (id: string) => boolean;
  activateBuff: (buff: ActiveBuff) => Promise<void>;
  getActiveBuff: (type: ActiveBuff['type']) => ActiveBuff | undefined;
}

const DEFAULT_STATE = {
  ownedPerkIds: [] as string[],
  equippedPerkIds: [] as string[],
  activeBuffs: [] as ActiveBuff[],
};

async function persist(data: { ownedPerkIds: string[]; equippedPerkIds: string[]; activeBuffs: ActiveBuff[] }) {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export const usePerkStore = create<PerkStore>((set, get) => ({
  ...DEFAULT_STATE,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        // Filter out expired buffs on load
        const now = Date.now();
        const activeBuffs = (data.activeBuffs ?? []).filter((b: ActiveBuff) => b.expiresAt > now);
        set({ ...DEFAULT_STATE, ...data, activeBuffs });
      }
    } catch {}
  },

  addPerk: async (id) => {
    const { ownedPerkIds, equippedPerkIds, activeBuffs } = get();
    if (ownedPerkIds.includes(id)) return;
    const next = { ownedPerkIds: [...ownedPerkIds, id], equippedPerkIds, activeBuffs };
    set(next);
    await persist(next);
  },

  equipPerk: async (id) => {
    const { ownedPerkIds, equippedPerkIds, activeBuffs } = get();
    if (!ownedPerkIds.includes(id)) return;
    if (equippedPerkIds.includes(id)) return;
    const newEquipped = equippedPerkIds.length >= MAX_EQUIPPED
      ? [...equippedPerkIds.slice(1), id]
      : [...equippedPerkIds, id];
    const next = { ownedPerkIds, equippedPerkIds: newEquipped, activeBuffs };
    set(next);
    await persist(next);
  },

  unequipPerk: async (id) => {
    const { ownedPerkIds, equippedPerkIds, activeBuffs } = get();
    const next = { ownedPerkIds, equippedPerkIds: equippedPerkIds.filter(e => e !== id), activeBuffs };
    set(next);
    await persist(next);
  },

  hasPerk: (id) => get().ownedPerkIds.includes(id),
  isEquipped: (id) => get().equippedPerkIds.includes(id),

  activateBuff: async (buff) => {
    const now = Date.now();
    const existing = get().activeBuffs.filter(b => b.expiresAt > now && b.id !== buff.id);
    const next = { ...get(), activeBuffs: [...existing, buff] };
    set({ activeBuffs: next.activeBuffs });
    await persist({ ownedPerkIds: next.ownedPerkIds, equippedPerkIds: next.equippedPerkIds, activeBuffs: next.activeBuffs });
  },

  getActiveBuff: (type) => {
    const now = Date.now();
    return get().activeBuffs.find(b => b.type === type && b.expiresAt > now);
  },
}));
