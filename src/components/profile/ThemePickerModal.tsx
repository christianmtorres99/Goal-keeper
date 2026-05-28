import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { THEMES, THEME_META, type ThemeName } from '../../constants/themes';
import { Colors, Radius, Spacing, FontSize } from '../../constants/theme';

// Use static Colors for the modal shell (always dark-themed base)
// Theme color cards show their own palette as previews

export default function ThemePickerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { activeTheme, setTheme } = useThemeStore();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>App Theme</Text>
          <View style={styles.grid}>
            {(Object.entries(THEME_META) as [ThemeName, { label: string; preview: string }][]).map(
              ([key, meta]) => {
                const isActive = activeTheme === key;
                const palette = THEMES[key];
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.card,
                      isActive && styles.cardActive,
                      { borderColor: isActive ? meta.preview : Colors.border },
                    ]}
                    onPress={() => {
                      setTheme(key);
                      onClose();
                    }}
                  >
                    <View style={[styles.preview, { backgroundColor: palette.bg1 }]}>
                      <View style={[styles.accentDot, { backgroundColor: meta.preview }]} />
                    </View>
                    <Text style={styles.label}>{meta.label}</Text>
                    {isActive && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={meta.preview}
                        style={styles.check}
                      />
                    )}
                  </TouchableOpacity>
                );
              },
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bg1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  card: {
    width: '30%',
    aspectRatio: 0.85,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: Spacing.xs,
  },
  cardActive: {
    borderWidth: 2,
  },
  preview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: FontSize.xs - 1,
    fontWeight: '600',
    textAlign: 'center',
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});
