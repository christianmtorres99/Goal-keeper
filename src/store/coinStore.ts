import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'coinStore_v1';
export const COIN_CAP = 2000;

interface CoinStore {
  balance: number;
  lifetimeEarned: number;

  load: () => Promise<void>;
  addCoins: (amount: number, source?: string) => Promise<void>;
  spendCoins: (amount: number) => Promise<boolean>;
}

const DEFAULT_STATE = {
  balance: 0,
  lifetimeEarned: 0,
};

async function persist(data: typeof DEFAULT_STATE) {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export const useCoinStore = create<CoinStore>((set, get) => ({
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

  addCoins: async (amount, _source) => {
    if (amount <= 0) return;
    const { balance, lifetimeEarned } = get();
    const newBalance = Math.min(balance + amount, COIN_CAP);
    const gained = newBalance - balance;
    const next = {
      balance: newBalance,
      lifetimeEarned: lifetimeEarned + gained,
    };
    set(next);
    await persist(next);
  },

  spendCoins: async (amount) => {
    const { balance } = get();
    if (balance < amount) return false;
    const next = { balance: balance - amount, lifetimeEarned: get().lifetimeEarned };
    set(next);
    await persist(next);
    return true;
  },
}));
