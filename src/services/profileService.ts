import { doc, setDoc, getDoc, serverTimestamp } from '@firebase/firestore';
import { db, auth } from './firebase';
import { useGameStore } from '../store/gameStore';
import { useLogStore } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { useTitleStore } from '../store/titleStore';
import { useTodoXPStore } from '../store/todoXPStore';
import { getPlayerStats } from '../logic/xpEngine';
import { sumXP } from '../utils/xpUtils';

export interface PublicProfile {
  uid: string;
  displayName: string;
  inviteCode: string;
  level: number;
  xp: number;
  bestStreak: number;
  equippedTitle: string;
  topBadgeIds: string[];
  updatedAt: unknown;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function initUserProfile(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return snap.data().inviteCode as string;
  }

  // New user — find a unique invite code
  let inviteCode = '';
  for (let i = 0; i < 5; i++) {
    const candidate = generateInviteCode();
    const codeSnap = await getDoc(doc(db, 'inviteCodes', candidate));
    if (!codeSnap.exists()) { inviteCode = candidate; break; }
  }
  if (!inviteCode) inviteCode = generateInviteCode();

  await setDoc(doc(db, 'inviteCodes', inviteCode), { userId: user.uid });

  const profile: PublicProfile = {
    uid: user.uid,
    displayName: useGameStore.getState().userName || 'Adventurer',
    inviteCode,
    level: 1,
    xp: 0,
    bestStreak: 0,
    equippedTitle: '',
    topBadgeIds: [],
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, profile);
  return inviteCode;
}

export async function syncProfile(inviteCode: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const logs = useLogStore.getState().logs;
  const todoXP = useTodoXPStore.getState().totalXP;
  const rawXP = sumXP(logs) + todoXP;
  const adjustedXP = useGameStore.getState().getAdjustedXP(rawXP);
  const { level } = getPlayerStats(adjustedXP);

  const gameState = useGameStore.getState();
  const bestStreak = gameState.personalRecords.longestStreak;
  const displayName = gameState.userName || 'Adventurer';

  const earnedBadges = useBadgeStore.getState().earnedBadges;
  const topBadgeIds = earnedBadges.slice(-3).map(b => b.badgeId).reverse();
  const equippedTitle = useTitleStore.getState().equippedTitleId || '';

  const update = {
    displayName,
    inviteCode,
    level,
    xp: adjustedXP,
    bestStreak,
    equippedTitle,
    topBadgeIds,
    updatedAt: serverTimestamp(),
  };

  await Promise.all([
    setDoc(doc(db, 'users', user.uid), update, { merge: true }),
    setDoc(doc(db, 'leaderboard', user.uid), { ...update, uid: user.uid }, { merge: true }),
  ]);
}
