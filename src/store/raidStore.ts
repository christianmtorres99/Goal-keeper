import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayString, daysBetween } from '../utils/dateUtils';
import { BOSS_DEFINITIONS, getBossAtIndex } from '../constants/bosses';
import type { ActiveBoss, Debuff, BossTier } from '../types';

const KEY = 'raidStore_v1';

// A new raid spawns every 14 days based on days since epoch
const RAID_INTERVAL_DAYS = 14;
const RAID_DURATION_DAYS = 7;
// Debuffs fire on days 2, 4, 6 of the raid
const DEBUFF_DAYS = [2, 4, 6];

function daysSinceEpoch(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 86400000);
}

interface RaidStore {
  currentBoss: ActiveBoss | null;
  damageDealt: number;
  damageTodayDate: string | null;
  damageToday: number;
  defeatedBossIds: string[];       // 'bossDefinitionId:startDate'
  lastRaidEndDate: string | null;
  activeDebuff: Debuff | null;
  lastDebuffDate: string | null;

  load: () => Promise<void>;
  checkSpawn: (playerLevel: number) => Promise<void>;
  checkDebuff: () => Promise<void>;
  applyDamage: (damage: number) => Promise<number>; // returns actual damage applied (capped)
  defeatBoss: () => Promise<{ coins: number; bossId: string; tier: BossTier }>;
  getExpiredAndNotDefeated: () => boolean;
  isRaidActive: () => boolean;
  isBossDefeated: () => boolean;
  getActiveDebuff: () => Debuff | null;
}

const DEFAULT_STATE = {
  currentBoss: null as ActiveBoss | null,
  damageDealt: 0,
  damageTodayDate: null as string | null,
  damageToday: 0,
  defeatedBossIds: [] as string[],
  lastRaidEndDate: null as string | null,
  activeDebuff: null as Debuff | null,
  lastDebuffDate: null as string | null,
};

async function persist(partial: Partial<typeof DEFAULT_STATE>) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const prev = raw ? JSON.parse(raw) : DEFAULT_STATE;
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...prev, ...partial }));
  } catch {}
}

