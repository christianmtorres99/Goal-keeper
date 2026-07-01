import type { PerkDefinition } from '../types';
import type { ActiveBuff } from '../store/perkStore';

export interface BuffDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  durationDays: number;
  buffType: ActiveBuff['type'];
  multiplier?: number;
}

export const BUFF_CATALOG: BuffDefinition[] = [
  { id: 'xp_boost_7d',       name: 'XP Surge',        description: '+25% XP from all goal logs for 7 days.',       icon: 'flash-outline',        cost: 200, durationDays: 7,  buffType: 'xp_boost',     multiplier: 1.25 },
  { id: 'streak_shield_7d',  name: 'Streak Shield',   description: 'Extra grace day preserved for 7 days.',        icon: 'shield-outline',       cost: 150, durationDays: 7,  buffType: 'streak_shield' },
  { id: 'coin_magnet_3d',    name: 'Coin Magnet',     description: '2× coins from all goal logs for 3 days.',     icon: 'cash-outline',         cost: 100, durationDays: 3,  buffType: 'coin_magnet',  multiplier: 2 },
  { id: 'xp_boost_14d',      name: 'Scholar\'s Boon', description: '+15% XP from all goal logs for 14 days.',     icon: 'book-outline',         cost: 250, durationDays: 14, buffType: 'xp_boost',     multiplier: 1.15 },
  { id: 'coin_magnet_7d',    name: 'Treasure Sense',  description: '1.5× coins from all goal logs for 7 days.',   icon: 'diamond-outline',      cost: 180, durationDays: 7,  buffType: 'coin_magnet',  multiplier: 1.5 },
  { id: 'streak_shield_14d', name: 'Iron Covenant',   description: 'Extra grace day preserved for 14 days.',      icon: 'shield-checkmark-outline', cost: 220, durationDays: 14, buffType: 'streak_shield' },
];

export function getWeeklyBuffs(weekSeed: number): BuffDefinition[] {
  const len = BUFF_CATALOG.length;
  const start = (weekSeed * 3) % len;
  return [0, 1, 2].map(i => BUFF_CATALOG[(start + i) % len]);
}

export const PERK_DEFINITIONS: PerkDefinition[] = [
  // XP perks
  { id: 'lucky_charm',   name: 'Lucky Charm',      description: 'Lucky Drop chance increases from 15% to 25%.',         icon: 'sparkles-outline',   cost: 80,  category: 'xp' },
  { id: 'scholars_mark', name: "Scholar's Mark",   description: 'All goal log XP is increased by 15%.',                 icon: 'book-outline',       cost: 120, category: 'xp' },
  // Streak perks
  { id: 'iron_will',     name: 'Iron Will',         description: 'Grace day refills every 7 days instead of 14.',        icon: 'shield-outline',     cost: 100, category: 'streak' },
  { id: 'momentum',      name: 'Momentum Shield',   description: 'Grace day activates at 5-day streak instead of 7.',   icon: 'shield-checkmark-outline', cost: 180, category: 'streak' },
  // Quest perks
  { id: 'quest_master',  name: 'Quest Master',      description: 'XP reward from daily quests increased by 25%.',       icon: 'list-outline',       cost: 90,  category: 'quest' },
  { id: 'bonus_quest',   name: 'Bonus Scroll',      description: 'Unlocks a 4th daily quest slot each day.',            icon: 'document-text-outline', cost: 200, category: 'quest' },
  // Coin perks
  { id: 'coin_magnet',   name: 'Coin Magnet',       description: 'Earn 50% more coins from goal logs.',                 icon: 'cash-outline',       cost: 60,  category: 'coins' },
  { id: 'raid_bounty',   name: 'Raid Bounty',       description: 'Earn +40 bonus coins when defeating any raid boss.',  icon: 'skull-outline',      cost: 140, category: 'coins' },
  { id: 'double_down',   name: 'Double Down',        description: 'Daily Double applies to 2 goals simultaneously.',     icon: 'flash-outline',      cost: 150, category: 'xp' },
];

export function getPerkDefinition(id: string): PerkDefinition | undefined {
  return PERK_DEFINITIONS.find(p => p.id === id);
}
