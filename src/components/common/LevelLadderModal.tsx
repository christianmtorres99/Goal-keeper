import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, hexAlpha, Radius, Spacing, OVERLAY_DARK_MODE, OVERLAY_LIGHT_MODE } from '../../constants/theme';
import { Spring } from '../../constants/motion';
import { useColors } from '../../hooks/useColors';
import { xpThresholdForLevel } from '../../logic/xpEngine';
import { TIER_DEFS } from '../../constants/xp';

interface Props {
  visible: boolean;
  currentLevel: number;
  onClose: () => void;
}

const NODE_SIZE = 64;
const NODE_GAP = 12;

export default function LevelLadderModal({ visible, currentLevel, onClose }: Props) {
  const { colors: Colors, isLight } = useColors();
  const timelineRef = useRef<ScrollView>(null);

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
    if (!visible) { translateY.value = 0; return; }
    const currentTierIdx = TIER_DEFS.findIndex(t => currentLevel >= t.minLevel && currentLevel <= t.maxLevel);
    if (currentTierIdx >= 0) {
      const offset = currentTierIdx * (NODE_SIZE + NODE_GAP) - (Dimensions.get('window').width / 2) + NODE_SIZE / 2;
      setTimeout(() => timelineRef.current?.scrollTo({ x: Math.max(0, offset), animated: true }), 200);
    }
  }, [visible, currentLevel]);

  const currentTierDef = TIER_DEFS.find(t => currentLevel >= t.minLevel && currentLevel <= t.maxLevel) ?? TIER_DEFS[TIER_DEFS.length - 1];
  const currentTierIdx = TIER_DEFS.indexOf(currentTierDef as any);
  const nextTierDef = TIER_DEFS[currentTierIdx + 1] ?? null;

  const tierLevels = currentTierDef.maxLevel - currentTierDef.minLevel + 1;
  const levelsIntoTier = currentLevel - currentTierDef.minLevel;
  const tierProgress = Math.min(levelsIntoTier / tierLevels, 1);

  const xpForNextTier = nextTierDef ? xpThresholdForLevel(nextTierDef.minLevel) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={[styles.backdrop, { backgroundColor: isLight ? OVERLAY_LIGHT_MODE : OVERLAY_DARK_MODE }]}
          activeOpacity={1}
          onPress={onClose}
        />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, sheetStyle, { backgroundColor: Colors.bg0, borderColor: Colors.border }]}>
            <View style={[styles.handle, { backgroundColor: Colors.bg3 }]} />
            <Text style={[styles.title, { color: Colors.textPrimary }]}>Path of Ascension</Text>
            <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Your journey through all 10 tiers</Text>

            {/* Tier timeline — no connecting line */}
            <ScrollView
              ref={timelineRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timelineContent}
            >
              {TIER_DEFS.map((tier) => {
                const isPast = currentLevel > tier.maxLevel;
                const isCurrent = currentLevel >= tier.minLevel && currentLevel <= tier.maxLevel;
                const isFuture = currentLevel < tier.minLevel;

                return (
                  <View key={tier.name} style={styles.tierNode}>
                    <View
                      style={[
                        styles.nodeCircle,
                        {
                          backgroundColor: isFuture ? Colors.bg3 : hexAlpha(tier.color, 0.15),
                          borderColor: isCurrent ? tier.color : isFuture ? Colors.border : hexAlpha(tier.color, 0.5),
                          borderWidth: isCurrent ? 2.5 : 1.5,
                          opacity: isFuture ? 0.4 : 1,
                          width: isCurrent ? 68 : NODE_SIZE,
                          height: isCurrent ? 68 : NODE_SIZE,
                          borderRadius: isCurrent ? 34 : NODE_SIZE / 2,
                        },
                      ]}
                    >
                      <Ionicons name={tier.icon as any} size={isCurrent ? 26 : 22} color={isFuture ? Colors.textDisabled : tier.color} />
                      {isPast && (
                        <View style={[styles.checkOverlay, { backgroundColor: hexAlpha(tier.color, 0.9) }]}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.nodeName,
                        { color: isCurrent ? tier.color : isFuture ? Colors.textDisabled : Colors.textSecondary },
                        isCurrent && styles.nodeNameCurrent,
                      ]}
                      numberOfLines={1}
                    >
                      {tier.name}
                    </Text>
                    <Text style={[styles.nodeLevels, { color: Colors.textDisabled }]}>
                      {tier.minLevel}–{tier.maxLevel}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Current tier detail card */}
            <View style={[styles.detailCard, { backgroundColor: Colors.bg2, borderColor: hexAlpha(currentTierDef.color, 0.4) }]}>
              <View style={styles.detailHeader}>
                <View style={[styles.detailIcon, { backgroundColor: hexAlpha(currentTierDef.color, 0.15) }]}>
                  <Ionicons name={currentTierDef.icon as any} size={22} color={currentTierDef.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailTier, { color: currentTierDef.color }]}>{currentTierDef.name}</Text>
                  <Text style={[styles.detailLevel, { color: Colors.textSecondary }]}>
                    Level {currentLevel} · {levelsIntoTier} of {tierLevels} in tier
                  </Text>
                </View>
                {nextTierDef && (
                  <View style={styles.nextTierHint}>
                    <Text style={[styles.nextTierLabel, { color: Colors.textDisabled }]}>Next</Text>
                    <Ionicons name={nextTierDef.icon as any} size={16} color={nextTierDef.color} />
                    <Text style={[styles.nextTierName, { color: nextTierDef.color }]}>{nextTierDef.name}</Text>
                  </View>
                )}
              </View>

              {/* Tier progress bar */}
              <View style={[styles.progressTrack, { backgroundColor: Colors.bg3 }]}>
                <View style={[styles.progressFill, { backgroundColor: currentTierDef.color, width: `${tierProgress * 100}%` as any }]} />
              </View>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressLabel, { color: Colors.textDisabled }]}>Lv {currentTierDef.minLevel}</Text>
                {nextTierDef && xpForNextTier && (
                  <Text style={[styles.progressLabel, { color: Colors.textDisabled }]}>
                    {xpForNextTier.toLocaleString()} XP for {nextTierDef.name}
                  </Text>
                )}
                <Text style={[styles.progressLabel, { color: Colors.textDisabled }]}>Lv {currentTierDef.maxLevel}</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: Colors.bg2, borderColor: Colors.border }]} onPress={onClose}>
              <Text style={[styles.closeBtnText, { color: Colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, borderTopWidth: 1, gap: Spacing.md },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, textAlign: 'center' },
  subtitle: { fontSize: FontSize.sm, textAlign: 'center', marginBottom: 4 },
  // Timeline
  timelineContent: { paddingHorizontal: Spacing.xl, gap: NODE_GAP, alignItems: 'flex-start', paddingBottom: 4 },
  tierNode: { alignItems: 'center', width: NODE_SIZE, gap: 4 },
  nodeCircle: { alignItems: 'center', justifyContent: 'center' },
  checkOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  nodeName: { fontSize: 9, fontFamily: FontFamily.semiBold, textAlign: 'center' },
  nodeNameCurrent: { fontFamily: FontFamily.extraBold },
  nodeLevels: { fontSize: 8, fontFamily: FontFamily.regular },
  // Detail card
  detailCard: { borderRadius: Radius.lg, borderWidth: 1.5, padding: Spacing.md, gap: Spacing.sm },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  detailIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  detailTier: { fontSize: FontSize.lg, fontFamily: FontFamily.extraBold },
  detailLevel: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  nextTierHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextTierLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  nextTierName: { fontSize: FontSize.xs, fontFamily: FontFamily.bold },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  // Close
  closeBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1 },
  closeBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
});
