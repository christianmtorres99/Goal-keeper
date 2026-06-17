import { doc, getDoc, setDoc, getDocs, collection, deleteDoc, serverTimestamp } from '@firebase/firestore';
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

export type AddFriendResult = 'success' | 'not_found' | 'self' | 'already_friends' | 'error';

export async function addFriendByCode(
  inviteCode: string,
): Promise<{ result: AddFriendResult; profile?: PublicProfile }> {
  const user = auth.currentUser;
  if (!user) return { result: 'error' };

  const codeSnap = await getDoc(doc(db, 'inviteCodes', inviteCode.toUpperCase()));
  if (!codeSnap.exists()) return { result: 'not_found' };

  const { userId } = codeSnap.data() as { userId: string };
  if (userId === user.uid) return { result: 'self' };

  const alreadySnap = await getDoc(doc(db, 'users', user.uid, 'friends', userId));
  if (alreadySnap.exists()) return { result: 'already_friends' };

  const profileSnap = await getDoc(doc(db, 'users', userId));
  if (!profileSnap.exists()) return { result: 'not_found' };

  const profile = { uid: userId, ...profileSnap.data() } as PublicProfile;

  const entry: FriendEntry = {
    uid: userId,
    inviteCode: profile.inviteCode,
    displayName: profile.displayName,
    level: profile.level,
    xp: profile.xp,
    bestStreak: profile.bestStreak,
    equippedTitle: profile.equippedTitle || '',
    topBadgeIds: profile.topBadgeIds || [],
    addedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', user.uid, 'friends', userId), entry);
  return { result: 'success', profile };
}

export async function getFriends(): Promise<FriendEntry[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const snap = await getDocs(collection(db, 'users', user.uid, 'friends'));
  return snap.docs.map(d => d.data() as FriendEntry);
}

export async function removeFriend(friendUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await deleteDoc(doc(db, 'users', user.uid, 'friends', friendUid));
}
