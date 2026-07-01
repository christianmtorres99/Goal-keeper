import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAuth } from '../services/authService';
import { initUserProfile, syncProfile } from '../services/profileService';
import type { PublicProfile } from '../services/profileService';
import * as FriendsService from '../services/friendsService';
import type { FriendEntry, AddFriendResult, FriendRequest } from '../services/friendsService';
import { getTopLeaderboard } from '../services/leaderboardService';

export type { FriendEntry, FriendRequest };

const INVITE_CODE_CACHE = 'firebaseInviteCode_v1';
const CHEER_PREFIX = 'lastCheer_';

interface FriendsStore {
  myUid: string | null;
  myInviteCode: string | null;
  myDisplayName: string | null;
  friends: FriendEntry[];
  pendingRequests: FriendRequest[];
  leaderboard: PublicProfile[];
  loading: boolean;
  leaderboardLoading: boolean;
  error: string | null;

  load: () => Promise<void>;
  sendRequest: (code: string) => Promise<AddFriendResult>;
  acceptRequest: (fromUid: string) => Promise<void>;
  declineRequest: (fromUid: string) => Promise<void>;
  removeFriend: (uid: string) => Promise<void>;
  cheerFriend: (friendUid: string, friendPushToken: string | null) => Promise<boolean>;
  canCheer: (friendUid: string) => Promise<boolean>;
  loadLeaderboard: () => Promise<void>;
  syncMyProfile: () => Promise<void>;

  // legacy compat
  addFriend: (code: string) => Promise<AddFriendResult>;
  save: () => Promise<void>;
}

export const useFriendsStore = create<FriendsStore>((set, get) => ({
  myUid: null,
  myInviteCode: null,
  myDisplayName: null,
  friends: [],
  pendingRequests: [],
  leaderboard: [],
  loading: false,
  leaderboardLoading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const cached = await AsyncStorage.getItem(INVITE_CODE_CACHE);
      if (cached) set({ myInviteCode: cached });

      const user = await ensureAuth();
      set({ myUid: user.uid });

      const inviteCode = await initUserProfile();
      set({ myInviteCode: inviteCode });
      await AsyncStorage.setItem(INVITE_CODE_CACHE, inviteCode);

      const [friends, pendingRequests] = await Promise.all([
        FriendsService.getFriends(),
        FriendsService.getPendingRequests(),
      ]);
      set({ friends, pendingRequests, loading: false });

      syncProfile(inviteCode).catch(() => {});
    } catch {
      set({ loading: false, error: 'Could not connect. Friends will sync when online.' });
    }
  },

  sendRequest: async (code: string) => {
    try {
      const { myInviteCode, myDisplayName } = get();
      const { result } = await FriendsService.sendFriendRequest(
        code.trim().toUpperCase(),
        myDisplayName || 'Adventurer',
        myInviteCode || '',
      );
      return result;
    } catch {
      return 'error';
    }
  },

  acceptRequest: async (fromUid: string) => {
    try {
      await FriendsService.acceptFriendRequest(fromUid);
      const [friends, pendingRequests] = await Promise.all([
        FriendsService.getFriends(),
        FriendsService.getPendingRequests(),
      ]);
      set({ friends, pendingRequests });
    } catch {}
  },

  declineRequest: async (fromUid: string) => {
    try {
      await FriendsService.declineFriendRequest(fromUid);
      set(s => ({ pendingRequests: s.pendingRequests.filter(r => r.fromUid !== fromUid) }));
    } catch {}
  },

  removeFriend: async (uid: string) => {
    await FriendsService.removeFriend(uid);
    set(s => ({ friends: s.friends.filter(f => f.uid !== uid) }));
  },

  canCheer: async (friendUid: string): Promise<boolean> => {
    const key = `${CHEER_PREFIX}${friendUid}`;
    const last = await AsyncStorage.getItem(key);
    if (!last) return true;
    const lastMs = parseInt(last, 10);
    return Date.now() - lastMs > 86400000; // 24h rate limit
  },

  cheerFriend: async (friendUid: string, friendPushToken: string | null): Promise<boolean> => {
    const canCheer = await get().canCheer(friendUid);
    if (!canCheer) return false;
    const { myDisplayName } = get();
    try {
      await FriendsService.sendCheer(friendUid, friendPushToken, myDisplayName || 'A friend');
      await AsyncStorage.setItem(`${CHEER_PREFIX}${friendUid}`, Date.now().toString());
      return true;
    } catch {
      return false;
    }
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
    let { myInviteCode, myUid } = get();
    if (!myUid || !myInviteCode) {
      await get().load();
      myInviteCode = get().myInviteCode;
    }
    if (!myInviteCode) return;
    await syncProfile(myInviteCode);
  },

  // legacy compat
  addFriend: async (code: string) => {
    return get().sendRequest(code);
  },

  save: async () => {},
}));
