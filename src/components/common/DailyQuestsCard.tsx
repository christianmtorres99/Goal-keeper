import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
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

  const [expanded, setExpanded] = useState(true);
  const allDone = quests.every(q => q.completed);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="list-outline" size={16} color={Colors.accentBright} />
          <Text style={styles.headerTitle}>Daily Quests</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerXP}>
            {totalEarned}/{totalAvailable} XP
          </Text>
          <TouchableOpacity onPress={() => setExpanded(e => !e)} hitSlop={12}>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {expanded && allDone && (
        <View style={styles.allDoneBanner}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={styles.allDoneText}>All quests complete! Come back tomorrow.</Text>
        </View>
      )}

      {expanded && quests.map(quest => (
        <QuestRow key={quest.id} quest={quest} />
      ))}
    </View>
  );
}

const QuestRow = React.memo(function QuestRow({ quest }: { quest: Quest }) {
  const progress = Math.min(quest.progress / quest.target, 1);
  const icon = QUEST_ICONS[quest.type] ?? 'star-outline';

  return (
    <View style={[styles.questRow, quest.completed && styles.questRowDone]}>
      <View style={[styles.questIcon, quest.completed && styles.questIconDone]}>
        <Ionicons
          name={quest.completed ? 'checkmark' : (icon as any)}
          size={16}
          color={quest.completed ? Colors.success : Colors.accentBright}
        />
      </View>
      <View style={styles.questBody}>
        <View style={styles.questTopRow}>
          <Text style={[styles.questDesc, quest.completed && styles.questDescDone]} numberOfLines={1}>
            {quest.description}
          </Text>
          <Text style={[styles.questXP, quest.completed && styles.questXPDone]}>
            +{quest.xpReward} XP
          </Text>
        </View>
        {!quest.completed && quest.target > 1 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            <Text style={styles.progressLabel}>{quest.progress}/{quest.target}</Text>
          </View>
        )}
        {!quest.completed && quest.target === 1 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerXP: {
    color: Colors.accentBright,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  allDoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success + '18',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  allDoneText: {
    color: Colors.success,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  questRowDone: {
    borderColor: Colors.success + '44',
    backgroundColor: Colors.success + '0A',
  },
  questIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  questIconDone: {
    backgroundColor: Colors.success + '22',
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
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  questDescDone: {
    color: Colors.textDisabled,
  },
  questXP: {
    color: Colors.accentBright,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  questXPDone: {
    color: Colors.success,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.bg3,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accentBright,
    borderRadius: 2,
  },
  progressLabel: {
    position: 'absolute',
    right: 0,
    top: -12,
    color: Colors.textDisabled,
    fontSize: 9,
  },
});
