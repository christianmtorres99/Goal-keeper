import type { LogEvent } from '../store/logStore';

const STREAK_QUOTES: { minStreak: number; quotes: string[] }[] = [
  {
    minStreak: 0,
    quotes: [
      'Every expert was once a beginner.',
      'The journey of a thousand miles begins with one step.',
      'Starting is the hardest part — you\'ve got this.',
    ],
  },
  {
    minStreak: 1,
    quotes: [
      'Day 1 done. Day 2 is already easier.',
      'You showed up. That\'s 90% of it.',
      'Small steps, big changes over time.',
    ],
  },
  {
    minStreak: 3,
    quotes: [
      'Three days strong — keep the chain going.',
      'You\'re building something real.',
      'Consistency is the bridge between goals and results.',
    ],
  },
  {
    minStreak: 7,
    quotes: [
      'A full week! You\'re in the top 10% who actually show up.',
      'Seven days of winning. This is who you are now.',
      'One week down. It only gets easier from here.',
    ],
  },
  {
    minStreak: 14,
    quotes: [
      'Two weeks strong. The habit is starting to stick.',
      'This is becoming part of who you are.',
      'Halfway to the 21-day threshold. You\'re almost there.',
    ],
  },
  {
    minStreak: 21,
    quotes: [
      '21 days — research says the habit is forged.',
      'Three weeks. This is your new normal.',
      'The habit is real. Now it works for you automatically.',
    ],
  },
  {
    minStreak: 30,
    quotes: [
      '30 days. You\'ve built what most people only dream about.',
      'A month of showing up. The compound effect is working.',
      'You\'re in rare company. Keep going.',
    ],
  },
];

export function getMotivationalQuote(streak: number): string {
  const tier = [...STREAK_QUOTES].reverse().find(t => streak >= t.minStreak)!;
  // Rotate by day so it changes daily but feels consistent
  const idx = new Date().getDate() % tier.quotes.length;
  return tier.quotes[idx];
}

export function getEventTitle(events: LogEvent[], badgeCount: number): string {
  if (events.includes('perfectMonth')) return 'Perfect Month';
  if (events.includes('perfectWeek')) return 'Perfect Week';
  if (events.includes('newBest')) return 'New Personal Best';
  if (events.includes('comeback')) return 'Welcome Back';
  if (events.includes('firstLog')) return 'First Step';
  if (badgeCount > 1) return `${badgeCount} Badges Unlocked`;
  if (badgeCount === 1) return 'Badge Unlocked';
  return 'Bonus XP';
}

export function getEventSubtitle(events: LogEvent[]): string | null {
  if (events.includes('perfectMonth')) return 'You logged every single day this month. That\'s elite dedication.';
  if (events.includes('perfectWeek')) return 'Seven days straight. You showed up every single day this week.';
  if (events.includes('newBest')) return 'You just broke your personal record. Every streak from here is history.';
  if (events.includes('comeback')) return 'Missing a day doesn\'t define you. Coming back does.';
  if (events.includes('firstLog')) return 'Every legend starts exactly here. This is your day one.';
  return null;
}

export function getUndoToastMessage(goalName: string, totalXP: number, events: LogEvent[]): string {
  const xpStr = `+${totalXP} XP`;
  if (events.includes('perfectWeek')) return `Perfect Week — ${xpStr}`;
  if (events.includes('perfectMonth')) return `Perfect Month — ${xpStr}`;
  if (events.includes('newBest')) return `New record — ${xpStr}`;
  if (events.includes('comeback')) return `Welcome back — ${xpStr}`;
  if (events.includes('firstLog')) return `First log — ${xpStr}`;
  return `Logged "${goalName}" ${xpStr}`;
}

// Returns next streak badge info if within striking distance
export function getNextStreakBadge(currentStreak: number): { name: string; daysLeft: number } | null {
  const milestones = [
    { threshold: 3, name: 'Getting Serious' },
    { threshold: 7, name: 'Week Warrior' },
    { threshold: 14, name: 'Two Week Titan' },
    { threshold: 21, name: 'Habit Forged' },
    { threshold: 30, name: 'Month Master' },
    { threshold: 60, name: 'Iron Will' },
    { threshold: 90, name: 'Quarter Legend' },
    { threshold: 180, name: 'Half Year Hero' },
    { threshold: 365, name: 'Year God' },
  ];
  const next = milestones.find(m => m.threshold > currentStreak);
  if (!next) return null;
  const daysLeft = next.threshold - currentStreak;
  if (daysLeft > 5) return null;
  return { name: next.name, daysLeft };
}

// Returns next log-count badge info if within striking distance
export function getNextLogBadge(totalLogs: number): { name: string; logsLeft: number } | null {
  const milestones = [
    { threshold: 5, name: 'Early Bird' },
    { threshold: 10, name: 'Getting Started' },
    { threshold: 25, name: 'Building Momentum' },
    { threshold: 50, name: 'Committed' },
    { threshold: 100, name: 'Dedicated' },
    { threshold: 250, name: 'Relentless' },
    { threshold: 500, name: 'Legendary' },
  ];
  const next = milestones.find(m => m.threshold > totalLogs);
  if (!next) return null;
  const logsLeft = next.threshold - totalLogs;
  if (logsLeft > 5) return null;
  return { name: next.name, logsLeft };
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Up late?';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Afternoon check-in';
  if (hour < 21) return 'Evening check-in';
  return 'Night owl mode';
}
