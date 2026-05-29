import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { xpThresholdForLevel } from '../../logic/xpEngine';
import { getLevelTier } from './ProfileShareCard';

interface Props {
  visible: boolean;
  currentLevel: number;
  onClose: () => void;
}

export default function LevelLadderModal({ visible, currentLevel, onClose }: Props) {
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <View style={styles.handle} />
            <Text style={styles.title}>Level Progression</Text>
            <Text style={styles.subtitle}>Your journey to the top</Text>
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
                        isCurrentLevel && styles.levelRowCurrent,
                        !isUnlocked && styles.levelRowLocked,
                      ]}
                    >
                      <View style={[styles.levelIconWrap, { borderColor: isUnlocked ? tier.color + '66' : Colors.border, backgroundColor: isUnlocked ? tier.color + '22' : Colors.bg3 }]}>
                        <Ionicons name={tier.icon as any} size={20} color={isUnlocked ? tier.color : Colors.textDisabled} />
                      </View>
                      <View style={styles.levelInfo}>
                        <Text style={[styles.levelNum, isCurrentLevel && { color: Colors.accentBright }]}>
                          Level {lvl}{isCurrentLevel ? ' ← You' : ''}
                        </Text>
                        <Text style={[styles.tierName, isUnlocked && { color: tier.color }]}>{tier.title}</Text>
                      </View>
                      <Text style={[styles.xpReq, !isUnlocked && { color: Colors.textDisabled }]}>
                        {xpNeeded.toLocaleString()} XP
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
              {currentLevel + 5 < TOTAL_LEVELS && (
                <View style={styles.moreLevels}>
                  <Text style={styles.moreLevelsText}>
                    · · · {TOTAL_LEVELS - Math.min(currentLevel + 5, TOTAL_LEVELS)} more levels await
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: Colors.bg1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, maxHeight: '80%', borderTopWidth: 1, borderColor: Colors.border },
  handle: { width: 40, height: 4, backgroundColor: Colors.bg3, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.md },
  listWrap: { height: Math.floor(Dimensions.get('window').height * 0.45), position: 'relative' },
  scroll: { flex: 1 },
  scrollContent: { gap: Spacing.xs, paddingBottom: Spacing.xl },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  levelRowCurrent: { borderColor: Colors.accentBright, backgroundColor: Colors.accentDim + '55' },
  levelRowLocked: { opacity: 0.45 },
  levelIconWrap: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  levelInfo: { flex: 1 },
  levelNum: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
  tierName: { color: Colors.textSecondary, fontSize: FontSize.xs },
  xpReq: { color: Colors.accentBright, fontSize: FontSize.xs, fontWeight: '600' },
  moreLevels: { alignItems: 'center', paddingVertical: Spacing.sm },
  moreLevelsText: { color: Colors.accentBright, fontSize: FontSize.sm, fontWeight: '600' },
  closeBtn: { backgroundColor: Colors.bg2, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  closeBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
});
