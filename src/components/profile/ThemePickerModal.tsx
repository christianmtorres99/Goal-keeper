import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { THEMES, THEME_META, type ThemeName } from '../../constants/themes';
import { Radius, Spacing, FontSize, OVERLAY_DARK_MODE, OVERLAY_LIGHT_MODE } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';

type ColorMode = 'dark' | 'light' | 'system';

export default function ThemePickerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors: Colors, isLight } = useColors();
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
      <TouchableOpacity style={[styles.overlay, { backgroundColor: isLight ? OVERLAY_LIGHT_MODE : OVERLAY_DARK_MODE }]} activeOpacity={1} onPress={onClose}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, { backgroundColor: Colors.bg1 }, sheetStyle]}>
            <View style={[styles.handle, { backgroundColor: Colors.border }]} />
            <Text style={[styles.title, { color: Colors.textPrimary }]}>App Theme</Text>

            {/* Display Mode selector */}
            <View style={styles.modeRow}>
              {(['dark', 'light', 'system'] as const).map((m: ColorMode) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.modeBtn,
                    { borderColor: Colors.border, backgroundColor: Colors.bg2 },
                    colorMode === m && { borderColor: Colors.accent, backgroundColor: Colors.bg3 },
                  ]}
                  onPress={() => setColorMode(m)}
                >
                  <Ionicons
                    name={m === 'dark' ? 'moon' : m === 'light' ? 'sunny' : 'phone-portrait'}
                    size={16}
                    color={colorMode === m ? Colors.accent : Colors.textSecondary}
                  />
                  <Text style={[styles.modeBtnText, { color: colorMode === m ? Colors.accent : Colors.textSecondary }]}>
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
                        { borderColor: isActive ? meta.preview : Colors.border },
                      ]}
                      onPress={() => setTheme(key)}
                    >
                      <View style={[styles.preview, { backgroundColor: palette.bg1 }]}>
                        <View style={[styles.accentDot, { backgroundColor: meta.preview }]} />
                      </View>
                      <Text style={[styles.label, { color: Colors.textPrimary }]}>{meta.label}</Text>
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
    justifyContent: 'flex-end',
  },
  sheet: {
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
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  card: {
    width: '30%',
    aspectRatio: 0.85,
    borderRadius: Radius.lg,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: Spacing.xs,
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
  },
  modeBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
