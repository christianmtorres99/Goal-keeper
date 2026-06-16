import React from 'react';
import { Coin, Diamond, Star, Moon, Heart, Sword } from 'phosphor-react-native';
import { GameColors } from '../../constants/theme';

export type GameIconType = 'coin' | 'shard' | 'star' | 'moon' | 'heart' | 'weapon';

interface Props {
  type: GameIconType;
  size?: number;
  color?: string;
}

export default function GameIcon({ type, size = 16, color }: Props) {
  switch (type) {
    case 'coin':
      return <Coin size={size} color={color ?? GameColors.coinGold} weight="fill" />;
    case 'shard':
      return <Diamond size={size} color={color ?? GameColors.shardCyan} weight="fill" />;
    case 'star':
      return <Star size={size} color={color ?? GameColors.starGold} weight="fill" />;
    case 'moon':
      return <Moon size={size} color={color ?? '#8A94A8'} weight="fill" />;
    case 'heart':
      return <Heart size={size} color={color ?? '#E03A3A'} weight="fill" />;
    case 'weapon':
      return <Sword size={size} color={color ?? '#8A94A8'} weight="fill" />;
  }
}
