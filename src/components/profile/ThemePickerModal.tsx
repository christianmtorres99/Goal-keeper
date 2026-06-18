import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { THEMES, LIGHT_THEMES, THEME_META, type ThemeName } from '../../constants/themes';
import { FontFamily, Radius, Spacing, FontSize, OVERLAY_DARK_MODE, OVERLAY_LIGHT_MODE } from '../../constants/theme';
import { Spring } from '../../constants/motion';
import { useColors } from '../../hooks/useColors';

type ColorMode = 'dark' | 'light' | 'system';
type Tab = 'theme' | 'share';

interface Props {
  visible: boolean;
  onClose: () => void;
  shareBgColor?: string;
  shareBgColors?: string[];
  shareBgGradients?: readonly (readonly [string, string])[];
  onShareBgChange?: (color: string) => void;
}

export default function ThemePickerModal({
  visible,
  onClose,
  shareBgColor,
  shareBgColors = [],
  shareBgGradients,
  onShareBgChange,
}: Props) {
  const { colors: Colors, isLight } = useColors();
  const { activeTheme, setTheme, colorMode, setColorMode } = useThemeStore();
  const [activeTab, setActiveTab] = useState<Tab>('theme');

  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => { translateY.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 800) {
        runOnJS(onClose)();
        translateY.value = 0;
      } else {
        translateY.value = withSpring(0, Spring.cinematic);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (!visible) {
      translateY.value = 0;
      setActiveTab('theme');
    }
  }, [visible]);

  const hasShareTab = shareBgColors.length > 0 && onShareBgChange;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={[styles.overlay, { backgroundColor: isLight ? OVERLAY_LIGHT_MODE : OVERLAY_DARK_MODE }]} activeOpacity={1} onPress={onClose}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, { backgroundColor: Colors.bg0 }, sheetStyle]}>
            <View style={[styles.handle, { backgroundColor: Colors.border }]} />
            <Text style={[styles.title, { color: Colors.textPrimary }]}>Appearance</Text>

            {/* Tab switcher */}
            {hasShareTab && (
              <View style={[styles.tabRow, { backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
                {(['theme', 'share'] as Tab[]).map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tabBtn, activeTab === tab && { backgroundColor: Colors.bg1, borderColor: Colors.border }]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text style={[styles.tabBtnText, { color: activeTab === tab ? Colors.textPrimary : Colors.textSecondary }]}>
                      {tab === 'theme' ? 'App Theme' : 'Share Card'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {activeTab === 'theme' ? (
              <>
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
                      const palette = isLight ? LIGHT_THEMES[key] : THEMES[key];
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
              </>
            ) : (
              <ScrollView contentContainerStyle={styles.shareTabContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.shareTabLabel, { color: Colors.textSecondary }]}>
                  Pick a background for your share card
                </Text>
                <View style={styles.swatchGrid}>
                  {(shareBgGradients ?? shareBgColors.map(c => [c, c] as const)).map((entry, i) => {
                    const [from, to] = Array.isArray(entry) ? entry : [entry, entry];
                    const isSelected = shareBgColor === from;
                    return (
                      <TouchableOpacity
                        key={`${from}_${to}_${i}`}
                        style={[
                          styles.swatch,
                          isSelected && styles.swatchSelected,
                          isSelected && { borderColor: Colors.textPrimary },
                        ]}
                        onPress={() => onShareBgChange!(from)}
                      >
                        <LinearGradient
                          colors={[from, to]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.swatchGradient}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
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
    fontFamily: FontFamily.bold,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
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
    fontFamily: FontFamily.semiBold,
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
    fontFamily: FontFamily.semiBold,
  },
  shareTabContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  shareTabLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  swatchGradient: {
    flex: 1,
  },
  swatchSelected: {
    transform: [{ scale: 1.2 }],
  },
});
