import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Dimensions, Animated, Platform, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontFamily, FontSize, hexAlpha, Radius, Spacing } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import { useGameStore } from '../store/gameStore';
import { useGoalStore } from '../store/goalStore';
import type { GoalCategory, GoalDifficulty } from '../types';

export const ONBOARDING_KEY = 'onboardingComplete_v1';

const { width: W } = Dimensions.get('window');

type Step =
  | 'welcome'
  | 'name'
  | 'create_goal'
  | 'tour_home'
  | 'tour_calendar'
  | 'tour_stats'
  | 'tour_profile'
  | 'tour_journal'
  | 'ready';

const STEPS: Step[] = [
  'welcome', 'name', 'create_goal',
  'tour_home', 'tour_calendar', 'tour_stats', 'tour_profile', 'tour_journal',
  'ready',
];

interface Props {
  onDone: () => void;
}

// ─── Reusable chips ────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  icon: string;
  selected: boolean;
  color: string;
  onPress: () => void;
}
function Chip({ label, icon, selected, color, onPress }: ChipProps) {
  const { colors: Colors } = useColors();
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { backgroundColor: selected ? hexAlpha(color, 0.18) : Colors.bg2, borderColor: selected ? color : Colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon as any} size={15} color={selected ? color : Colors.textSecondary} />
      <Text style={[styles.chipText, { color: selected ? color : Colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Goal creator step ─────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { label: string; value: GoalCategory; icon: string; color: string }[] = [
  { label: 'Physical', value: 'physical', icon: 'barbell', color: '#10B981' },
  { label: 'Learning', value: 'learning', icon: 'book', color: '#3B82F6' },
  { label: 'Creative', value: 'creative', icon: 'brush', color: '#EC4899' },
  { label: 'Wellness', value: 'wellness', icon: 'heart', color: '#F59E0B' },
];

const DIFFICULTY_OPTIONS: { label: string; value: GoalDifficulty; icon: string; color: string }[] = [
  { label: 'Easy', value: 'easy', icon: 'leaf', color: '#22C55E' },
  { label: 'Medium', value: 'medium', icon: 'flash', color: '#F59E0B' },
  { label: 'Hard', value: 'hard', icon: 'flame', color: '#F97316' },
  { label: 'Extreme', value: 'extreme', icon: 'skull', color: '#EF4444' },
];

const CATEGORY_ICONS: Record<GoalCategory, string> = {
  physical: 'barbell', learning: 'book', creative: 'brush', wellness: 'heart', other: 'star',
};
const CATEGORY_COLORS: Record<GoalCategory, string> = {
  physical: '#10B981', learning: '#3B82F6', creative: '#EC4899', wellness: '#F59E0B', other: '#8B5CF6',
};

interface GoalCreatorProps {
  goalName: string;
  setGoalName: (v: string) => void;
  category: GoalCategory;
  setCategory: (v: GoalCategory) => void;
  difficulty: GoalDifficulty;
  setDifficulty: (v: GoalDifficulty) => void;
}

function GoalCreatorStep({ goalName, setGoalName, category, setCategory, difficulty, setDifficulty }: GoalCreatorProps) {
  const { colors: Colors } = useColors();
  return (
    <View style={styles.goalCreator}>
      <TextInput
        style={[styles.nameInput, { backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]}
        placeholder="e.g. Morning run, Read daily…"
        placeholderTextColor={Colors.textDisabled}
        value={goalName}
        onChangeText={setGoalName}
        maxLength={60}
        autoFocus={false}
        returnKeyType="done"
      />

      <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Category</Text>
      <View style={styles.chipRow}>
        {CATEGORY_OPTIONS.map(opt => (
          <Chip
            key={opt.value}
            label={opt.label}
            icon={opt.icon}
            selected={category === opt.value}
            color={opt.color}
            onPress={() => setCategory(opt.value)}
          />
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Difficulty</Text>
      <View style={styles.chipRow}>
        {DIFFICULTY_OPTIONS.map(opt => (
          <Chip
            key={opt.value}
            label={opt.label}
            icon={opt.icon}
            selected={difficulty === opt.value}
            color={opt.color}
            onPress={() => setDifficulty(opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Feature tour slides ───────────────────────────────────────────────────────

function HomePreview() {
  const { colors: Colors } = useColors();
  const goals = [
    { color: '#10B981', icon: 'barbell', label: 'Morning run', streak: 5 },
    { color: '#3B82F6', icon: 'book', label: 'Read 20 pages', streak: 12 },
    { color: '#EC4899', icon: 'brush', label: 'Sketch daily', streak: 3 },
  ];
  return (
    <View style={styles.preview}>
      {goals.map((g, i) => (
        <View key={i} style={[styles.previewGoalRow, { backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
          <View style={[styles.previewGoalIcon, { backgroundColor: hexAlpha(g.color, 0.18) }]}>
            <Ionicons name={g.icon as any} size={14} color={g.color} />
          </View>
          <Text style={[styles.previewGoalLabel, { color: Colors.textPrimary }]}>{g.label}</Text>
          <View style={styles.previewStreak}>
            <Ionicons name="flame" size={12} color="#F97316" />
            <Text style={[styles.previewStreakText, { color: Colors.textSecondary }]}>{g.streak}</Text>
          </View>
        </View>
      ))}
      <View style={[styles.previewQuestCard, { backgroundColor: hexAlpha('#6366F1', 0.12), borderColor: hexAlpha('#6366F1', 0.3) }]}>
        <Ionicons name="list" size={13} color="#6366F1" />
        <Text style={[styles.previewQuestText, { color: '#6366F1' }]}>Daily Quests  2 / 3</Text>
      </View>
    </View>
  );
}

function CalendarPreview() {
  const { colors: Colors } = useColors();
  const rows = 4; const cols = 7;
  const intensities = Array.from({ length: rows * cols }, (_, i) => {
    const v = (i * 7 + i * 3) % 5;
    return v;
  });
  const green = '#22C55E';
  const opacities = [0.08, 0.22, 0.45, 0.70, 1.0];
  return (
    <View style={styles.preview}>
      <View style={styles.heatmapGrid}>
        {intensities.map((v, i) => (
          <View
            key={i}
            style={[styles.heatmapCell, { backgroundColor: v === 0 ? Colors.bg3 : hexAlpha(green, opacities[v]) }]}
          />
        ))}
      </View>
      <Text style={[styles.previewCaption, { color: Colors.textSecondary }]}>Every square is a day you logged</Text>
    </View>
  );
}

function StatsPreview() {
  const { colors: Colors } = useColors();
  const bars = [0.4, 0.65, 0.5, 0.8, 0.6, 0.9, 0.75];
  const accent = '#6366F1';
  return (
    <View style={styles.preview}>
      <View style={[styles.statsLevelBadge, { backgroundColor: hexAlpha(accent, 0.15), borderColor: hexAlpha(accent, 0.4) }]}>
        <Text style={[styles.statsLevelNum, { color: accent }]}>12</Text>
        <Text style={[styles.statsLevelLabel, { color: Colors.textSecondary }]}>Blazing</Text>
      </View>
      <View style={styles.miniChart}>
        {bars.map((h, i) => (
          <View key={i} style={[styles.miniBar, { height: h * 40, backgroundColor: i === 5 ? accent : hexAlpha(accent, 0.35) }]} />
        ))}
      </View>
      <Text style={[styles.previewCaption, { color: Colors.textSecondary }]}>XP earned each day this week</Text>
    </View>
  );
}

function ProfilePreview() {
  const { colors: Colors } = useColors();
  const tierColor = '#F97316';
  const badges = ['#F59E0B', '#22C55E', '#3B82F6', '#EC4899', '#8B5CF6', '#06B6D4'];
  return (
    <View style={styles.preview}>
      <View style={[styles.profileTierCircle, { borderColor: tierColor, backgroundColor: hexAlpha(tierColor, 0.12) }]}>
        <Ionicons name="rocket" size={28} color={tierColor} />
      </View>
      <Text style={[styles.profileTierName, { color: tierColor }]}>Legendary</Text>
      <View style={[styles.profileXPBar, { backgroundColor: Colors.bg3 }]}>
        <View style={[styles.profileXPFill, { backgroundColor: tierColor, width: '62%' }]} />
      </View>
      <View style={styles.badgeRow}>
        {badges.map((c, i) => (
          <View key={i} style={[styles.badgeCircle, { backgroundColor: hexAlpha(c, 0.22), borderColor: hexAlpha(c, 0.5) }]}>
            <Ionicons name="ribbon" size={12} color={c} />
          </View>
        ))}
      </View>
    </View>
  );
}

function JournalPreview() {
  const { colors: Colors } = useColors();
  const moods = ['😔', '😐', '🙂', '😊', '😄'];
  return (
    <View style={styles.preview}>
      <View style={styles.moodRow}>
        {moods.map((m, i) => (
          <View
            key={i}
            style={[styles.moodBubble, { backgroundColor: i === 3 ? hexAlpha('#22C55E', 0.2) : Colors.bg2, borderColor: i === 3 ? '#22C55E' : Colors.border }]}
          >
            <Text style={styles.moodEmoji}>{m}</Text>
          </View>
        ))}
      </View>
      {[0.8, 0.55, 0.7].map((w, i) => (
        <View key={i} style={[styles.journalLine, { width: `${w * 100}%` as any, backgroundColor: Colors.bg3 }]} />
      ))}
    </View>
  );
}

const TOUR_SLIDES: {
  step: Step;
  icon: string;
  iconColor: string;
  gradient: [string, string];
  title: string;
  subtitle: string;
  bullets: string[];
  Preview: React.FC;
}[] = [
  {
    step: 'tour_home',
    icon: 'home',
    iconColor: '#6366F1',
    gradient: ['#EDE9FE', '#FAFAFA'],
    title: 'Home',
    subtitle: 'Your daily dashboard. Log goals, complete quests, and battle raid bosses.',
    bullets: ['Tap a goal card to log it', 'Complete quests for bonus XP', 'Boss raids spawn every 2 weeks'],
    Preview: HomePreview,
  },
  {
    step: 'tour_calendar',
    icon: 'calendar',
    iconColor: '#22C55E',
    gradient: ['#D1FAE5', '#FAFAFA'],
    title: 'Calendar',
    subtitle: 'See your consistency at a glance. The greener the grid, the stronger your habits.',
    bullets: ['Each square is one day', 'Darker green = more logs', 'Tap a day to see what you logged'],
    Preview: CalendarPreview,
  },
  {
    step: 'tour_stats',
    icon: 'bar-chart',
    iconColor: '#6366F1',
    gradient: ['#EEF2FF', '#FAFAFA'],
    title: 'Stats',
    subtitle: 'Track your XP, level progression, streaks, and personal records over time.',
    bullets: ['XP earned per day chart', 'Streak milestones + personal bests', '55 levels across 11 tiers'],
    Preview: StatsPreview,
  },
  {
    step: 'tour_profile',
    icon: 'trophy',
    iconColor: '#F97316',
    gradient: ['#FEF3C7', '#FAFAFA'],
    title: 'Profile',
    subtitle: 'Your character. Earn badges, unlock titles, craft consumables, and collect perks.',
    bullets: ['Level up to unlock new tiers', 'Earn 88 badges across 12 categories', 'Craft consumables from shards you collect'],
    Preview: ProfilePreview,
  },
  {
    step: 'tour_journal',
    icon: 'journal',
    iconColor: '#EC4899',
    gradient: ['#FCE7F3', '#FAFAFA'],
    title: 'Journal',
    subtitle: 'Reflect on your day. Rate your mood and energy, write notes, or sketch on the canvas.',
    bullets: ['Mood + energy sliders', 'Free-draw canvas for sketching', 'Journal streaks earn you bonus badges'],
    Preview: JournalPreview,
  },
];

// ─── Main component ────────────────────────────────────────────────────────────

export default function OnboardingScreen({ onDone }: Props) {
  const { colors: Colors, isLight } = useColors();
  const [stepIndex, setStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Name step
  const [name, setName] = useState('');

  // Goal creator step
  const [goalName, setGoalName] = useState('');
  const [category, setCategory] = useState<GoalCategory>('physical');
  const [difficulty, setDifficulty] = useState<GoalDifficulty>('medium');
  const [saving, setSaving] = useState(false);

  const currentStep = STEPS[stepIndex];

  const transitionTo = useCallback((idx: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setStepIndex(idx);
  }, [fadeAnim]);

  const advance = () => transitionTo(stepIndex + 1);

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  };

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (trimmed) {
      await useGameStore.getState().setUserName(trimmed);
    }
    advance();
  };

  const handleCreateGoal = async () => {
    if (!goalName.trim() || saving) return;
    setSaving(true);
    try {
      await useGoalStore.getState().addGoal({
        name: goalName.trim(),
        description: '',
        type: 'habit',
        category,
        difficulty,
        color: CATEGORY_COLORS[category],
        icon: CATEGORY_ICONS[category],
      });
    } catch {}
    setSaving(false);
    advance();
  };

  const handleDone = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  };

  const isLast = currentStep === 'ready';
  const showSkip = !isLast && currentStep !== 'create_goal';

  // Tour slide index (among TOUR_SLIDES)
  const tourSlide = TOUR_SLIDES.find(t => t.step === currentStep);

  // Gradient for current step
  const stepGradient: [string, string] = (() => {
    if (tourSlide) return isLight ? tourSlide.gradient : [hexAlpha(tourSlide.iconColor, 0.14), Colors.bg0];
    if (currentStep === 'welcome') return isLight ? ['#EDE9FE', '#FAFAFA'] : [Colors.accentDim, Colors.bg1];
    if (currentStep === 'name') return isLight ? ['#EEF2FF', '#FAFAFA'] : ['#1E1B4B', Colors.bg1];
    if (currentStep === 'create_goal') return isLight ? ['#D1FAE5', '#FAFAFA'] : ['#064E3B', Colors.bg1];
    return isLight ? ['#EDE9FE', '#FAFAFA'] : [Colors.accentDim, Colors.bg1];
  })();

  const accentColor = tourSlide?.iconColor ?? Colors.accentBright;

  // Progress dots
  const progress = stepIndex / (STEPS.length - 1);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg0 }]} edges={['top', 'left', 'right', 'bottom']}>
      <LinearGradient colors={stepGradient} style={styles.bg} />

      {showSkip && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} hitSlop={8}>
          <Text style={[styles.skipText, { color: Colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: Colors.bg3 }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: accentColor, width: `${progress * 100}%` as any }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

            {/* ── Welcome ─────────────────────────────────────────────── */}
            {currentStep === 'welcome' && (
              <>
                <View style={[styles.iconWrap, { borderColor: hexAlpha(Colors.accentBright, 0.27), backgroundColor: hexAlpha(Colors.accentBright, 0.09) }]}>
                  <Ionicons name="flag" size={56} color={Colors.accentBright} />
                </View>
                <View style={styles.textBlock}>
                  <Text style={[styles.title, { color: Colors.textPrimary }]}>Welcome to Goal Keeper</Text>
                  <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>
                    Turn your goals into a game. Log daily to earn XP, level up, and unlock rewards.
                  </Text>
                </View>
                <View style={styles.bullets}>
                  {[
                    { icon: 'trending-up', text: 'Build streaks to multiply your XP' },
                    { icon: 'trophy', text: 'Level up through 11 epic tiers' },
                    { icon: 'shield-checkmark', text: 'Battle raid bosses and complete seasons' },
                  ].map((b, i) => (
                    <View key={i} style={[styles.bullet, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)' }]}>
                      <View style={[styles.bulletIcon, { backgroundColor: hexAlpha(Colors.accentBright, 0.13) }]}>
                        <Ionicons name={b.icon as any} size={16} color={Colors.accentBright} />
                      </View>
                      <Text style={[styles.bulletText, { color: Colors.textPrimary }]}>{b.text}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── Name ────────────────────────────────────────────────── */}
            {currentStep === 'name' && (
              <>
                <View style={[styles.iconWrap, { borderColor: hexAlpha('#6366F1', 0.27), backgroundColor: hexAlpha('#6366F1', 0.09) }]}>
                  <Ionicons name="person" size={56} color="#6366F1" />
                </View>
                <View style={styles.textBlock}>
                  <Text style={[styles.title, { color: Colors.textPrimary }]}>What should we call you?</Text>
                  <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>
                    Your name will appear on your profile and leaderboard.
                  </Text>
                </View>
                <TextInput
                  style={[styles.nameInput, { backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]}
                  placeholder="Enter your name…"
                  placeholderTextColor={Colors.textDisabled}
                  value={name}
                  onChangeText={setName}
                  maxLength={30}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                  autoFocus
                />
              </>
            )}

            {/* ── Create Goal ──────────────────────────────────────────── */}
            {currentStep === 'create_goal' && (
              <>
                <View style={[styles.iconWrap, { borderColor: hexAlpha('#22C55E', 0.27), backgroundColor: hexAlpha('#22C55E', 0.09) }]}>
                  <Ionicons name="add-circle" size={56} color="#22C55E" />
                </View>
                <View style={styles.textBlock}>
                  <Text style={[styles.title, { color: Colors.textPrimary }]}>Create your first goal</Text>
                  <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>
                    Pick something you want to do every day. You can add more goals anytime.
                  </Text>
                </View>
                <GoalCreatorStep
                  goalName={goalName}
                  setGoalName={setGoalName}
                  category={category}
                  setCategory={setCategory}
                  difficulty={difficulty}
                  setDifficulty={setDifficulty}
                />
              </>
            )}

            {/* ── Tour slides ──────────────────────────────────────────── */}
            {tourSlide && (
              <>
                <View style={[styles.iconWrap, { borderColor: hexAlpha(tourSlide.iconColor, 0.27), backgroundColor: hexAlpha(tourSlide.iconColor, 0.09) }]}>
                  <Ionicons name={tourSlide.icon as any} size={56} color={tourSlide.iconColor} />
                </View>
                <View style={styles.textBlock}>
                  <Text style={[styles.stepBadge, { color: tourSlide.iconColor }]}>FEATURE TOUR</Text>
                  <Text style={[styles.title, { color: Colors.textPrimary }]}>{tourSlide.title}</Text>
                  <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>{tourSlide.subtitle}</Text>
                </View>
                <tourSlide.Preview />
                <View style={styles.bullets}>
                  {tourSlide.bullets.map((b, i) => (
                    <View key={i} style={[styles.bullet, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)' }]}>
                      <View style={[styles.bulletIcon, { backgroundColor: hexAlpha(tourSlide.iconColor, 0.13) }]}>
                        <Ionicons name="checkmark" size={16} color={tourSlide.iconColor} />
                      </View>
                      <Text style={[styles.bulletText, { color: Colors.textPrimary }]}>{b}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── Ready ────────────────────────────────────────────────── */}
            {currentStep === 'ready' && (
              <>
                <View style={[styles.iconWrap, { borderColor: hexAlpha(Colors.accentBright, 0.27), backgroundColor: hexAlpha(Colors.accentBright, 0.09) }]}>
                  <Ionicons name="rocket" size={56} color={Colors.accentBright} />
                </View>
                <View style={styles.textBlock}>
                  <Text style={[styles.title, { color: Colors.textPrimary }]}>You're all set!</Text>
                  <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>
                    Your first goal is ready to go. Come back every day to log it and watch your XP grow.
                  </Text>
                </View>
                <View style={styles.bullets}>
                  {[
                    { icon: 'time', text: 'Log your goal once a day to build your streak' },
                    { icon: 'notifications', text: 'Set a daily reminder from the goal detail screen' },
                    { icon: 'heart', text: 'Consistency beats intensity — just show up' },
                  ].map((b, i) => (
                    <View key={i} style={[styles.bullet, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)' }]}>
                      <View style={[styles.bulletIcon, { backgroundColor: hexAlpha(Colors.accentBright, 0.13) }]}>
                        <Ionicons name={b.icon as any} size={16} color={Colors.accentBright} />
                      </View>
                      <Text style={[styles.bulletText, { color: Colors.textPrimary }]}>{b.text}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom CTA */}
      <View style={styles.bottom}>
        {currentStep === 'name' ? (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: '#6366F1' }]}
            onPress={handleSaveName}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>{name.trim() ? 'Continue' : 'Skip for now'}</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : currentStep === 'create_goal' ? (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: goalName.trim() ? '#22C55E' : Colors.bg3, opacity: saving ? 0.6 : 1 }]}
            onPress={goalName.trim() ? handleCreateGoal : advance}
            activeOpacity={0.85}
            disabled={saving}
          >
            <Text style={[styles.nextBtnText, { color: goalName.trim() ? '#fff' : Colors.textSecondary }]}>
              {goalName.trim() ? (saving ? 'Creating…' : 'Create Goal') : 'Skip for now'}
            </Text>
            {!saving && <Ionicons name="arrow-forward" size={20} color={goalName.trim() ? '#fff' : Colors.textSecondary} />}
          </TouchableOpacity>
        ) : isLast ? (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: Colors.accentBright }]}
            onPress={handleDone}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Start My Journey</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: accentColor }]}
            onPress={advance}
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
  safe: { flex: 1 },
  bg: { ...StyleSheet.absoluteFill },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 48,
    right: Spacing.lg,
    zIndex: 10,
    padding: Spacing.sm,
  },
  skipText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  progressTrack: {
    height: 3,
    marginHorizontal: Spacing.xl,
    marginTop: Platform.OS === 'ios' ? 52 : 44,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 2 },
  scrollContent: { flexGrow: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { alignItems: 'center', gap: Spacing.xs },
  stepBadge: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.extraBold,
    letterSpacing: 2.5,
  },
  title: {
    fontSize: FontSize.xxl,
    fontFamily: FontFamily.extraBold,
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  nameInput: {
    width: '100%',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.lg,
    fontFamily: FontFamily.semiBold,
  },
  bullets: { width: '100%', gap: Spacing.sm },
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  bulletIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bulletText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, flex: 1, lineHeight: 19 },
  // Goal creator
  goalCreator: { width: '100%', gap: Spacing.sm },
  sectionLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: Spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.full, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  // Previews
  preview: { width: '100%', alignItems: 'center', gap: Spacing.sm },
  previewGoalRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1, padding: Spacing.sm, width: '100%',
  },
  previewGoalIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  previewGoalLabel: { flex: 1, fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  previewStreak: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  previewStreakText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  previewQuestCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1, padding: Spacing.sm, width: '100%',
  },
  previewQuestText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  previewCaption: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, textAlign: 'center' },
  // Calendar heatmap
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center', width: W - Spacing.xl * 2 - 32 },
  heatmapCell: { width: 26, height: 26, borderRadius: 4 },
  // Stats
  statsLevelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, borderWidth: 1.5, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  statsLevelNum: { fontSize: 28, fontFamily: FontFamily.extraBold },
  statsLevelLabel: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 44 },
  miniBar: { width: 16, borderRadius: 3 },
  // Profile
  profileTierCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  profileTierName: { fontSize: FontSize.lg, fontFamily: FontFamily.extraBold },
  profileXPBar: { width: '80%', height: 8, borderRadius: 4, overflow: 'hidden' },
  profileXPFill: { height: 8, borderRadius: 4 },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm },
  badgeCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  // Journal
  moodRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  moodBubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  moodEmoji: { fontSize: 20 },
  journalLine: { height: 8, borderRadius: 4, alignSelf: 'flex-start' },
  // Bottom
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
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
  nextBtnText: { color: '#fff', fontSize: FontSize.lg, fontFamily: FontFamily.bold },
});
