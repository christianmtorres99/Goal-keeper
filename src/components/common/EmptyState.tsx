import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Spacing } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon, title, subtitle }: Props) {
  const { colors: Colors } = useColors();

  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={56} color={Colors.textDisabled} />
      <Text style={[styles.title, { color: Colors.textSecondary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: Colors.textDisabled }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.xl },
  title: { fontSize: FontSize.lg, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: FontSize.md, textAlign: 'center' },
});
