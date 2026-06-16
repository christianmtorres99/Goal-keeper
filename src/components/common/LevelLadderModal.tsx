import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, FontSize, hexAlpha, Radius, Spacing, OVERLAY_DARK_MODE, OVERLAY_LIGHT_MODE } from '../../constants/theme';
import { Spring } from '../../constants/motion';
import { useColors } from '../../hooks/useColors';
import { xpThresholdForLevel } from '../../logic/xpEngine';
import { getLevelTier } from './ProfileShareCard';

interface Props {
  visible: boolean;
  currentLevel: number;
  onClose: () => void;
}

export default function LevelLadderModal({ visible, currentLevel, onClose }: Props) {
  const { colors: Colors, isLight } = useColors();
  const TOTAL_LEVELS = 55;
  const maxDisplay = Math.min(currentLevel + 5, TOTAL_LEVELS);
  const levels = Array.from({ length: maxDisplay }, (_, i) => i + 1);

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={[styles.backdrop, { backgroundColor: isLight ? OVERLAY_LIGHT_MODE : OVERLAY_DARK_MODE }]}
          activeOpacity={1}
          onPress={onClose}
        />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, sheetStyle, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <View style={[styles.handle, { backgroundColor: Colors.bg3 }]} />
            <Text style={[styles.title, { color: Colors.textPrimary }]}>Level Progression</Text>
            <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Your journey to the top</Text>
            <View style={styles.listWrap}>
              <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {levels.map(lvl => {
                  const tier = getLevelTier(lvl);
                  const xpNeeded = xpThresholdForLevel(lvl);
                  const isCurrentLevel = lvl === currentLevel;
                  const isUnlocked = lvl <= currentLevel;
                  return (
                    <View
                      key={lvl}
                      style={[
                        styles.levelRow,
                        { backgroundColor: Colors.bg2, borderColor: Colors.border },
                        isCurrentLevel && { borderColor: Colors.accentBright, backgroundColor: hexAlpha(Colors.accentDim, 0.33) },
                        !isUnlocked && styles.levelRowLocked,
                      ]}
                    >
                      <View style={[styles.levelIconWrap, { borderColor: isUnlocked ? hexAlpha(tier.color, 0.40) : Colors.border, backgroundColor: isUnlocked ? hexAlpha(tier.color, 0.13) : Colors.bg3 }]}>
                        <Ionicons name={tier.icon as any} size={20} color={isUnlocked ? tier.color : Colors.textDisabled} />
                      </View>
                      <View style={styles.levelInfo}>
                        <Text style={[styles.levelNum, { color: Colors.textPrimary }, isCurrentLevel && { color: Colors.accentBright }]}>
                          Level {lvl}{isCurrentLevel ? ' ← You' : ''}
                        </Text>
                        <Text style={[styles.tierName, { color: Colors.textSecondary }, isUnlocked && { color: tier.color }]}>{tier.title}</Text>
                      </View>
                      <Text style={[styles.xpReq, { color: Colors.accentBright }, !isUnlocked && { color: Colors.textDisabled }]}>
                        {xpNeeded.toLocaleString()} XP
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
              {currentLevel + 5 < TOTAL_LEVELS && (
                <View style={styles.moreLevels}>
                  <Text style={[styles.moreLevelsText, { color: Colors.accentBright }]}>
                    · · · {TOTAL_LEVELS - Math.min(currentLevel + 5, TOTAL_LEVELS)} more levels await
                  </Text>
                </View>
              )}
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
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, maxHeight: '80%', borderTopWidth: 1 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  title: { fontSize: FontSize.xl, fontFamily: FontFamily.extraBold, textAlign: 'center' },
  subtitle: { fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.md },
  listWrap: { height: Math.floor(Dimensions.get('window').height * 0.45), position: 'relative' },
  scroll: { flex: 1 },
  scrollContent: { gap: Spacing.xs, paddingBottom: Spacing.xl },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1 },
  levelRowLocked: { opacity: 0.45 },
  levelIconWrap: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  levelInfo: { flex: 1 },
  levelNum: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },
  tierName: { fontSize: FontSize.xs },
  xpReq: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold },
  moreLevels: { alignItems: 'center', paddingVertical: Spacing.sm },
  moreLevelsText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  closeBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm, borderWidth: 1 },
  closeBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
});
