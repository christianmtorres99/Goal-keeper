import type { WeeklyChallengeDefinition } from '../types';

export interface WeeklySet {
  variant: number;
  challenges: WeeklyChallengeDefinition[];
}

export const WEEKLY_SETS: WeeklySet[] = [
  {
    variant: 0,
    challenges: [
      { id: 'w0_c1', type: 'log_days',     target: 5, label: 'Log on 5 different days this week' },
      { id: 'w0_c2', type: 'streak_reach', target: 7, label: 'Reach a 7-day streak on any goal' },
      { id: 'w0_c3', type: 'log_total',    target: 8, label: 'Log any goal 8 times this week' },
    ],
  },
  {
    variant: 1,
    challenges: [
      { id: 'w1_c1', type: 'log_days',      target: 6,  label: 'Log on 6 different days this week' },
      { id: 'w1_c2', type: 'category_logs', target: 5,  label: 'Log a physical goal 5 times', category: 'physical' },
      { id: 'w1_c3', type: 'streak_reach',  target: 14, label: 'Reach a 14-day streak on any goal' },
    ],
  },
  {
    variant: 2,
    challenges: [
      { id: 'w2_c1', type: 'log_total',     target: 10, label: 'Log any goal 10 times this week' },
      { id: 'w2_c2', type: 'category_logs', target: 4,  label: 'Log a learning goal 4 times', category: 'learning' },
      { id: 'w2_c3', type: 'log_days',      target: 7,  label: 'Log every day this week' },
    ],
  },
  {
    variant: 3,
    challenges: [
      { id: 'w3_c1', type: 'log_days',      target: 5, label: 'Log on 5 different days this week' },
      { id: 'w3_c2', type: 'category_logs', target: 4, label: 'Log a wellness goal 4 times', category: 'wellness' },
      { id: 'w3_c3', type: 'quit_checkin',  target: 5, label: 'Check in on a quit goal 5 times' },
    ],
  },
];

export function getWeeklySet(isoWeekNumber: number): WeeklySet {
  return WEEKLY_SETS[isoWeekNumber % WEEKLY_SETS.length];
}
