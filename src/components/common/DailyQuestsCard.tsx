import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';
import type { Quest } from '../../types';

interface Props {
  quests: Quest[];
  onQuestPress?: (quest: Quest) => void;
  totalEarned: number;
  totalAvailable: number;
}

const QUEST_ICONS: Record<Quest['type'], string> = {
  log_any: 'checkmark-circle-outline',
  log_all: 'trophy-outline',
  use_note: 'create-outline',
  early_log: 'sunny-outline',
  log_specific: 'flag-outline',
  log_count: 'flash-outline',
};

export default function DailyQuestsCard({ quests, totalEarned, totalAvailable }: Props) {
  if (quests.length === 0) return null;

  const { colors: Colors } = useColors();
  const [expanded, setExpanded] = useState(true);
  const allDone = quests.every(q => q.completed);

  return (
    <View style={[styles.card, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Ionicons name="list-outline" size={16} color={Colors.accentBright} />
          <Text style={[styles.headerTitle, { color: Colors.textPrimary }]}>Daily Quests</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.headerXP, { color: Colors.accentBright }]}>
            {totalEarned}/{totalAvailable} XP
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {expanded && allDone && (
        <View style={[styles.allDoneBanner, { backgroundColor: Colors.success + '18' }]}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={[styles.allDoneText, { color: Colors.success }]}>All quests complete! Come back tomorrow.</Text>
        </View>
      )}

      {expanded && quests.map(quest => (
        <QuestRow key={quest.id} quest={quest} />
      ))}
    </View>
  );
}

const QuestRow = React.memo(function QuestRow({ quest }: { quest: Quest }) {
  const { colors: Colors } = useColors();
  const progress = Math.min(quest.progress / quest.target, 1);
  const icon = QUEST_ICONS[quest.type] ?? 'star-outline';

  return (
    <View style={[
      styles.questRow,
      { backgroundColor: Colors.bg2, borderColor: Colors.border },
      quest.completed && { borderColor: Colors.success + '44', backgroundColor: Colors.success + '0A' },
    ]}>
      <View style={[
        styles.questIcon,
        { backgroundColor: Colors.accentDim },
        quest.completed && { backgroundColor: Colors.success + '22' },
      ]}>
        <Ionicons
          name={quest.completed ? 'checkmark' : (icon as any)}
          size={16}
          color={quest.completed ? Colors.success : Colors.accentBright}
        />
      </View>
      <View style={styles.questBody}>
        <View style={styles.questTopRow}>
          <Text style={[
            styles.questDesc,
            { color: Colors.textPrimary },
            quest.completed && { color: Colors.textDisabled },
          ]} numberOfLines={1}>
            {quest.description}
          </Text>
          <Text style={[
            styles.questXP,
            { color: Colors.accentBright },
            quest.completed && { color: Colors.success },
          ]}>
            +{quest.xpReward} XP
          </Text>
        </View>
        {!quest.completed && quest.target > 1 && (
          <View style={[styles.progressTrack, { backgroundColor: Colors.bg3 }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: Colors.accentBright }]} />
            <Text style={[styles.progressLabel, { color: Colors.textDisabled }]}>{quest.progress}/{quest.target}</Text>
          </View>
        )}
        {!quest.completed && quest.target === 1 && (
          <View style={[styles.progressTrack, { backgroundColor: Colors.bg3 }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: Colors.accentBright }]} />
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerXP: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  allDoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  allDoneText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
  },
  questIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  questBody: {
    flex: 1,
    gap: 5,
  },
  questTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  questDesc: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    flex: 1,
  },
  questXP: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    position: 'absolute',
    right: 0,
    top: -12,
    fontSize: 9,
    fontFamily: FontFamily.regular,
  },
});
