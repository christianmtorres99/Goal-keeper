import React, { useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSize, Radius, Spacing } from '../constants/theme';
import { useColors } from '../hooks/useColors';

export const ONBOARDING_KEY = 'onboardingComplete_v1';

const { width: W } = Dimensions.get('window');

interface Slide {
  icon: string;
  iconColor: string;
  gradient: [string, string];
  title: string;
  subtitle: string;
  bullets: { icon: string; text: string }[];
}

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const { colors: Colors, isLight } = useColors();
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const slides: Slide[] = useMemo(() => [
    {
      icon: 'flag',
      iconColor: Colors.accentBright,
      gradient: isLight ? ['#EDE9FE', '#FAFAFA'] : [Colors.accentDim, Colors.bg1],
      title: 'Welcome to Goal Keeper',
      subtitle: 'Turn your goals into a game. Log daily to earn XP, level up, and unlock badges.',
      bullets: [
        { icon: 'checkmark-circle', text: 'Track habits and milestone goals' },
        { icon: 'flame', text: 'Build streaks to multiply your XP' },
        { icon: 'trophy', text: 'Collect badges as you hit milestones' },
      ],
    },
    {
      icon: 'flame',
      iconColor: Colors.warning,
      gradient: isLight ? ['#FEF3C7', '#FAFAFA'] : ['#78350F', Colors.bg1],
      title: 'Streaks & XP Multipliers',
      subtitle: 'Log every day to grow your streak. The longer it runs, the more XP you earn.',
      bullets: [
        { icon: 'trending-up', text: '7-day streak = 1.7× XP per log' },
        { icon: 'shield-checkmark', text: 'Grace day saves your streak if you miss once (after day 7)' },
        { icon: 'refresh-circle', text: 'Rebuild bonus: 1.5× XP for 7 days after a broken streak' },
      ],
    },
    {
      icon: 'flash',
      iconColor: Colors.accentBright,
      gradient: isLight ? ['#EEF2FF', '#FAFAFA'] : ['#1E1B4B', Colors.bg1],
      title: 'XP, Levels & Difficulty',
      subtitle: 'Every log earns XP. Fill the bar to level up through 55 tiers — from Seedling to Transcendent.',
      bullets: [
        { icon: 'barbell', text: 'Hard goals earn 1.3× XP, Extreme earns 1.7×' },
        { icon: 'star', text: 'Lucky log: 15% chance to double your XP on any log' },
        { icon: 'sunny', text: 'Early Bird (+10 XP) and Night Owl (+5 XP) time bonuses' },
      ],
    },
    {
      icon: 'calendar',
      iconColor: Colors.success,
      gradient: isLight ? ['#D1FAE5', '#FAFAFA'] : ['#064E3B', Colors.bg1],
      title: 'Daily Login & Quests',
      subtitle: 'Open the app every day to claim your login bonus — it grows with your login streak.',
      bullets: [
        { icon: 'gift', text: 'Daily login bonus: 5–25 XP, increasing each consecutive day' },
        { icon: 'list', text: '3 daily quests reset every midnight (+20–50 XP each)' },
        { icon: 'checkmark-done', text: 'Complete all quests for the maximum daily bonus' },
      ],
    },
    {
      icon: 'diamond',
      iconColor: '#06B6D4',
      gradient: isLight ? ['#E0F2FE', '#FAFAFA'] : ['#0C4A6E', Colors.bg1],
      title: 'Daily Double & Hot Streak',
      subtitle: 'Every day one goal is randomly selected as the Daily Double — log it for 2× XP.',
      bullets: [
        { icon: 'sparkles', text: 'Daily Double goal marked with a ⭐ badge on its card' },
        { icon: 'bonfire', text: 'Log ALL goals 3 days in a row to activate Hot Streak (1.5× global multiplier)' },
        { icon: 'stats-chart', text: 'Monthly challenge: hit your XP target for a bonus reward' },
      ],
    },
    {
      icon: 'medal',
      iconColor: Colors.warning,
      gradient: isLight ? ['#FEF3C7', '#FAFAFA'] : ['#451A03', Colors.bg1],
      title: 'Badges & Personal Records',
      subtitle: 'Unlock 37 badges across streak, log count, consistency, level, and milestone categories.',
      bullets: [
        { icon: 'podium', text: 'Personal records: best week XP, best month, longest streak' },
        { icon: 'ribbon', text: 'Profile border upgrades at levels 10, 20, 30, 50' },
        { icon: 'infinite', text: 'Prestige at level 25: reset XP but earn a permanent +10% boost' },
      ],
    },
    {
      icon: 'rocket',
      iconColor: Colors.accentBright,
      gradient: isLight ? ['#EDE9FE', '#FAFAFA'] : [Colors.accentDim, Colors.bg1],
      title: "You're Ready!",
      subtitle: "Create your first goal and start building the habits that will change your life.",
      bullets: [
        { icon: 'add-circle', text: 'Tap + to create your first goal' },
        { icon: 'time', text: 'Set a daily reminder so you never miss a log' },
        { icon: 'heart', text: 'Come back every day — the streaks add up' },
      ],
    },
  ], [Colors, isLight]);

  const goTo = (idx: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setCurrent(idx);
    scrollRef.current?.scrollTo({ x: idx * W, animated: true });
  };

  const next = () => {
    if (current < slides.length - 1) goTo(current + 1);
  };

  const handleDone = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  };

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg0 }]} edges={['top', 'left', 'right', 'bottom']}>
      <LinearGradient colors={slide.gradient} style={styles.bg} />

      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} hitSlop={8}>
          <Text style={[styles.skipText, { color: Colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.slideScroll}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / W);
          setCurrent(idx);
        }}
      >
        {slides.map((s, slideIdx) => (
          <Animated.View
            key={slideIdx}
            style={[styles.content, { opacity: slideIdx === current ? fadeAnim : 1, width: W }]}
          >
            {/* Icon */}
            <View style={[styles.iconWrap, { borderColor: s.iconColor + '44', backgroundColor: s.iconColor + '18' }]}>
              <Ionicons name={s.icon as any} size={56} color={s.iconColor} />
            </View>

            {/* Text */}
            <View style={styles.textBlock}>
              <Text style={[styles.title, { color: Colors.textPrimary }]}>{s.title}</Text>
              <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>{s.subtitle}</Text>
            </View>

            {/* Bullets */}
            <View style={styles.bullets}>
              {s.bullets.map((b, i) => (
                <View key={i} style={[styles.bullet, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)' }]}>
                  <View style={[styles.bulletIcon, { backgroundColor: s.iconColor + '22' }]}>
                    <Ionicons name={b.icon as any} size={16} color={s.iconColor} />
                  </View>
                  <Text style={[styles.bulletText, { color: Colors.textPrimary }]}>{b.text}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={[styles.dot, { backgroundColor: Colors.bg3 }, i === current && styles.dotActive, i === current && { backgroundColor: slide.iconColor }]} />
            </TouchableOpacity>
          ))}
        </View>

        {isLast ? (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: slide.iconColor }]}
            onPress={handleDone}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Create My First Goal</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: slide.iconColor }]}
            onPress={next}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  bg: {
    ...StyleSheet.absoluteFill,
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 48,
    right: Spacing.lg,
    zIndex: 10,
    padding: Spacing.sm,
  },
  skipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  slideScroll: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  bullets: {
    width: '100%',
    gap: Spacing.sm,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  bulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    fontSize: FontSize.sm,
    flex: 1,
    lineHeight: 19,
  },
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    width: '100%',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
