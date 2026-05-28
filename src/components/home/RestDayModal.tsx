import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onActivate: () => void;
  streak: number;
  bankedDays: number;
  dismissCount: number;
}

export default function RestDayModal({ visible, onClose, onActivate, streak, bankedDays, dismissCount }: Props) {
  const isVeteran = dismissCount >= 3;

  const bodyText = isVeteran
    ? "Still going strong! Just checking — your body okay? Rest day's here if you need it."
    : `Hey! You've been doing great! You have a ${streak} day streak! However, rest is important. Take today off! You should rest as hard as you work! (Don't worry, your streak is safe 😌)`;

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
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, sheetStyle]}>
            <Text style={styles.title}>Rest Day Available 💤</Text>
            <Text style={styles.body}>{bodyText}</Text>
            <Text style={styles.bankedLabel}>{bankedDays} rest {bankedDays === 1 ? 'day' : 'days'} banked</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={onActivate} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Activate Rest Day</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>Not today</Text>
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
    backgroundColor: 'rgba(8, 11, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.accent + '70',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  bankedLabel: {
    color: Colors.accentBright,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  secondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
