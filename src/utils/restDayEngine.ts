import { todayString } from './dateUtils';

export function shouldShowRestDayPrompt(params: {
  currentStreak: number;
  bankedRestDays: number;
  activeRestDate: string | null;
  dismissCount: number;
}): boolean {
  const { currentStreak, bankedRestDays, activeRestDate } = params;
  const today = todayString();
  return currentStreak >= 7 && activeRestDate !== today && bankedRestDays > 0;
}
