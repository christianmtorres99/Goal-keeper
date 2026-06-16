import React from 'react';
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
import { useCoinStore } from '../store/coinStore';
import { PERK_DEFINITIONS } from '../constants/perks';
import type { PerkDefinition } from '../types';

const MAX_EQUIPPED = 2;

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
  const { ownedPerkIds, equippedPerkIds, addPerk, equipPerk, unequipPerk } = usePerkStore();

  const ownedPerks = PERK_DEFINITIONS.filter(p => ownedPerkIds.includes(p.id));
  const equippedPerks = PERK_DEFINITIONS.filter(p => equippedPerkIds.includes(p.id));
  const ownedNotEquipped = ownedPerks.filter(p => !equippedPerkIds.includes(p.id));
  const availablePerks = PERK_DEFINITIONS.filter(p => !ownedPerkIds.includes(p.id));

  // Build equipped slots array (always 2 slots)
  const equippedSlots: (PerkDefinition | null)[] = [
    equippedPerks[0] ?? null,
    equippedPerks[1] ?? null,
  ];

  const handleEquip = (perk: PerkDefinition) => {
    if (equippedPerkIds.includes(perk.id)) {
      // Already equipped — unequip
      unequipPerk(perk.id);
    } else {
      if (equippedPerkIds.length >= MAX_EQUIPPED) {
        Alert.alert(
          'Slots Full',
          'Unequip a perk first to make room.',
          [{ text: 'OK' }],
        );
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
            if (ok) {
              await addPerk(perk.id);
            } else {
              Alert.alert('Not Enough Coins', 'Purchase failed — insufficient balance.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg1 }]}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Balance header ── */}
        <View style={[styles.balanceCard, { backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
          <GameIcon type="coin" size={32} />
          <Text style={[styles.balanceAmount, { color: Colors.textPrimary }]}>
            {balance}
          </Text>
          <Text style={[styles.balanceLabel, { color: Colors.textSecondary }]}>coins</Text>
        </View>

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
              <View style={[styles.sectionBar, { backgroundColor: Colors.warning }]} />
              <Text style={[TextStyle.label, { color: Colors.textSecondary }]}>Available</Text>
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
  balanceEmoji: { fontSize: 32 },
  balanceAmount: { fontSize: FontSize.xxxl, fontFamily: FontFamily.extraBold },
  balanceLabel: { fontSize: FontSize.lg, fontFamily: FontFamily.regular, alignSelf: 'flex-end', paddingBottom: 4 },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionBar: { width: 3, height: 16, borderRadius: Radius.full },

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

  // Perk cards
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
  costEmoji: { fontSize: 11 },
  costText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold },
  perkDesc: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
});
