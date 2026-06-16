import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import GameIcon from '../common/GameIcon';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { FontFamily, FontSize, Radius, Spacing, OVERLAY_DARK_MODE, OVERLAY_LIGHT_MODE } from '../../constants/theme';
import { useColors } from '../../hooks/useColors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onActivate: () => void;
  streak: number;
  bankedDays: number;
  dismissCount: number;
}

export default function RestDayModal({ visible, onClose, onActivate, streak, bankedDays, dismissCount }: Props) {
  const { colors: Colors, isLight } = useColors();
  const isVeteran = dismissCount >= 3;

  const bodyText = isVeteran
    ? "Still going strong! Just checking — your body okay? Rest day's here if you need it."
    : `Hey! You've been doing great! You have a ${streak} day streak! However, rest is important. Take today off. You should rest as hard as you work. (Your streak is safe.)`;

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
      <View style={[styles.overlay, { backgroundColor: isLight ? OVERLAY_LIGHT_MODE : OVERLAY_DARK_MODE }]}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, { backgroundColor: Colors.bg2, borderColor: Colors.accent + '70', shadowColor: Colors.accent }, sheetStyle]}>
            <View style={styles.titleRow}>
              <GameIcon type="moon" size={20} />
              <Text style={[styles.title, { color: Colors.textPrimary }]}>Rest Day Available</Text>
            </View>
            <Text style={[styles.body, { color: Colors.textSecondary }]}>{bodyText}</Text>
            <Text style={[styles.bankedLabel, { color: Colors.accentBright }]}>{bankedDays} rest {bankedDays === 1 ? 'day' : 'days'} banked</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: Colors.accent }]} onPress={onActivate} activeOpacity={0.85}>
              <Text style={[styles.primaryBtnText, { color: Colors.textPrimary }]}>Activate Rest Day</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.secondaryBtnText, { color: Colors.textSecondary }]}>Not today</Text>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
    gap: Spacing.md,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
  },
  body: {
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  bankedLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    textAlign: 'center',
  },
  primaryBtn: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: FontSize.sm,
  },
});
