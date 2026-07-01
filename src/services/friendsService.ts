import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from '@firebase/firestore';
import { db, auth } from './firebase';
import type { PublicProfile } from './profileService';

export interface FriendEntry {
  uid: string;
  inviteCode: string;
  displayName: string;
  level: number;
  xp: number;
  bestStreak: number;
  equippedTitle: string;
  topBadgeIds: string[];
  addedAt: unknown;
}

export interface FriendRequest {
  fromUid: string;
  fromDisplayName: string;
  fromCode: string;
  sentAt: unknown;
  status: 'pending' | 'accepted' | 'declined';
}

export type AddFriendResult = 'success' | 'not_found' | 'self' | 'already_friends' | 'already_sent' | 'error';

// ── Send a friend request ────────────────────────────────────────────────────

export async function sendFriendRequest(
  inviteCode: string,
  myDisplayName: string,
  myCode: string,
): Promise<{ result: AddFriendResult; targetProfile?: PublicProfile }> {
  const user = auth.currentUser;
  if (!user) return { result: 'error' };

  const codeSnap = await getDoc(doc(db, 'inviteCodes', inviteCode.toUpperCase()));
  if (!codeSnap.exists()) return { result: 'not_found' };

  const { userId: targetUid } = codeSnap.data() as { userId: string };
  if (targetUid === user.uid) return { result: 'self' };

  const alreadySnap = await getDoc(doc(db, 'users', user.uid, 'friends', targetUid));
  if (alreadySnap.exists()) return { result: 'already_friends' };

  const existingReq = await getDoc(doc(db, 'users', targetUid, 'friendRequests', user.uid));
  if (existingReq.exists()) return { result: 'already_sent' };

  const targetProfileSnap = await getDoc(doc(db, 'users', targetUid));
  if (!targetProfileSnap.exists()) return { result: 'not_found' };

  const targetProfile = { uid: targetUid, ...targetProfileSnap.data() } as PublicProfile;

  const request: FriendRequest = {
    fromUid: user.uid,
    fromDisplayName: myDisplayName,
    fromCode: myCode,
    sentAt: serverTimestamp(),
    status: 'pending',
  };

  await setDoc(doc(db, 'users', targetUid, 'friendRequests', user.uid), request);

  // Best-effort push notification — no cloud function needed
  const targetToken = (targetProfileSnap.data() as any).pushToken as string | null;
  if (targetToken) {
    sendPushNotification(targetToken, 'New Friend Request', `${myDisplayName} wants to be friends on GoalKeeper`, {
      type: 'friend_request',
      fromUid: user.uid,
    }).catch(() => {});
  }

  return { result: 'success', targetProfile };
}

// ── Accept a friend request ──────────────────────────────────────────────────

export async function acceptFriendRequest(fromUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const reqSnap = await getDoc(doc(db, 'users', user.uid, 'friendRequests', fromUid));
  if (!reqSnap.exists()) return;

  const request = reqSnap.data() as FriendRequest;

  const myProfileSnap = await getDoc(doc(db, 'users', user.uid));
  const myProfile = myProfileSnap.data() as PublicProfile | undefined;

  const theirProfileSnap = await getDoc(doc(db, 'users', fromUid));
  const theirProfile = theirProfileSnap.data() as PublicProfile | undefined;
  if (!theirProfile) return;

  const now = serverTimestamp();

  // Write friend entries on both sides
  const myEntry: FriendEntry = {
    uid: fromUid,
    inviteCode: theirProfile.inviteCode,
    displayName: theirProfile.displayName,
    level: theirProfile.level,
    xp: theirProfile.xp,
    bestStreak: theirProfile.bestStreak,
    equippedTitle: theirProfile.equippedTitle || '',
    topBadgeIds: theirProfile.topBadgeIds || [],
    addedAt: now,
  };

  const theirEntry: FriendEntry = {
    uid: user.uid,
    inviteCode: myProfile?.inviteCode || '',
    displayName: myProfile?.displayName || 'Adventurer',
    level: myProfile?.level || 1,
    xp: myProfile?.xp || 0,
    bestStreak: myProfile?.bestStreak || 0,
    equippedTitle: myProfile?.equippedTitle || '',
    topBadgeIds: myProfile?.topBadgeIds || [],
    addedAt: now,
  };

  await Promise.all([
    setDoc(doc(db, 'users', user.uid, 'friends', fromUid), myEntry),
    setDoc(doc(db, 'users', fromUid, 'friends', user.uid), theirEntry),
    deleteDoc(doc(db, 'users', user.uid, 'friendRequests', fromUid)),
  ]);

  // Notify the requester that their request was accepted
  const theirToken = (theirProfileSnap.data() as any)?.pushToken as string | null;
  if (theirToken && myProfile) {
    sendPushNotification(theirToken, 'Friend Request Accepted', `${myProfile.displayName} accepted your friend request!`, {
      type: 'friend_accepted',
      fromUid: user.uid,
    }).catch(() => {});
  }
}

