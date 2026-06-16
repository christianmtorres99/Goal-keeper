import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayString } from '../utils/dateUtils';
import { SHARDS_PER_CRAFT } from '../constants/xp';
import type { Consumable, ConsumableType } from '../types';

const KEY = 'craftingStore_v1';

const CONSUMABLE_POOL: ConsumableType[] = [
  'xp_surge',
  'lucky_boost',
  'coin_cache',
  'grace_refill',
  'quest_boost',
];

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface ActiveSurge {
  remainingLogs: number;
  multiplier: number;
}

interface CraftingStore {
  shardCount: number;
  lifetimeShards: number;
  consumables: Consumable[];
  luckyDropCount: number;
  activeSurge: ActiveSurge | null;
  luckyBoostUntil: string | null;  // YYYY-MM-DD
  questBoostDate: string | null;   // YYYY-MM-DD

  load: () => Promise<void>;
  addShard: (count?: number) => Promise<void>;
  craft: () => Promise<Consumable | null>; // null if not enough shards
  useConsumable: (id: string) => Promise<ConsumableType | null>;
  consumeSurge: () => Promise<boolean>;  // returns true if surge active, decrements remainingLogs
  incrementLuckyDropCount: () => Promise<void>;
  isLuckyBoostActive: () => boolean;
  isQuestBoostActive: () => boolean;
  isSurgeActive: () => boolean;
}

const DEFAULT_STATE = {
  shardCount: 0,
  lifetimeShards: 0,
  consumables: [] as Consumable[],
  luckyDropCount: 0,
  activeSurge: null as ActiveSurge | null,
  luckyBoostUntil: null as string | null,
  questBoostDate: null as string | null,
};

async function persist(partial: Partial<typeof DEFAULT_STATE>) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const prev = raw ? JSON.parse(raw) : DEFAULT_STATE;
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...prev, ...partial }));
  } catch {}
}

export const useCraftingStore = create<CraftingStore>((set, get) => ({
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

  addShard: async (count = 1) => {
    const { shardCount, lifetimeShards } = get();
    const next = {
      shardCount: shardCount + count,
      lifetimeShards: lifetimeShards + count,
    };
    set(next);
    await persist(next);
  },

  craft: async () => {
    const { shardCount, consumables } = get();
    if (shardCount < SHARDS_PER_CRAFT) return null;

    const idx = Math.floor(Math.random() * CONSUMABLE_POOL.length);
    const type = CONSUMABLE_POOL[idx];
    const consumable: Consumable = { id: uuid(), type, craftedAt: new Date().toISOString() };

    const next = {
      shardCount: shardCount - SHARDS_PER_CRAFT,
      consumables: [...consumables, consumable],
    };
    set(next);
    await persist(next);
    return consumable;
  },

  useConsumable: async (id) => {
    const { consumables } = get();
    const consumable = consumables.find(c => c.id === id);
    if (!consumable) return null;

    const remaining = consumables.filter(c => c.id !== id);
    const today = todayString();
    const partial: Partial<typeof DEFAULT_STATE> = { consumables: remaining };

    if (consumable.type === 'xp_surge') {
      partial.activeSurge = { remainingLogs: 5, multiplier: 1.5 };
    } else if (consumable.type === 'lucky_boost') {
      const tomorrow = new Date(new Date().getTime() + 86400000).toISOString().slice(0, 10);
      partial.luckyBoostUntil = tomorrow;
    } else if (consumable.type === 'quest_boost') {
      partial.questBoostDate = today;
    }
    // coin_cache and grace_refill are handled at call site after useConsumable returns

    set(partial as any);
    await persist(partial);
    return consumable.type;
  },

  consumeSurge: async () => {
    const { activeSurge } = get();
    if (!activeSurge) return false;
    if (activeSurge.remainingLogs <= 1) {
      set({ activeSurge: null });
      await persist({ activeSurge: null });
    } else {
      const next = { activeSurge: { ...activeSurge, remainingLogs: activeSurge.remainingLogs - 1 } };
      set(next);
      await persist(next);
    }
    return true;
  },

  incrementLuckyDropCount: async () => {
    const { luckyDropCount } = get();
    const next = { luckyDropCount: luckyDropCount + 1 };
    set(next);
    await persist(next);
  },

  isLuckyBoostActive: () => {
    const { luckyBoostUntil } = get();
    if (!luckyBoostUntil) return false;
    return todayString() <= luckyBoostUntil;
  },

  isQuestBoostActive: () => {
    const { questBoostDate } = get();
    return questBoostDate === todayString();
  },

  isSurgeActive: () => {
    return get().activeSurge !== null;
  },
}));
