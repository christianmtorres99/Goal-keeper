import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, Share, Platform, ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { FontFamily, FontSize, hexAlpha, Radius, Spacing } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import { useFriendsStore } from '../store/friendsStore';
import type { FriendEntry } from '../store/friendsStore';
import type { PublicProfile } from '../services/profileService';
import { useGameStore } from '../store/gameStore';
import { useLogStore } from '../store/logStore';
import { useTodoXPStore } from '../store/todoXPStore';
import { getPlayerStats } from '../logic/xpEngine';
import { sumXP } from '../utils/xpUtils';
import AnimatedPressable from '../components/common/AnimatedPressable';

type Tab = 'friends' | 'global';

function formatXP(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const AVATAR_COLORS = ['#7C3AED', '#0891B2', '#059669', '#DC2626', '#D97706', '#EC4899'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function RankLabel({ rank }: { rank: number }) {
  const gold = '#F59E0B', silver = '#9CA3AF', bronze = '#B45309';
  const color = rank === 1 ? gold : rank === 2 ? silver : rank === 3 ? bronze : '#6B7280';
  return (
    <View style={[styles.rankWrap, { backgroundColor: hexAlpha(color, 0.13) }]}>
      <Text style={[styles.rankText, { color }]}>{rank}</Text>
    </View>
  );
}

interface RowProps {
  rank: number;
  item: { uid?: string; displayName: string; level: number; xp: number; bestStreak: number; equippedTitle?: string };
  isYou: boolean;
  onRemove?: () => void;
}
function Row({ rank, item, isYou, onRemove }: RowProps) {
  const { colors: Colors } = useColors();
  const color = avatarColor(item.displayName);
  const initial = (item.displayName || '?')[0].toUpperCase();
  return (
    <View style={[styles.row, {
      backgroundColor: isYou ? hexAlpha(Colors.accentBright, 0.1) : Colors.bg2,
      borderColor: isYou ? hexAlpha(Colors.accentBright, 0.35) : Colors.border,
    }]}>
      <RankLabel rank={rank} />
      <View style={[styles.avatar, { backgroundColor: hexAlpha(color, 0.2), borderColor: hexAlpha(color, 0.5) }]}>
        <Text style={[styles.avatarText, { color }]}>{initial}</Text>
      </View>
      <View style={styles.rowMid}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: Colors.textPrimary }]} numberOfLines={1}>{item.displayName}</Text>
          {isYou && (
            <View style={[styles.youChip, { backgroundColor: hexAlpha(Colors.accentBright, 0.18) }]}>
              <Text style={[styles.youChipText, { color: Colors.accentBright }]}>YOU</Text>
            </View>
          )}
          {item.equippedTitle ? (
            <Text style={[styles.titleHint, { color: Colors.textDisabled }]} numberOfLines={1}> · {item.equippedTitle}</Text>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: Colors.textSecondary }]}>Lv {item.level}</Text>
          <Text style={[styles.dot, { color: Colors.textDisabled }]}>·</Text>
          <Ionicons name="flame" size={11} color="#F97316" />
          <Text style={[styles.meta, { color: Colors.textSecondary }]}>{item.bestStreak}</Text>
          <Text style={[styles.dot, { color: Colors.textDisabled }]}>·</Text>
          <Text style={[styles.meta, { color: Colors.textSecondary }]}>{formatXP(item.xp)} XP</Text>
        </View>
      </View>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Ionicons name="close-circle-outline" size={20} color={Colors.textDisabled} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function FriendsScreen() {
  const { colors: Colors, isLight } = useColors();
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('friends');
  const [addVisible, setAddVisible] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [copied, setCopied] = useState(false);

  const {
    myUid, myInviteCode, friends, leaderboard,
    loading, leaderboardLoading, error,
    addFriend, removeFriend, loadLeaderboard, syncMyProfile,
  } = useFriendsStore();

  const logs = useLogStore(s => s.logs);
  const todoXP = useTodoXPStore(s => s.totalXP);
  const { getAdjustedXP, userName, personalRecords } = useGameStore();
  const adjustedXP = getAdjustedXP(sumXP(logs) + todoXP);
  const { level } = getPlayerStats(adjustedXP);

  const myEntry = {
    uid: myUid || '__me__',
    displayName: userName.trim() || 'You',
    level,
    xp: adjustedXP,
    bestStreak: personalRecords.longestStreak,
    equippedTitle: '',
  };

  useEffect(() => {
    if (tab === 'global') loadLeaderboard();
  }, [tab]);

  const handleCopy = useCallback(async () => {
    if (!myInviteCode) return;
    await Clipboard.setStringAsync(myInviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [myInviteCode]);

  const handleShare = useCallback(async () => {
    if (!myInviteCode) return;
    try {
      await Share.share({
        message: `Add me on Goal Keeper! My invite code is ${myInviteCode}.\n\nDownload the app and enter my code in the Friends section to see each other's progress.`,
      });
    } catch {}
  }, [myInviteCode]);

  const handleAddFriend = useCallback(async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code || addLoading) return;
    setAddLoading(true);
    setAddError('');
    const result = await addFriend(code);
    setAddLoading(false);
    if (result === 'success') {
      setCodeInput('');
      setAddVisible(false);
    } else if (result === 'not_found') {
      setAddError('No user found with that code. Double-check for typos.');
    } else if (result === 'self') {
      setAddError("That's your own code! Enter a friend's code.");
    } else if (result === 'already_friends') {
      setAddError("You're already friends with this person.");
    } else {
      setAddError('Something went wrong. Check your connection and try again.');
    }
  }, [codeInput, addLoading, addFriend]);

  const handleRemove = useCallback((friend: FriendEntry) => {
    Alert.alert('Remove Friend', `Remove ${friend.displayName} from your friends list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFriend(friend.uid) },
    ]);
  }, [removeFriend]);

  const friendRows = [myEntry, ...friends.sort((a, b) => b.xp - a.xp)];
  const myGlobalRank = leaderboard.findIndex(e => e.uid === myUid) + 1;
  const formattedCode = myInviteCode
    ? `${myInviteCode.slice(0, 3)}-${myInviteCode.slice(3)}`
    : loading ? '······' : '------';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg0 }]} edges={['bottom']}>

      {/* Invite Code Hero */}
      <LinearGradient
        colors={isLight ? ['#EDE9FE', '#F5F3FF', Colors.bg0] : ['#1E1B4B', '#13102E', Colors.bg0]}
        style={styles.hero}
      >
        <Text style={[styles.heroLabel, { color: hexAlpha('#7C3AED', isLight ? 0.75 : 0.55) }]}>
          YOUR INVITE CODE
        </Text>
        <Text style={[styles.heroCode, { color: isLight ? '#3730A3' : '#A5B4FC' }]}>{formattedCode}</Text>
        <Text style={[styles.heroSub, { color: Colors.textDisabled }]}>
          Share this code so friends can add you
        </Text>
        <View style={styles.heroButtons}>
          <AnimatedPressable
            scale={0.95}
            style={[styles.heroBtn, { backgroundColor: hexAlpha('#7C3AED', 0.16), borderColor: hexAlpha('#7C3AED', 0.4) }]}
            onPress={handleCopy}
          >
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={15} color={copied ? '#22C55E' : '#7C3AED'} />
            <Text style={[styles.heroBtnText, { color: copied ? '#22C55E' : '#7C3AED' }]}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            scale={0.95}
            style={[styles.heroBtn, { backgroundColor: hexAlpha('#7C3AED', 0.16), borderColor: hexAlpha('#7C3AED', 0.4) }]}
            onPress={handleShare}
          >
            <Ionicons name="share-social-outline" size={15} color="#7C3AED" />
            <Text style={[styles.heroBtnText, { color: '#7C3AED' }]}>Share</Text>
          </AnimatedPressable>
          <AnimatedPressable
            scale={0.95}
            style={[styles.heroBtn, { backgroundColor: hexAlpha(Colors.accentBright, 0.14), borderColor: hexAlpha(Colors.accentBright, 0.35) }]}
            onPress={syncMyProfile}
          >
            <Ionicons name="cloud-upload-outline" size={15} color={Colors.accentBright} />
            <Text style={[styles.heroBtnText, { color: Colors.accentBright }]}>Sync</Text>
          </AnimatedPressable>
        </View>
        {error ? (
          <View style={[styles.offlineBanner, { backgroundColor: hexAlpha(Colors.danger, 0.1) }]}>
            <Ionicons name="cloud-offline-outline" size={13} color={Colors.danger} />
            <Text style={[styles.offlineText, { color: Colors.danger }]}>{error}</Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: Colors.border }]}>
        {(['friends', 'global'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, tab === t && [styles.tabActive, { borderBottomColor: Colors.accentBright }]]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: tab === t ? Colors.accentBright : Colors.textSecondary }]}>
              {t === 'friends'
                ? `Friends${friends.length > 0 ? ` (${friends.length})` : ''}`
                : 'Global Top 100'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Friends Tab */}
      {tab === 'friends' && (
        <FlatList
          data={friendRows}
          keyExtractor={item => ('uid' in item ? item.uid : '__me__')}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <AnimatedPressable
              scale={0.97}
              style={[styles.addFriendBtn, { backgroundColor: Colors.accentBright }]}
              onPress={() => { setCodeInput(''); setAddError(''); setAddVisible(true); }}
            >
              <Ionicons name="person-add-outline" size={17} color="#fff" />
              <Text style={styles.addFriendBtnText}>Add Friend by Code</Text>
            </AnimatedPressable>
          }
          ListEmptyComponent={null}
          renderItem={({ item, index }) => (
            <Row
              rank={index + 1}
              item={item}
              isYou={'uid' in item && item.uid === (myUid || '__me__')}
              onRemove={'uid' in item && item.uid !== (myUid || '__me__') && item.uid !== '__me__'
                ? () => handleRemove(item as FriendEntry)
                : undefined}
            />
          )}
          ListFooterComponent={
            friends.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={38} color={Colors.textDisabled} />
                <Text style={[styles.emptyTitle, { color: Colors.textSecondary }]}>No friends yet</Text>
                <Text style={[styles.emptyHint, { color: Colors.textDisabled }]}>
                  Share your code or tap "Add Friend" to enter someone else's code.
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Global Leaderboard Tab */}
      {tab === 'global' && (
        leaderboardLoading ? (
          <View style={styles.loadBox}>
            <ActivityIndicator color={Colors.accentBright} size="large" />
            <Text style={[styles.loadText, { color: Colors.textSecondary }]}>Loading leaderboard…</Text>
          </View>
        ) : (
          <FlatList
            data={leaderboard}
            keyExtractor={item => item.uid}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              myGlobalRank > 0 ? (
                <View style={[styles.myRankCard, { backgroundColor: hexAlpha(Colors.accentBright, 0.1), borderColor: hexAlpha(Colors.accentBright, 0.28) }]}>
                  <Ionicons name="trophy-outline" size={15} color={Colors.accentBright} />
                  <Text style={[styles.myRankText, { color: Colors.accentBright }]}>
                    You are #{myGlobalRank} globally
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="podium-outline" size={38} color={Colors.textDisabled} />
                <Text style={[styles.emptyTitle, { color: Colors.textSecondary }]}>Leaderboard is empty</Text>
                <Text style={[styles.emptyHint, { color: Colors.textDisabled }]}>
                  Log your goals and tap Sync to appear here!
                </Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <Row
                rank={index + 1}
                item={item as unknown as FriendEntry}
                isYou={item.uid === myUid}
              />
            )}
          />
        )
      )}

      {/* Add Friend Modal */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setAddVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: Colors.bg1, borderColor: Colors.border }]}>
            <View style={[styles.handle, { backgroundColor: Colors.bg3 }]} />
            <Text style={[styles.sheetTitle, { color: Colors.textPrimary }]}>Add a Friend</Text>
            <Text style={[styles.sheetSub, { color: Colors.textSecondary }]}>
              Enter their 6-character invite code. Their name and stats will load automatically.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.bg2, borderColor: addError ? Colors.danger : Colors.border, color: Colors.textPrimary }]}
              placeholder="e.g. AB3XYZ"
              placeholderTextColor={Colors.textDisabled}
              value={codeInput}
              onChangeText={v => { setCodeInput(v.toUpperCase()); setAddError(''); }}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleAddFriend}
            />
            {addError ? (
              <Text style={[styles.addError, { color: Colors.danger }]}>{addError}</Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.addBtn,
                { backgroundColor: codeInput.trim().length === 6 && !addLoading ? Colors.accentBright : Colors.bg3 },
              ]}
              onPress={handleAddFriend}
              disabled={addLoading || codeInput.trim().length < 6}
              activeOpacity={0.85}
            >
              {addLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[styles.addBtnText, { color: codeInput.trim().length === 6 ? '#fff' : Colors.textDisabled }]}>
                    Add Friend
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  hero: {
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
  },
  heroLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.extraBold, letterSpacing: 2.5 },
  heroCode: { fontSize: 34, fontFamily: FontFamily.extraBold, letterSpacing: 8 },
  heroSub: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  heroButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1,
  },
  heroBtnText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 6,
    marginTop: Spacing.xs,
  },
  offlineText: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },

  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 112 },

  addFriendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderRadius: Radius.md, paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  addFriendBtnText: { color: '#fff', fontSize: FontSize.md, fontFamily: FontFamily.bold },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1,
  },
  rankWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: FontSize.sm, fontFamily: FontFamily.extraBold },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  avatarText: { fontSize: FontSize.md, fontFamily: FontFamily.extraBold },
  rowMid: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'nowrap' },
  name: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold, flexShrink: 1 },
  youChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  youChipText: { fontSize: 9, fontFamily: FontFamily.extraBold, letterSpacing: 0.5 },
  titleHint: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { fontSize: FontSize.xs, fontFamily: FontFamily.regular },
  dot: { fontSize: FontSize.xs },

  loadBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadText: { fontSize: FontSize.md, fontFamily: FontFamily.regular },

  myRankCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  myRankText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },

  emptyBox: { alignItems: 'center', paddingVertical: 36, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  emptyHint: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, textAlign: 'center', paddingHorizontal: Spacing.xl },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    borderWidth: 1, borderBottomWidth: 0,
    padding: Spacing.xl, gap: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.xl,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  sheetTitle: { fontSize: FontSize.xl, fontFamily: FontFamily.bold },
  sheetSub: { fontSize: FontSize.sm, fontFamily: FontFamily.regular },
  input: {
    borderRadius: Radius.md, borderWidth: 1.5,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: 22, fontFamily: FontFamily.bold, letterSpacing: 4, textAlign: 'center',
  },
  addError: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, textAlign: 'center' },
  addBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xs },
  addBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.bold },
});
