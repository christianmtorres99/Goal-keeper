import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Linking,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { FontFamily, FontSize, hexAlpha, Radius, Spacing } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import AnimatedPressable from '../components/common/AnimatedPressable';
import { useGoalStore } from '../store/goalStore';
import { useLogStore } from '../store/logStore';
import { useBadgeStore } from '../store/badgeStore';
import { useGameStore } from '../store/gameStore';
import { useCoinStore } from '../store/coinStore';
import { useJournalStore } from '../store/journalStore';
import { useFriendsStore } from '../store/friendsStore';

// ── Row components ────────────────────────────────────────────────────────────

interface RowProps {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}

function Row({ icon, label, sublabel, onPress, right, danger }: RowProps) {
  const { colors: Colors } = useColors();
  const content = (
    <View style={[s.row, { backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
      <View style={[s.rowIconWrap, { backgroundColor: hexAlpha(danger ? Colors.danger : Colors.accent, 0.14) }]}>
        <Ionicons name={icon as any} size={18} color={danger ? Colors.danger : Colors.accentBright} />
      </View>
      <View style={s.rowText}>
        <Text style={[s.rowLabel, { color: danger ? Colors.danger : Colors.textPrimary }]}>{label}</Text>
        {sublabel && <Text style={[s.rowSublabel, { color: Colors.textSecondary }]}>{sublabel}</Text>}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} /> : null)}
    </View>
  );

  if (onPress) {
    return <AnimatedPressable scale={0.98} onPress={onPress}>{content}</AnimatedPressable>;
  }
  return content;
}

function SectionHeader({ title }: { title: string }) {
  const { colors: Colors } = useColors();
  return (
    <View style={s.sectionHeader}>
      <View style={[s.sectionBar, { backgroundColor: Colors.accentBright }]} />
      <Text style={[s.sectionTitle, { color: Colors.textSecondary }]}>{title.toUpperCase()}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { colors: Colors } = useColors();
  const [notificationsEnabled] = useState(true);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const { userName, setUserName } = useGameStore();
  const { syncMyProfile } = useFriendsStore();

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const handleOpenNameModal = () => {
    setNameInput(userName);
    setNameModalVisible(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    await setUserName(trimmed);
    try { await syncMyProfile(); } catch {}
    setNameModalVisible(false);
  };

  const handleOpenNotificationSettings = () => {
    Linking.openSettings();
  };

  const handleResetAllData = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all your goals, logs, badges, journal entries, and progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Are you sure?',
              'Last chance. All data will be deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const goals = useGoalStore.getState().goals;
                      for (const g of goals) {
                        await useGoalStore.getState().deleteGoal(g.id);
                      }
                      await useLogStore.getState().loadLogs();
                      await useBadgeStore.getState().loadBadges();
                      await useGameStore.getState().load();
                      await useCoinStore.getState().load();
                      await useJournalStore.getState().loadEntries();
                    } catch {
                      Alert.alert('Error', 'Could not fully reset data. Please restart the app.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@goalkeeper.app?subject=Goal Keeper Support').catch(() => {
      Alert.alert('Could not open email', 'Please email: support@goalkeeper.app');
    });
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: 'transparent' }]} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.content}>

        <SectionHeader title="Profile" />
        <Row
          icon="person-outline"
          label="Display Name"
          sublabel={userName.trim() || 'Not set — tap to add your name'}
          onPress={handleOpenNameModal}
        />

        <SectionHeader title="Notifications" />
        <Row
          icon="notifications-outline"
          label="Reminders"
          sublabel="Manage goal reminder notifications"
          onPress={handleOpenNotificationSettings}
        />

        <SectionHeader title="Data" />
        <Row
          icon="trash-outline"
          label="Reset All Data"
          sublabel="Permanently delete all goals and progress"
          onPress={handleResetAllData}
          danger
        />

        <SectionHeader title="About" />
        <Row
          icon="information-circle-outline"
          label="Version"
          right={<Text style={[s.versionText, { color: Colors.textDisabled }]}>{version}</Text>}
        />
        <Row
          icon="mail-outline"
          label="Contact Support"
          onPress={handleContactSupport}
        />

      </ScrollView>

      {/* Display Name Edit Sheet */}
      <Modal visible={nameModalVisible} transparent animationType="slide" onRequestClose={() => setNameModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalWrap}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setNameModalVisible(false)} />
          <View style={[s.sheet, { backgroundColor: Colors.bg0, borderColor: Colors.border }]}>
            <View style={[s.handle, { backgroundColor: Colors.bg3 }]} />
            <Text style={[s.sheetTitle, { color: Colors.textPrimary }]}>Display Name</Text>
            <Text style={[s.sheetSub, { color: Colors.textSecondary }]}>
              This name appears on the leaderboard and when friends view your profile.
            </Text>
            <TextInput
              style={[s.input, { backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]}
              placeholder="Enter your name…"
              placeholderTextColor={Colors.textDisabled}
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={24}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
              autoFocus
            />
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: nameInput.trim() ? Colors.accentBright : Colors.bg3 }]}
              onPress={handleSaveName}
              activeOpacity={0.85}
            >
              <Text style={[s.saveBtnText, { color: nameInput.trim() ? '#fff' : Colors.textDisabled }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.xs },
  sectionBar:    { width: 3, height: 14, borderRadius: Radius.full },
  sectionTitle:  { fontSize: FontSize.xs, fontFamily: FontFamily.bold, letterSpacing: 1, textTransform: 'uppercase' },

  row:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1 },
  rowIconWrap:{ width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rowText:    { flex: 1 },
  rowLabel:   { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  rowSublabel:{ fontSize: FontSize.sm, fontFamily: FontFamily.regular, marginTop: 2 },

  versionText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    borderWidth: 1, borderBottomWidth: 0,
    padding: Spacing.xl, gap: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.xs },
  sheetTitle: { fontSize: FontSize.xl, fontFamily: FontFamily.bold },
  sheetSub: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  input: {
    borderRadius: Radius.md, borderWidth: 1.5,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.lg, fontFamily: FontFamily.semiBold,
  },
  saveBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xs },
  saveBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.bold },
});
