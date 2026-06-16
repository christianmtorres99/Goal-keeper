import type { BossDefinition } from '../types';

export const BOSS_DEFINITIONS: BossDefinition[] = [
  {
    id: 'sloth_king',
    tier: 'normal',
    name: 'The Sloth King',
    icon: 'bed-outline',
    flavor: 'Comfort is his domain.',
    debuffType: 'xp_penalty',
    debuffMag: 0.80,
    debuffLabel: 'Lethargy Aura — Log XP −20% today',
  },
  {
    id: 'doubt_wraith',
    tier: 'normal',
    name: 'Doubt Wraith',
    icon: 'eye-off-outline',
    flavor: 'He feeds on hesitation.',
    debuffType: 'no_lucky_drop',
    debuffMag: 0,
    debuffLabel: "Doubt's Shadow — Lucky Drops disabled today",
  },
  {
    id: 'procrastin',
    tier: 'elite',
    name: 'Lord Procrastin',
    icon: 'time-outline',
    flavor: 'Tomorrow never comes.',
    debuffType: 'quest_penalty',
    debuffMag: 0.70,
    debuffLabel: 'Time Warp — Quest XP −30% today',
  },
  {
    id: 'dread_void',
    tier: 'normal',
    name: 'The Dread Void',
    icon: 'cloud-offline-outline',
    flavor: 'Emptiness given form.',
    debuffType: 'no_coins',
    debuffMag: 0,
    debuffLabel: "Void's Embrace — Coin drops disabled today",
  },
  {
    id: 'habit_wrecker',
    tier: 'normal',
    name: 'Habit Wrecker',
    icon: 'flash-off-outline',
    flavor: 'Breaks what you build.',
    debuffType: 'streak_cap',
    debuffMag: 1.30,
    debuffLabel: 'Habit Break — Streak multiplier capped at 1.3× today',
  },
  {
    id: 'entropy_lord',
    tier: 'legendary',
    name: 'Lord of Entropy',
    icon: 'infinite-outline',
    flavor: 'Disorder is inevitable.',
    debuffType: 'all_half',
    debuffMag: 0.50,
    debuffLabel: 'Entropy Field — All debuffs at half power today',
  },
];

export function getBossDefinition(id: string): BossDefinition | undefined {
  return BOSS_DEFINITIONS.find(b => b.id === id);
}

export function getBossAtIndex(index: number): BossDefinition {
  return BOSS_DEFINITIONS[index % BOSS_DEFINITIONS.length];
}
