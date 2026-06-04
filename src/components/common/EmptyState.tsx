import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, Spacing } from '../../constants/theme';
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
      <Ionicons name={icon as any} size={44} color={Colors.textDisabled} />
      <View style={[styles.sep, { backgroundColor: Colors.border }]} />
      <Text style={[styles.title, { color: Colors.textSecondary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: Colors.textDisabled }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: Spacing.xl },
  sep: { width: 32, height: 1, marginTop: 4 },
  title: { fontSize: FontSize.lg, fontFamily: FontFamily.semiBold, textAlign: 'center' },
  subtitle: { fontSize: FontSize.md, fontFamily: FontFamily.regular, textAlign: 'center' },
});
