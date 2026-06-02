import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Radius, Spacing } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';
import type { MoodSuggestion } from '../../utils/moodSuggestions';

interface Props {
  suggestion: MoodSuggestion;
  onDismiss: () => void;
  onOpenJournal: () => void;
}

export default function MoodSuggestionCard({ suggestion, onDismiss, onOpenJournal }: Props) {
  const { colors: Colors } = useColors();
  const isHigh = suggestion.severity === 'high';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: Colors.bg2, borderColor: isHigh ? Colors.danger + '55' : Colors.warning + '55' },
      ]}
      onPress={onOpenJournal}
      activeOpacity={0.85}
    >
      <View style={[styles.iconWrap, { backgroundColor: Colors.bg3 }]}>
        <Ionicons name="heart-outline" size={18} color={isHigh ? Colors.danger : Colors.warning} />
      </View>
      <Text style={[styles.message, { color: Colors.textSecondary }]} numberOfLines={3}>{suggestion.message}</Text>
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
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  dismissBtn: {
    padding: Spacing.xs,
  },
});
