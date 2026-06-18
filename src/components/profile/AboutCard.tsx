import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { Spacing, Radius, FontSize, FontFamily } from '../../constants/theme';
import { DEVELOPER_BIO, SUPPORT_URL, SUPPORT_MESSAGE, APP_VERSION } from '../../constants/about';

export default function AboutCard() {
  const { colors: Colors } = useColors();

  return (
    <View style={[styles.card, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
      {/* App name */}
      <Text style={[styles.appName, { color: Colors.textPrimary }]}>Goal Keeper</Text>

      {/* Bio */}
      <Text style={[styles.bio, { color: Colors.textSecondary }]}>{DEVELOPER_BIO}</Text>

      {/* Support button */}
      {SUPPORT_URL ? (
        <TouchableOpacity
          style={[styles.supportBtn, { backgroundColor: Colors.accent }]}
          onPress={() => Linking.openURL(SUPPORT_URL)}
          activeOpacity={0.8}
        >
          <Ionicons name="heart" size={16} color={Colors.textPrimary} />
          <Text style={[styles.supportText, { color: Colors.textPrimary }]}>{SUPPORT_MESSAGE}</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.supportBtn, { backgroundColor: Colors.bg2, borderColor: Colors.border, borderWidth: 1 }]}>
          <Ionicons name="heart-outline" size={16} color={Colors.textDisabled} />
          <Text style={[styles.supportText, { color: Colors.textDisabled }]}>{SUPPORT_MESSAGE}</Text>
        </View>
      )}

      {/* Version */}
      <Text style={[styles.version, { color: Colors.textDisabled }]}>v{APP_VERSION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  appName: {
    fontSize: FontSize.xxl,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
  },
  bio: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: FontSize.sm * 1.6,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  supportText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.semiBold,
  },
  version: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    marginTop: Spacing.xs,
  },
});
