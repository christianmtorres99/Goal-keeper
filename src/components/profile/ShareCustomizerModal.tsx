import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, Radius, Spacing, OVERLAY_DARK_MODE, OVERLAY_LIGHT_MODE } from '../../constants/theme';
import { Spring } from '../../constants/motion';
import { useColors } from '../../hooks/useColors';
import ProfileShareCard from '../common/ProfileShareCard';
import AnimatedPressable from '../common/AnimatedPressable';
import type { PlayerStats, BadgeDefinition, Goal } from '../../types';
import type { SelectedFeature } from '../common/ProfileShareCard';

interface Props {
  visible: boolean;
  onClose: () => void;
  stats: PlayerStats;
  totalXP: number;
  features: SelectedFeature[];
  goals: Goal[];
  badgeDefs: BadgeDefinition[];
  bgColor: string;
  bgGradient: readonly [string, string];
  gradients: readonly (readonly [string, string])[];
  onBgChange: (color: string) => void;
  onShare: () => void;
}

export default function ShareCustomizerModal({
  visible, onClose, stats, totalXP, features, goals, badgeDefs, bgColor, bgGradient, gradients, onBgChange, onShare,
}: Props) {
  const { colors: Colors, isLight } = useColors();
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
    if (!visible) translateY.value = 0;
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: isLight ? OVERLAY_LIGHT_MODE : OVERLAY_DARK_MODE }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, { backgroundColor: Colors.bg0 }, sheetStyle]}>
            <View style={[styles.handle, { backgroundColor: Colors.border }]} />
            <Text style={[styles.title, { color: Colors.textPrimary }]}>Share Your Card</Text>

            {/* Live preview */}
            <View style={styles.previewWrap}>
              <ProfileShareCard
                inline
                stats={stats}
                totalXP={totalXP}
                features={features}
                bgColor={bgColor}
                bgGradient={bgGradient}
                goals={goals}
                badgeDefs={badgeDefs}
              />
            </View>

            <Text style={[styles.bgLabel, { color: Colors.textSecondary }]}>Background</Text>

            {/* Gradient swatches */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatchRow}>
              {gradients.map((entry, i) => {
                const [from, to] = entry;
                const isSelected = bgColor === from;
                return (
                  <TouchableOpacity
                    key={`${from}_${to}_${i}`}
                    style={[
                      styles.swatch,
                      { borderColor: isSelected ? Colors.textPrimary : 'transparent' },
                      isSelected && styles.swatchSelected,
                    ]}
                    onPress={() => onBgChange(from)}
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
            </ScrollView>

            {/* Share button */}
            <AnimatedPressable
              style={[styles.shareBtn, { backgroundColor: Colors.accent }]}
              onPress={onShare}
            >
              <Ionicons name="share-social-outline" size={20} color={Colors.textPrimary} />
              <Text style={[styles.shareBtnText, { color: Colors.textPrimary }]}>Share</Text>
            </AnimatedPressable>
          </Animated.View>
        </GestureDetector>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.xs },
  title: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, textAlign: 'center' },
  previewWrap: { borderRadius: Radius.xl, overflow: 'hidden', alignSelf: 'center', width: '100%' },
  bgLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  swatchRow: { paddingHorizontal: Spacing.xs, gap: Spacing.sm },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, overflow: 'hidden' },
  swatchGradient: { flex: 1 },
  swatchSelected: { transform: [{ scale: 1.2 }] },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  shareBtnText: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
});
