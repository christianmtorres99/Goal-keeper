import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, Share, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { FontFamily, FontSize, hexAlpha, Radius, Spacing } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import { useFriendsStore, FriendProfile } from '../store/friendsStore';
import { useGameStore } from '../store/gameStore';
import { useLogStore } from '../store/logStore';
import { useTodoXPStore } from '../store/todoXPStore';
import { getPlayerStats } from '../logic/xpEngine';
import { sumXP } from '../utils/xpUtils';
import AnimatedPressable from '../components/common/AnimatedPressable';

interface LeaderboardEntry {
  id: string;
  displayName: string;
  level: number;
  xp: number;
  bestStreak: number;
  isMe: boolean;
}

export default function FriendsScreen() {
  const { colors: Colors, isLight } = useColors();
  const { myInviteCode, friends, load, ensureMyCode, addFriend, removeFriend } = useFriendsStore();
  const { userName, personalRecords } = useGameStore();
  const { logs } = useLogStore();
  const todoXP = useTodoXPStore(s => s.totalXP);

  const [code, setCode] = useState<string>('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    load().then(async () => {
      const c = await ensureMyCode();
      setCode(c);
    });
  }, []);

  // Build "me" entry from local data
  const myXP = sumXP(logs) + todoXP;
  const myStats = getPlayerStats(myXP);
  const myEntry: LeaderboardEntry = {
    id: '__me__',
    displayName: userName.trim() || 'You',
    level: myStats.level,
    xp: myXP,
    bestStreak: personalRecords.longestStreak,
    isMe: true,
  };

  const allEntries: LeaderboardEntry[] = [
    myEntry,
    ...friends.map(f => ({ ...f, isMe: false })),
  ].sort((a, b) => b.level - a.level || b.xp - a.xp);

  const handleCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!code) return;
    try {
      await Share.share({
        message: `Add me on Goal Keeper! My invite code is ${code}. Download the app and enter my code in the Friends section.`,
      });
    } catch {}
  };

  const handleAddFriend = useCallback(async () => {
    const trimCode = newCode.trim().toUpperCase();
    const trimName = newName.trim();
    if (!trimCode || !trimName || saving) return;
    if (trimCode === code) {
      Alert.alert("That's your own code!", 'Enter a friend\'s invite code, not yours.');
      return;
    }
    setSaving(true);
    await addFriend(trimCode, trimName);
    setSaving(false);
    setNewCode('');
    setNewName('');
    setAddModalVisible(false);
  }, [newCode, newName, code, saving, addFriend]);

  const handleRemoveFriend = (friend: FriendProfile) => {
    Alert.alert(
      'Remove Friend',
      `Remove ${friend.displayName} from your friends list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFriend(friend.id) },
      ],
    );
  };

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rankColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : Colors.textSecondary;
    const initial = item.displayName.charAt(0).toUpperCase();
    const avatarColor = item.isMe ? Colors.accentBright : `hsl(${(item.id.charCodeAt(0) * 47) % 360}, 60%, 55%)`;

    return (
      <View style={[styles.entryRow, { backgroundColor: item.isMe ? hexAlpha(Colors.accentBright, 0.08) : Colors.bg2, borderColor: item.isMe ? hexAlpha(Colors.accentBright, 0.3) : Colors.border }]}>
        <Text style={[styles.rank, { color: rankColor, minWidth: 28 }]}>#{index + 1}</Text>
        <View style={[styles.avatar, { backgroundColor: hexAlpha(avatarColor, 0.22), borderColor: hexAlpha(avatarColor, 0.5) }]}>
          <Text style={[styles.avatarText, { color: avatarColor }]}>{initial}</Text>
        </View>
        <View style={styles.entryInfo}>
          <Text style={[styles.entryName, { color: Colors.textPrimary }]} numberOfLines={1}>
            {item.displayName}{item.isMe ? ' (You)' : ''}
          </Text>
          <View style={styles.entryMeta}>
            <Ionicons name="flash" size={11} color={Colors.textSecondary} />
            <Text style={[styles.entryMetaText, { color: Colors.textSecondary }]}>Lv {item.level}</Text>
            <Ionicons name="flame" size={11} color="#F97316" style={{ marginLeft: 6 }} />
            <Text style={[styles.entryMetaText, { color: Colors.textSecondary }]}>{item.bestStreak}d</Text>
          </View>
        </View>
        {!item.isMe && (
          <TouchableOpacity onPress={() => handleRemoveFriend(friends.find(f => f.id === item.id)!)} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={20} color={Colors.textDisabled} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg0 }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* My invite code card */}
        <View style={[styles.codeCard, { backgroundColor: Colors.bg2, borderColor: Colors.border }]}>
          <View style={styles.codeCardHeader}>
            <Text style={[styles.codeCardTitle, { color: Colors.textPrimary }]}>Your Invite Code</Text>
            <Text style={[styles.codeCardSub, { color: Colors.textSecondary }]}>Share this with friends so they can add you</Text>
          </View>
          <View style={[styles.codeBlock, { backgroundColor: Colors.bg3 }]}>
            <Text style={[styles.codeText, { color: Colors.textPrimary }]} selectable>{code || '……'}</Text>
          </View>
          <View style={styles.codeActions}>
            <AnimatedPressable
              style={[styles.codeBtn, { backgroundColor: copied ? hexAlpha('#22C55E', 0.15) : Colors.bg3, borderColor: copied ? '#22C55E' : Colors.border }]}
              onPress={handleCopy}
            >
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#22C55E' : Colors.textPrimary} />
              <Text style={[styles.codeBtnText, { color: copied ? '#22C55E' : Colors.textPrimary }]}>{copied ? 'Copied!' : 'Copy'}</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={[styles.codeBtn, { backgroundColor: Colors.bg3, borderColor: Colors.border }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={16} color={Colors.textPrimary} />
              <Text style={[styles.codeBtnText, { color: Colors.textPrimary }]}>Share</Text>
            </AnimatedPressable>
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>LEADERBOARD</Text>
            <AnimatedPressable
              style={[styles.addBtn, { backgroundColor: Colors.accentBright }]}
              onPress={() => setAddModalVisible(true)}
            >
              <Ionicons name="person-add-outline" size={14} color="#fff" />
              <Text style={styles.addBtnText}>Add Friend</Text>
            </AnimatedPressable>
          </View>
          {allEntries.map((item, index) => (
            <View key={item.id}>{renderEntry({ item, index })}</View>
          ))}
          {allEntries.length === 1 && (
            <Text style={[styles.emptyHint, { color: Colors.textDisabled }]}>
              Add friends by sharing your code and entering theirs.
            </Text>
          )}
        </View>

        {/* Sync notice */}
        <View style={[styles.syncNotice, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', borderColor: Colors.border }]}>
          <Ionicons name="cloud-outline" size={16} color={Colors.textDisabled} />
          <Text style={[styles.syncText, { color: Colors.textDisabled }]}>
            Cloud sync coming soon — stats update manually for now. Share your code with friends and add each other locally.
          </Text>
        </View>

      </ScrollView>

      {/* Add Friend modal */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setAddModalVisible(false)} activeOpacity={1} />
          <View style={[styles.modalSheet, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: Colors.bg3 }]} />
            <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>Add a Friend</Text>
            <Text style={[styles.modalSub, { color: Colors.textSecondary }]}>
              Enter their 6-character invite code and give them a nickname.
            </Text>

            <Text style={[styles.inputLabel, { color: Colors.textSecondary }]}>Invite Code</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]}
              placeholder="e.g. AB3XYZ"
              placeholderTextColor={Colors.textDisabled}
              value={newCode}
              onChangeText={v => setNewCode(v.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Text style={[styles.inputLabel, { color: Colors.textSecondary }]}>Their Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.bg2, borderColor: Colors.border, color: Colors.textPrimary }]}
              placeholder="e.g. Alex"
              placeholderTextColor={Colors.textDisabled}
              value={newName}
              onChangeText={setNewName}
              maxLength={30}
              autoCapitalize="words"
            />

            <TouchableOpacity
              style={[styles.modalAddBtn, { backgroundColor: newCode.trim().length === 6 && newName.trim() ? Colors.accentBright : Colors.bg3 }]}
              onPress={handleAddFriend}
              disabled={saving || !newCode.trim() || !newName.trim()}
              activeOpacity={0.85}
            >
              <Text style={[styles.modalAddBtnText, { color: newCode.trim().length === 6 && newName.trim() ? '#fff' : Colors.textDisabled }]}>
                {saving ? 'Adding…' : 'Add Friend'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  // Code card
  codeCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  codeCardHeader: { gap: 2 },
  codeCardTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.bold },
  codeCardSub: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  codeBlock: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  codeText: { fontSize: 28, fontFamily: FontFamily.extraBold, letterSpacing: 6 },
  codeActions: { flexDirection: 'row', gap: Spacing.sm },
  codeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, borderWidth: 1, paddingVertical: Spacing.sm },
  codeBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  // Section
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: FontSize.xs, fontFamily: FontFamily.extraBold, letterSpacing: 1.5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  addBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: '#fff' },
  // Leaderboard entry
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md,
  },
  rank: { fontSize: FontSize.sm, fontFamily: FontFamily.extraBold, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  avatarText: { fontSize: FontSize.md, fontFamily: FontFamily.extraBold },
  entryInfo: { flex: 1 },
  entryName: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  entryMetaText: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  emptyHint: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, textAlign: 'center', paddingVertical: Spacing.sm },
  // Sync notice
  syncNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  syncText: { flex: 1, fontSize: FontSize.sm, fontFamily: FontFamily.regular, lineHeight: 18 },
  // Add Friend modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    borderWidth: 1, borderBottomWidth: 0,
    padding: Spacing.xl, gap: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.xl,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  modalTitle: { fontSize: FontSize.xl, fontFamily: FontFamily.bold },
  modalSub: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  inputLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.semiBold, letterSpacing: 0.8, textTransform: 'uppercase' },
  input: {
    borderRadius: Radius.md, borderWidth: 1.5,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.md, fontFamily: FontFamily.semiBold,
  },
  modalAddBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  modalAddBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.bold },
});
