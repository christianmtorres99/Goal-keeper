import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayString } from '../utils/dateUtils';

const STORAGE_KEY = 'restDay_v1';

interface RestDayStore {
  bankedRestDays: number;
  activeRestDate: string | null;
  totalActiveDays: number;
  activeDaysSinceLastBank: number;
  dismissCount: number;
  loadRestDay: () => Promise<void>;
  activateRestDay: () => Promise<void>;
  incrementActiveDay: () => Promise<void>;
  dismissPrompt: () => Promise<void>;
  resetRestDay: () => void;
}

type PersistedState = Pick<
  RestDayStore,
  | 'bankedRestDays'
  | 'activeRestDate'
  | 'totalActiveDays'
  | 'activeDaysSinceLastBank'
  | 'dismissCount'
>;

async function persist(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useRestDayStore = create<RestDayStore>((set, get) => ({
  bankedRestDays: 0,
  activeRestDate: null,
  totalActiveDays: 0,
  activeDaysSinceLastBank: 0,
  dismissCount: 0,

  loadRestDay: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: Partial<PersistedState> = JSON.parse(raw);
      set({
        bankedRestDays: saved.bankedRestDays ?? 0,
        activeRestDate: saved.activeRestDate ?? null,
        totalActiveDays: saved.totalActiveDays ?? 0,
        activeDaysSinceLastBank: saved.activeDaysSinceLastBank ?? 0,
        dismissCount: saved.dismissCount ?? 0,
      });
    } catch (e) {
      console.error('loadRestDay failed:', e);
    }
  },

  activateRestDay: async () => {
    const { bankedRestDays } = get();
    if (bankedRestDays <= 0) return;
    const today = todayString();
    const next: PersistedState = {
      bankedRestDays: bankedRestDays - 1,
      activeRestDate: today,
      totalActiveDays: get().totalActiveDays,
      activeDaysSinceLastBank: get().activeDaysSinceLastBank,
      dismissCount: 0,
    };
    set(next);
    await persist(next);
  },

  incrementActiveDay: async () => {
    const { totalActiveDays, activeDaysSinceLastBank, bankedRestDays } = get();
    const newTotal = totalActiveDays + 1;
    let newSince = activeDaysSinceLastBank + 1;
    let newBanked = bankedRestDays;

    // Every 7 active days, bank a rest day (max 4)
    if (newTotal > 0 && newTotal % 7 === 0) {
      if (newBanked < 4) {
        newBanked = Math.min(newBanked + 1, 4);
      }
      newSince = 0;
    }

    const bankingFired = newTotal > 0 && newTotal % 7 === 0;
    const next: PersistedState = {
      bankedRestDays: newBanked,
      activeRestDate: get().activeRestDate,
      totalActiveDays: newTotal,
      activeDaysSinceLastBank: newSince,
      dismissCount: bankingFired ? 0 : get().dismissCount,
    };
    set(next);
    await persist(next);
  },

  dismissPrompt: async () => {
    const { dismissCount } = get();
    const next: PersistedState = {
      bankedRestDays: get().bankedRestDays,
      activeRestDate: get().activeRestDate,
      totalActiveDays: get().totalActiveDays,
      activeDaysSinceLastBank: get().activeDaysSinceLastBank,
      dismissCount: dismissCount + 1,
    };
    set(next);
    await persist(next);
  },

  resetRestDay: () => {
    const next: PersistedState = {
      bankedRestDays: get().bankedRestDays,
      activeRestDate: null,
      totalActiveDays: get().totalActiveDays,
      activeDaysSinceLastBank: get().activeDaysSinceLastBank,
      dismissCount: get().dismissCount,
    };
    set(next);
    persist(next).catch(e => console.error('resetRestDay persist failed:', e));
  },
}));
