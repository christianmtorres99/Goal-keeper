import { GRACE_DAY_MIN_STREAK, GRACE_DAY_REFILL_DAYS } from '../constants/xp';
import type { Log, StreakInfo } from '../types';
import { daysBetween, todayString, addDays } from '../utils/dateUtils';

export function computeStreak(logs: Log[]): StreakInfo {
  if (logs.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastLogDate: null, graceDayUsed: false, graceDayRefillDate: null };
  }

  const dates = [...new Set(logs.map(l => l.logDate))].sort();
  const today = todayString();
  const lastDate = dates[dates.length - 1];

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const gap = daysBetween(dates[i - 1], dates[i]);
    if (gap === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  const gapFromLast = daysBetween(lastDate, today);
  if (gapFromLast === 0 || gapFromLast === 1) {
    currentStreak = tempStreak;
  } else {
    currentStreak = 0;
  }

  return {
    currentStreak,
    longestStreak,
    lastLogDate: lastDate,
    graceDayUsed: false,
    graceDayRefillDate: null,
  };
}

export function computeStreakWithGrace(
  logs: Log[],
  graceDayUsed: boolean,
  graceDayRefillDate: string | null
): StreakInfo {
  if (logs.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastLogDate: null, graceDayUsed: false, graceDayRefillDate: null };
  }

  // Refill grace day if its refill date has passed (before using it)
  let newGraceDayUsed = graceDayUsed;
  let newGraceDayRefillDate = graceDayRefillDate;
  const today = todayString();
  if (newGraceDayUsed && newGraceDayRefillDate && today >= newGraceDayRefillDate) {
    newGraceDayUsed = false;
    newGraceDayRefillDate = null;
  }

  const dates = [...new Set(logs.map(l => l.logDate))].sort();
  const lastDate = dates[dates.length - 1];

  let tempStreak = 1;
  let longestStreak = 0;
  let graceConsumedInLoop = false;

  for (let i = 1; i < dates.length; i++) {
    const gap = daysBetween(dates[i - 1], dates[i]);
    if (gap === 1) {
      tempStreak++;
    } else if (gap === 2 && !newGraceDayUsed && !graceConsumedInLoop && tempStreak >= GRACE_DAY_MIN_STREAK) {
      // Grace day bridges a single missed day mid-streak
      graceConsumedInLoop = true;
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
      graceConsumedInLoop = false;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  const gapFromLast = daysBetween(lastDate, today);
  let currentStreak = 0;

  if (gapFromLast === 0 || gapFromLast === 1) {
    currentStreak = tempStreak;
    if (graceConsumedInLoop) {
      newGraceDayUsed = true;
      newGraceDayRefillDate = addDays(today, GRACE_DAY_REFILL_DAYS);
    }
  } else if (
    gapFromLast === 2 &&
    tempStreak >= GRACE_DAY_MIN_STREAK &&
    !newGraceDayUsed &&
    !graceConsumedInLoop
  ) {
    // Grace day bridges the gap between last log and today
    currentStreak = tempStreak;
    newGraceDayUsed = true;
    newGraceDayRefillDate = addDays(today, GRACE_DAY_REFILL_DAYS);
  } else {
    currentStreak = 0;
  }

  return {
    currentStreak,
    longestStreak,
    lastLogDate: lastDate,
    graceDayUsed: newGraceDayUsed,
    graceDayRefillDate: newGraceDayRefillDate,
  };
}

export function isAlreadyLoggedToday(logs: Log[]): boolean {
  const today = todayString();
  return logs.some(l => l.logDate === today);
}
