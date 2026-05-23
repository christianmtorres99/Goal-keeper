import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'todoXP_v1';

interface TodoXPStore {
  totalXP: number;
  addXP: (amount: number) => Promise<void>;
  load: () => Promise<void>;
}

export const useTodoXPStore = create<TodoXPStore>((set, get) => ({
  totalXP: 0,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) set({ totalXP: parseInt(raw, 10) || 0 });
    } catch (e) {
      console.error('todoXPStore.load failed:', e);
    }
  },

  addXP: async (amount: number) => {
    try {
      const next = get().totalXP + amount;
      set({ totalXP: next });
      await AsyncStorage.setItem(KEY, String(next));
    } catch (e) {
      console.error('todoXPStore.addXP failed:', e);
    }
  },
}));
