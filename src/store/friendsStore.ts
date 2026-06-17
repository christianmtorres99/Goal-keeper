import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'friendsStore_v1';

export interface FriendProfile {
  id: string;
  inviteCode: string;
  displayName: string;
  level: number;
  xp: number;
  bestStreak: number;
  lastUpdated: string;
}

interface FriendsStore {
  myInviteCode: string | null;
  friends: FriendProfile[];
  load: () => Promise<void>;
  save: () => Promise<void>;
  ensureMyCode: () => Promise<string>;
  addFriend: (inviteCode: string, displayName: string) => Promise<void>;
  removeFriend: (id: string) => Promise<void>;
}

function generateCode(): string {
  // Unambiguous charset — no 0/O, 1/I/L
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const useFriendsStore = create<FriendsStore>((set, get) => ({
  myInviteCode: null,
  friends: [],

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({ myInviteCode: data.myInviteCode ?? null, friends: data.friends ?? [] });
      }
    } catch {}
  },

  save: async () => {
    const { myInviteCode, friends } = get();
    await AsyncStorage.setItem(KEY, JSON.stringify({ myInviteCode, friends }));
  },

  ensureMyCode: async () => {
    const { myInviteCode, save } = get();
    if (myInviteCode) return myInviteCode;
    const code = generateCode();
    set({ myInviteCode: code });
    await save();
    return code;
  },

  addFriend: async (inviteCode: string, displayName: string) => {
    const { friends, save } = get();
    const entry: FriendProfile = {
      id: generateId(),
      inviteCode: inviteCode.trim().toUpperCase(),
      displayName: displayName.trim(),
      level: 1,
      xp: 0,
      bestStreak: 0,
      lastUpdated: new Date().toISOString(),
    };
    set({ friends: [...friends, entry] });
    await save();
  },

  removeFriend: async (id: string) => {
    const { friends, save } = get();
    set({ friends: friends.filter(f => f.id !== id) });
    await save();
  },
}));
