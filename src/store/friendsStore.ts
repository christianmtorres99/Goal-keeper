import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAuth } from '../services/authService';
import { initUserProfile, syncProfile } from '../services/profileService';
import type { PublicProfile } from '../services/profileService';
import * as FriendsService from '../services/friendsService';
import type { FriendEntry, AddFriendResult } from '../services/friendsService';
import { getTopLeaderboard } from '../services/leaderboardService';

export type { FriendEntry };

const INVITE_CODE_CACHE = 'firebaseInviteCode_v1';

interface FriendsStore {
  myUid: string | null;
  myInviteCode: string | null;
  friends: FriendEntry[];
  leaderboard: PublicProfile[];
  loading: boolean;
  leaderboardLoading: boolean;
  error: string | null;

  load: () => Promise<void>;
  addFriend: (code: string) => Promise<AddFriendResult>;
  removeFriend: (uid: string) => Promise<void>;
  loadLeaderboard: () => Promise<void>;
  syncMyProfile: () => Promise<void>;
  // kept for compatibility
  save: () => Promise<void>;
}

export const useFriendsStore = create<FriendsStore>((set, get) => ({
  myUid: null,
  myInviteCode: null,
  friends: [],
  leaderboard: [],
  loading: false,
  leaderboardLoading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      // Show cached invite code immediately while Firebase loads
      const cached = await AsyncStorage.getItem(INVITE_CODE_CACHE);
      if (cached) set({ myInviteCode: cached });

      const user = await ensureAuth();
      set({ myUid: user.uid });

      const inviteCode = await initUserProfile();
      set({ myInviteCode: inviteCode });
      await AsyncStorage.setItem(INVITE_CODE_CACHE, inviteCode);

      const friends = await FriendsService.getFriends();
      set({ friends, loading: false });

      // Sync local stats to cloud in background — don't block app startup
      syncProfile(inviteCode).catch(() => {});
    } catch {
      set({ loading: false, error: 'Could not connect. Friends will sync when online.' });
    }
  },

  addFriend: async (code: string) => {
    try {
      const { result } = await FriendsService.addFriendByCode(code.trim().toUpperCase());
      if (result === 'success') {
        const friends = await FriendsService.getFriends();
        set({ friends });
      }
      return result;
    } catch {
      return 'error';
    }
  },

  removeFriend: async (uid: string) => {
    await FriendsService.removeFriend(uid);
    set(state => ({ friends: state.friends.filter(f => f.uid !== uid) }));
  },

  loadLeaderboard: async () => {
    set({ leaderboardLoading: true });
    try {
      const leaderboard = await getTopLeaderboard(100);
      set({ leaderboard, leaderboardLoading: false });
    } catch {
      set({ leaderboardLoading: false });
    }
  },

  syncMyProfile: async () => {
    const { myInviteCode } = get();
    if (!myInviteCode) return;
    await syncProfile(myInviteCode);
  },

  save: async () => {},
}));
