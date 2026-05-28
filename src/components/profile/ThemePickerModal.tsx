import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { THEMES, THEME_META, type ThemeName } from '../../constants/themes';
import { Colors, Radius, Spacing, FontSize } from '../../constants/theme';

type ColorMode = 'dark' | 'light' | 'system';

// Use static Colors for the modal shell (always dark-themed base)
// Theme color cards show their own palette as previews

export default function ThemePickerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { activeTheme, setTheme, colorMode, setColorMode } = useThemeStore();

  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => { translateY.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 800) {
        runOnJS(onClose)();
        translateY.value = 0;
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (!visible) translateY.value = 0;
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <View style={styles.handle} />
            <Text style={styles.title}>App Theme</Text>

            {/* Display Mode selector */}
            <View style={styles.modeRow}>
              {(['dark', 'light', 'system'] as const).map((m: ColorMode) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeBtn, colorMode === m && styles.modeBtnActive]}
                  onPress={() => setColorMode(m)}
                >
                  <Ionicons
                    name={m === 'dark' ? 'moon' : m === 'light' ? 'sunny' : 'phone-portrait'}
                    size={16}
                    color={colorMode === m ? Colors.accent : Colors.textSecondary}
                  />
                  <Text style={[styles.modeBtnText, colorMode === m && { color: Colors.accent }]}>
                    {m === 'dark' ? 'Dark' : m === 'light' ? 'Light' : 'System'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
          </Animated.View>
        </GestureDetector>
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
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
  },
  modeBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.bg3,
  },
  modeBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
