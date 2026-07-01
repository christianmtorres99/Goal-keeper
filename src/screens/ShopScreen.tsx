import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GameIcon from '../components/common/GameIcon';

import { FontFamily, FontSize, hexAlpha, Radius, Spacing, TextStyle } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import { usePerkStore } from '../store/perkStore';
import type { ActiveBuff } from '../store/perkStore';
import { useCoinStore, COIN_CAP } from '../store/coinStore';
import { PERK_DEFINITIONS, getWeeklyBuffs } from '../constants/perks';
import type { BuffDefinition } from '../constants/perks';
import type { PerkDefinitioninition } from '../types';
import { getISOWeekNumber, todayString } from '../utils/dateUtils';

const MAX_EQUIPPED = 2;

// ── Countdown to next Monday ─────────────────────────────────────────────────

function getNextMondayMs(): number {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon ...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilMonday);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0h 0m';
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${mins}m`;
}

function daysRemaining(expiresAt: number): number {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000));
}

// ── Buff Card ─────────────────────────────────────────────────────────────────

interface BuffCardProps {
  buff: BuffDefinition;
  activeBuff: ActiveBuff | undefined;
  canAfford: boolean;
  onBuy: () => void;
}

function BuffCard({ buff, activeBuff, canAfford, onBuy }: BuffCardProps) {
  const { colors: Colors } = useColors();
  const isActive = !!activeBuff;

  const borderColor = isActive ? Colors.success : Colors.border;
  const bgColor = isActive ? hexAlpha(Colors.success, 0.08) : Colors.bg2;

  return (
    <TouchableOpacity
      style={[styles.perkCard, { backgroundColor: bgColor, borderColor }]}
      onPress={isActive ? undefined : onBuy}
      activeOpacity={isActive ? 1 : 0.75}
    >
      <View style={[styles.perkIconWrap, { backgroundColor: hexAlpha(Colors.warning, 0.15) }]}>
        <Ionicons name={buff.icon as any} size={24} color={Colors.warning} />
      </View>

      <View style={styles.perkBody}>
        <View style={styles.perkTitleRow}>
          <Text style={[styles.perkName, { color: Colors.textPrimary }]}>{buff.name}</Text>
          {isActive ? (
            <View style={[styles.statusBadge, { backgroundColor: hexAlpha(Colors.success, 0.2) }]}>
              <Text style={[styles.statusBadgeText, { color: Colors.success }]}>
                {daysRemaining(activeBuff!.expiresAt)}d left
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.costBadge,
                { backgroundColor: canAfford ? hexAlpha(Colors.warning, 0.15) : hexAlpha(Colors.textDisabled, 0.1) },
              ]}
            >
              <GameIcon type="coin" size={12} />
              <Text style={[styles.costText, { color: canAfford ? Colors.warning : Colors.textDisabled }]}>
                {buff.cost}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.perkDesc, { color: Colors.textSecondary }]}>{buff.description}</Text>
        {!isActive && (
          <Text style={[styles.durationLabel, { color: Colors.textDisabled }]}>
            Duration: {buff.durationDays} {buff.durationDays === 1 ? 'day' : 'days'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Perk Card ─────────────────────────────────────────────────────────────────

interface PerkCardProps {
  perk: PerkDefinition;
  owned: boolean;
  equipped: boolean;
  canAfford: boolean;
  onPress: () => void;
}

function PerkCard({ perk, owned, equipped, canAfford, onPress }: PerkCardProps) {
  const { colors: Colors } = useColors();

  const borderColor = equipped
    ? Colors.accentBright
    : owned
    ? hexAlpha(Colors.success, 0.5)
    : Colors.border;

  const bgColor = equipped
    ? hexAlpha(Colors.accentBright, 0.08)
    : Colors.bg2;

  return (
    <TouchableOpacity
      style={[styles.perkCard, { backgroundColor: bgColor, borderColor }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.perkIconWrap, { backgroundColor: hexAlpha(Colors.accentBright, 0.13) }]}>
        <Ionicons name={perk.icon as any} size={24} color={Colors.accentBright} />
      </View>

      <View style={styles.perkBody}>
        <View style={styles.perkTitleRow}>
          <Text style={[styles.perkName, { color: Colors.textPrimary }]}>{perk.name}</Text>
          {equipped && (
            <View style={[styles.statusBadge, { backgroundColor: hexAlpha(Colors.accentBright, 0.2) }]}>
              <Text style={[styles.statusBadgeText, { color: Colors.accentBright }]}>Equipped</Text>
            </View>
          )}
          {owned && !equipped && (
            <View style={[styles.statusBadge, { backgroundColor: hexAlpha(Colors.success, 0.2) }]}>
              <Text style={[styles.statusBadgeText, { color: Colors.success }]}>Owned</Text>
            </View>
          )}
          {!owned && (
            <View
              style={[
                styles.costBadge,
                {
                  backgroundColor: canAfford
                    ? hexAlpha(Colors.warning, 0.15)
                    : hexAlpha(Colors.textDisabled, 0.1),
                },
              ]}
            >
              <GameIcon type="coin" size={12} />
              <Text
                style={[
                  styles.costText,
                  { color: canAfford ? Colors.warning : Colors.textDisabled },
                ]}
              >
                {perk.cost}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.perkDesc, { color: Colors.textSecondary }]}>{perk.description}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Equipped Slot ─────────────────────────────────────────────────────────────

interface EquippedSlotProps {
  perk: PerkDefinition | null;
  slotIndex: number;
  onUnequip: () => void;
}

function EquippedSlot({ perk, slotIndex, onUnequip }: EquippedSlotProps) {
  const { colors: Colors } = useColors();

  if (!perk) {
    return (
      <View
        style={[
          styles.emptySlot,
          { borderColor: Colors.border, backgroundColor: Colors.bg2 },
        ]}
      >
        <Ionicons name="add-outline" size={22} color={Colors.textDisabled} />
        <Text style={[styles.emptySlotLabel, { color: Colors.textDisabled }]}>
          Slot {slotIndex + 1} empty
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.equippedSlot,
        {
          backgroundColor: hexAlpha(Colors.accentBright, 0.08),
          borderColor: Colors.accentBright,
        },
      ]}
      onPress={onUnequip}
      activeOpacity={0.75}
    >
      <Ionicons name={perk.icon as any} size={20} color={Colors.accentBright} />
      <Text style={[styles.equippedSlotName, { color: Colors.textPrimary }]} numberOfLines={1}>
        {perk.name}
      </Text>
      <Ionicons name="close-circle-outline" size={16} color={Colors.textSecondary} />
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const { colors: Colors } = useColors();
  const { balance, spendCoins } = useCoinStore();
  const { ownedPerkIds, equippedPerkIds, addPerk, equipPerk, unequipPerk, activateBuff, getActiveBuff } = usePerkStore();

  const [countdown, setCountdown] = useState(() => getNextMondayMs());

  useEffect(() => {
    const interval = setInterval(() => setCountdown(getNextMondayMs()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const weekSeed = getISOWeekNumber(todayString());
  const weeklyBuffs = getWeeklyBuffs(weekSeed);

  const ownedPerks = PERK_DEFINITIONS.filter(p => ownedPerkIds.includes(p.id));
  const equippedPerks = PERK_DEFINITIONS.filter(p => equippedPerkIds.includes(p.id));
  const ownedNotEquipped = ownedPerks.filter(p => !equippedPerkIds.includes(p.id));
  const availablePerks = PERK_DEFINITIONS.filter(p => !ownedPerkIds.includes(p.id));

  const equippedSlots: (PerkDefinition | null)[] = [
    equippedPerks[0] ?? null,
    equippedPerks[1] ?? null,
  ];

  const handleEquip = (perk: PerkDefinition) => {
    if (equippedPerkIds.includes(perk.id)) {
      unequipPerk(perk.id);
    } else {
      if (equippedPerkIds.length >= MAX_EQUIPPED) {
        Alert.alert('Slots Full', 'Unequip a perk first to make room.', [{ text: 'OK' }]);
        return;
      }
      equipPerk(perk.id);
    }
  };

  const handleBuy = (perk: PerkDefinition) => {
    if (balance < perk.cost) {
      Alert.alert('Not Enough Coins', `You need ${perk.cost} coins to buy ${perk.name}.`);
      return;
    }
    Alert.alert(
      'Purchase?',
      `Cost: ${perk.cost} coins\n\n${perk.name}: ${perk.description}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            const ok = await spendCoins(perk.cost);
            if (ok) await addPerk(perk.id);
            else Alert.alert('Not Enough Coins', 'Purchase failed — insufficient balance.');
          },
        },
      ],
    );
  };

  const handleBuyBuff = (buff: BuffDefinition) => {
    const existing = getActiveBuff(buff.buffType);
    if (existing) {
      Alert.alert('Already Active', `You already have an active ${buff.name} buff.`);
      return;
    }
    if (balance < buff.cost) {
      Alert.alert('Not Enough Coins', `You need ${buff.cost} coins to buy ${buff.name}.`);
      return;
    }
    Alert.alert(
      'Purchase Buff?',
      `Cost: ${buff.cost} coins\n\n${buff.name}: ${buff.description}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            const ok = await spendCoins(buff.cost);
            if (!ok) {
              Alert.alert('Not Enough Coins', 'Purchase failed — insufficient balance.');
              return;
            }
            const now = Date.now();
            const newBuff: ActiveBuff = {
              id: buff.id,
              type: buff.buffType,
              multiplier: buff.multiplier,
              expiresAt: now + buff.durationDays * 86400000,
              purchasedAt: now,
            };
            await activateBuff(newBuff);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Spacing.xxl + 80 }]}>

        {/* ── Balance header ── */}
        <View style={[styles.balanceCard, { backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
          <GameIcon type="coin" size={32} />
          <Text style={[styles.balanceAmount, { color: Colors.textPrimary }]}>
            {balance}
          </Text>
          <Text style={[styles.balanceLabel, { color: Colors.textSecondary }]}>/ {COIN_CAP} coins</Text>
        </View>

        {/* ── Weekly Buffs ── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: Colors.warning }]} />
          <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Weekly Buffs</Text>
          <View style={styles.countdownChip}>
            <Ionicons name="time-outline" size={12} color={Colors.textDisabled} />
            <Text style={[styles.countdownText, { color: Colors.textDisabled }]}>
              Resets in {formatCountdown(countdown)}
            </Text>
          </View>
        </View>
        {weeklyBuffs.map(buff => (
          <BuffCard
            key={buff.id}
            buff={buff}
            activeBuff={getActiveBuff(buff.buffType)}
            canAfford={balance >= buff.cost}
            onBuy={() => handleBuyBuff(buff)}
          />
        ))}

        {/* ── Equipped slots ── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: Colors.accentBright }]} />
          <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Equipped</Text>
        </View>
        <View style={styles.equippedRow}>
          {equippedSlots.map((perk, i) => (
            <View key={i} style={styles.equippedSlotWrap}>
              <EquippedSlot
                perk={perk}
                slotIndex={i}
                onUnequip={() => perk && unequipPerk(perk.id)}
              />
            </View>
          ))}
        </View>

        {/* ── Owned (not equipped) ── */}
        {ownedNotEquipped.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBar, { backgroundColor: Colors.success }]} />
              <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>My Perks</Text>
            </View>
            {ownedNotEquipped.map(perk => (
              <PerkCard
                key={perk.id}
                perk={perk}
                owned
                equipped={false}
                canAfford={false}
                onPress={() => handleEquip(perk)}
              />
            ))}
          </>
        )}

        {/* ── Available (not owned) ── */}
        {availablePerks.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBar, { backgroundColor: Colors.accentBright }]} />
              <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Perks</Text>
            </View>
            {availablePerks.map(perk => (
              <PerkCard
                key={perk.id}
                perk={perk}
                owned={false}
                equipped={false}
                canAfford={balance >= perk.cost}
                onPress={() => handleBuy(perk)}
              />
            ))}
          </>
        )}

        <View style={{ height: Spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  // Balance header
  balanceCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  balanceAmount: { fontSize: FontSize.xxxl, fontFamily: FontFamily.extraBold },
  balanceLabel: { fontSize: FontSize.lg, fontFamily: FontFamily.regular, alignSelf: 'flex-end', paddingBottom: 4 },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionBar: { width: 3, height: 16, borderRadius: Radius.full },

  // Countdown
  countdownChip: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  countdownText: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },

  // Equipped slots
  equippedRow: { flexDirection: 'row', gap: Spacing.sm },
  equippedSlotWrap: { flex: 1 },
  emptySlot: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 80,
  },
  emptySlotLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  equippedSlot: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 80,
  },
  equippedSlotName: { flex: 1, fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },

  // Perk / Buff cards
  perkCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  perkIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkBody: { flex: 1, gap: Spacing.xs },
  perkTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  perkName: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  statusBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  statusBadgeText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  costText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold },
  perkDesc: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  durationLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
});
