import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import type { MoodSuggestion } from '../../utils/moodSuggestions';

interface Props {
  suggestion: MoodSuggestion;
  onDismiss: () => void;
  onOpenJournal: () => void;
}

export default function MoodSuggestionCard({ suggestion, onDismiss, onOpenJournal }: Props) {
  const isHigh = suggestion.severity === 'high';

  return (
    <TouchableOpacity style={[styles.card, isHigh && styles.cardHigh]} onPress={onOpenJournal} activeOpacity={0.85}>
      <View style={styles.iconWrap}>
        <Ionicons name="heart-outline" size={18} color={isHigh ? Colors.danger : Colors.warning} />
      </View>
      <Text style={styles.message} numberOfLines={3}>{suggestion.message}</Text>
      <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={16} color={Colors.textDisabled} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning + '55',
  },
  cardHigh: {
    borderColor: Colors.danger + '55',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  dismissBtn: {
    padding: 4,
  },
});
