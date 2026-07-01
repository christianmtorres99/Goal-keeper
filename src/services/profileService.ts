import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, limit } from '@firebase/firestore';
import { db, auth } from './firebase';
import { useGameStore } from '../store/gameStore';
import { useLogStore } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { useTitleStore } from '../store/titleStore';
import { useTodoXPStore } from '../store/todoXPStore';
import { useGoalStore } from '../store/goalStore';
import { getPlayerStats, computeLeaderboardScore } from '../logic/xpEngine';
import { sumXP } from '../utils/xpUtils';
import { todayString, addDays, daysBetween, getWeekStart } from '../utils/dateUtils';
import type { Log } from '../types';

export interface PublicProfile {
  uid: string;
  displayName: string;
  inviteCode: string;
  level: number;
  xp: number;
  bestStreak: number;
  currentStreak: number;
  leaderboardScore: number;
  xpToday: number;
  xpThisWeek: number;
  xpThisMonth: number;
  equippedTitle: string;
  topBadgeIds: string[];
  updatedAt: unknown;
}

function computeOverallStreak(logs: Log[]): number {
  if (logs.length === 0) return 0;
  const uniqueDays = [...new Set(logs.map(l => l.logDate))].sort().reverse();
  const today = todayString();
  const yesterday = addDays(today, -1);
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;
  let streak = 1;
  let graceUsed = uniqueDays[0] !== today;
  for (let i = 1; i < uniqueDays.length; i++) {
    const gap = daysBetween(uniqueDays[i], uniqueDays[i - 1]);
    if (gap === 1) {
      streak++;
    } else if (gap === 2 && !graceUsed) {
      graceUsed = true;
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computePeriodXP(logs: Log[], fromDate: string): number {
  return logs.filter(l => l.logDate >= fromDate).reduce((s, l) => s + (l.xpAwarded || 0) + (l.bonusXP || 0), 0);
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

export async function checkDisplayNameAvailable(name: string): Promise<boolean> {
  const user = auth.currentUser;
  const q = query(
    collection(db, 'leaderboard'),
    where('displayName', '==', name),
    limit(1)
  );
  const snap = await getDocs(q);
  // Taken if a doc exists that belongs to someone else
  return snap.docs.every(d => d.id === user?.uid);
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

  const today = todayString();
  const weekStart = getWeekStart(today);
  const monthStart = `${today.slice(0, 7)}-01`;

  const currentStreak = computeOverallStreak(logs);
  const leaderboardScore = computeLeaderboardScore(adjustedXP, currentStreak);
  const xpToday = computePeriodXP(logs, today);
  const xpThisWeek = computePeriodXP(logs, weekStart);
  const xpThisMonth = computePeriodXP(logs, monthStart);

  const update = {
    displayName,
    inviteCode,
    level,
    xp: adjustedXP,
    bestStreak,
    currentStreak,
    leaderboardScore,
    xpToday,
    xpThisWeek,
    xpThisMonth,
    equippedTitle,
    topBadgeIds,
    updatedAt: serverTimestamp(),
  };

  const goals = useGoalStore.getState().goals;
  const publicGoalWrites = goals
    .filter(g => g.isPublic)
    .map(g => {
      const goalLogs = logs.filter(l => l.goalId === g.id);
      const logDates = [...new Set(goalLogs.map(l => l.logDate))].sort().reverse();
      let streak = 0;
      if (logDates.length > 0 && (logDates[0] === today || logDates[0] === addDays(today, -1))) {
        streak = 1;
        for (let i = 1; i < logDates.length; i++) {
          const gap = daysBetween(logDates[i], logDates[i - 1]);
          if (gap === 1) { streak++; } else { break; }
        }
      }
      return setDoc(doc(db, 'users', user.uid, 'publicGoals', g.id), {
        name: g.name,
        type: g.type,
        color: g.color,
        icon: g.icon,
        currentStreak: streak,
        totalLogs: goalLogs.length,
        updatedAt: serverTimestamp(),
      });
    });

  await Promise.all([
    setDoc(doc(db, 'users', user.uid), update, { merge: true }),
    setDoc(doc(db, 'leaderboard', user.uid), { ...update, uid: user.uid }, { merge: true }),
    ...publicGoalWrites,
  ]);
}