// ── Decline a friend request ─────────────────────────────────────────────────

export async function declineFriendRequest(fromUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await deleteDoc(doc(db, 'users', user.uid, 'friendRequests', fromUid));
}

// ── Get pending requests ─────────────────────────────────────────────────────

export async function getPendingRequests(): Promise<FriendRequest[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const snap = await getDocs(collection(db, 'users', user.uid, 'friendRequests'));
  return snap.docs
    .map(d => d.data() as FriendRequest)
    .filter(r => r.status === 'pending');
}

// ── Get friends ──────────────────────────────────────────────────────────────

export async function getFriends(): Promise<FriendEntry[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const snap = await getDocs(collection(db, 'users', user.uid, 'friends'));
  return snap.docs.map(d => d.data() as FriendEntry);
}

// ── Remove friend ────────────────────────────────────────────────────────────

export async function removeFriend(friendUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await deleteDoc(doc(db, 'users', user.uid, 'friends', friendUid));
}

// ── Cheer a friend ───────────────────────────────────────────────────────────

export async function sendCheer(
  friendUid: string,
  friendPushToken: string | null,
  myDisplayName: string,
): Promise<void> {
  if (!friendPushToken) return;
  await sendPushNotification(
    friendPushToken,
    'You got a cheer! 🎉',
    `${myDisplayName} is cheering you on — keep it up!`,
    { type: 'cheer', fromDisplayName: myDisplayName },
  );
}

// ── Get friend's public goals ────────────────────────────────────────────────

export interface PublicGoal {
  goalId: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  currentStreak: number;
  totalLogs: number;
}

export async function getFriendPublicGoals(friendUid: string): Promise<PublicGoal[]> {
  const snap = await getDocs(collection(db, 'users', friendUid, 'publicGoals'));
  return snap.docs.map(d => ({ goalId: d.id, ...d.data() } as PublicGoal));
}

// ── Save push token ──────────────────────────────────────────────────────────

export async function savePushToken(token: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, 'users', user.uid), { pushToken: token }, { merge: true });
}

// ── Push notification helper ─────────────────────────────────────────────────

async function sendPushNotification(
  to: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ to, title, body, data }),
  });
}

// ── Legacy compat ────────────────────────────────────────────────────────────
// Kept so existing call sites in friendsStore.ts that use addFriendByCode still compile.
export async function addFriendByCode(
  inviteCode: string,
): Promise<{ result: AddFriendResult; profile?: PublicProfile }> {
  const user = auth.currentUser;
  if (!user) return { result: 'error' };
  // Resolve the invite code to a profile (read-only, no side effects)
  const codeSnap = await getDoc(doc(db, 'inviteCodes', inviteCode.toUpperCase()));
  if (!codeSnap.exists()) return { result: 'not_found' };
  const { userId } = codeSnap.data() as { userId: string };
  if (userId === user.uid) return { result: 'self' };
  const profileSnap = await getDoc(doc(db, 'users', userId));
  if (!profileSnap.exists()) return { result: 'not_found' };
  const profile = { uid: userId, ...profileSnap.data() } as PublicProfile;
  return { result: 'success', profile };
}