export const useRaidStore = create<RaidStore>((set, get) => ({
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

  checkSpawn: async (playerLevel: number) => {
    const { currentBoss, lastRaidEndDate } = get();
    const today = todayString();

    // Clear expired boss
    if (currentBoss && today > currentBoss.endDate) {
      set({ currentBoss: null, damageDealt: 0, damageToday: 0, damageTodayDate: null, lastRaidEndDate: currentBoss.endDate, activeDebuff: null });
      await persist({ currentBoss: null, damageDealt: 0, damageToday: 0, damageTodayDate: null, lastRaidEndDate: currentBoss.endDate, activeDebuff: null });
    }

    const state = get();
    if (state.currentBoss) return; // raid already active

    // Check if enough time has passed since last raid
    if (state.lastRaidEndDate) {
      const daysSinceLast = daysBetween(state.lastRaidEndDate, today);
      if (daysSinceLast < RAID_INTERVAL_DAYS) return;
    }

    // Determine which boss based on epoch-slot
    const slot = Math.floor(daysSinceEpoch(today) / RAID_INTERVAL_DAYS);
    const def = getBossAtIndex(slot);

    const maxHP = Math.round(Math.max(playerLevel, 1) * 120 + 200);
    const endDate = new Date(new Date(today).getTime() + (RAID_DURATION_DAYS - 1) * 86400000)
      .toISOString()
      .slice(0, 10);

    const newBoss: ActiveBoss = {
      definitionId: def.id,
      maxHP,
      startDate: today,
      endDate,
    };

    set({ currentBoss: newBoss, damageDealt: 0, damageToday: 0, damageTodayDate: today });
    await persist({ currentBoss: newBoss, damageDealt: 0, damageToday: 0, damageTodayDate: today });
  },

  checkDebuff: async () => {
    const { currentBoss, lastDebuffDate, defeatedBossIds } = get();
    if (!currentBoss) { set({ activeDebuff: null }); return; }
    const today = todayString();

    // Clear if boss already defeated
    const bossKey = `${currentBoss.definitionId}:${currentBoss.startDate}`;
    if (defeatedBossIds.includes(bossKey)) {
      set({ activeDebuff: null });
      await persist({ activeDebuff: null });
      return;
    }

    // Check if today's debuff day
    const raidDay = daysBetween(currentBoss.startDate, today) + 1; // 1-indexed
    if (!DEBUFF_DAYS.includes(raidDay)) {
      if (lastDebuffDate !== today) {
        set({ activeDebuff: null });
      }
      return;
    }

    if (lastDebuffDate === today) return; // already set today

    const def = BOSS_DEFINITIONS.find(b => b.id === currentBoss.definitionId);
    if (!def) return;

    const debuff: Debuff = {
      type: def.debuffType,
      magnitude: def.debuffMag,
      label: def.debuffLabel,
      activeForDate: today,
    };

    set({ activeDebuff: debuff, lastDebuffDate: today });
    await persist({ activeDebuff: debuff, lastDebuffDate: today });
  },

  applyDamage: async (damage: number) => {
    const { currentBoss, damageDealt, damageTodayDate, damageToday } = get();
    if (!currentBoss) return 0;

    const today = todayString();
    const todayDmg = damageTodayDate === today ? damageToday : 0;
    const cap = 120; // RAID_DAMAGE_DAILY_CAP
    const allowed = Math.max(0, Math.min(damage, cap - todayDmg));
    if (allowed <= 0) return 0;

    const newDamageDealt = Math.min(damageDealt + allowed, currentBoss.maxHP);
    const newDamageToday = todayDmg + allowed;

    set({ damageDealt: newDamageDealt, damageToday: newDamageToday, damageTodayDate: today });
    await persist({ damageDealt: newDamageDealt, damageToday: newDamageToday, damageTodayDate: today });
    return allowed;
  },

  defeatBoss: async () => {
    const { currentBoss, defeatedBossIds } = get();
    if (!currentBoss) return { coins: 0, bossId: '', tier: 'normal' as BossTier };

    const def = BOSS_DEFINITIONS.find(b => b.id === currentBoss.definitionId);
    const tier: BossTier = def?.tier ?? 'normal';
    const bossKey = `${currentBoss.definitionId}:${currentBoss.startDate}`;

    const coinMap: Record<BossTier, number> = { normal: 80, elite: 150, legendary: 250 };
    const coins = coinMap[tier];

    const updatedDefeated = [...defeatedBossIds, bossKey];
    set({
      defeatedBossIds: updatedDefeated,
      activeDebuff: null,
    });
    await persist({ defeatedBossIds: updatedDefeated, activeDebuff: null });

    return { coins, bossId: currentBoss.definitionId, tier };
  },

  getExpiredAndNotDefeated: () => {
    const { currentBoss, defeatedBossIds } = get();
    if (!currentBoss) return false;
    const today = todayString();
    if (today <= currentBoss.endDate) return false;
    const bossKey = `${currentBoss.definitionId}:${currentBoss.startDate}`;
    return !defeatedBossIds.includes(bossKey);
  },

  isRaidActive: () => {
    const { currentBoss } = get();
    if (!currentBoss) return false;
    const today = todayString();
    return today >= currentBoss.startDate && today <= currentBoss.endDate;
  },

  isBossDefeated: () => {
    const { currentBoss, defeatedBossIds } = get();
    if (!currentBoss) return false;
    const bossKey = `${currentBoss.definitionId}:${currentBoss.startDate}`;
    return defeatedBossIds.includes(bossKey);
  },

  getActiveDebuff: () => {
    const { activeDebuff } = get();
    if (!activeDebuff) return null;
    if (activeDebuff.activeForDate !== todayString()) return null;
    return activeDebuff;
  },
}));
