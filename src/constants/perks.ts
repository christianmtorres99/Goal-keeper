import type { PerkDefinition } from '../types';

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
