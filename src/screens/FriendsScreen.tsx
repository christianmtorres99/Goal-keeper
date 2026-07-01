import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, Share, Platform, ActivityIndicator,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FontFamily, FontSize, hexAlpha, Radius, Spacing } from '../constants/theme';
import { useColors } from '../hooks/useColors';
import { useFriendsStore } from '../store/friendsStore';
import type { FriendEntry, FriendRequest } from '../store/friendsStore';
import type { PublicProfile } from '../services/profileService';
import { useGameStore } from '../store/gameStore';
import { useLogStore } from '../store/logStore';
import { useTodoXPStore } from '../store/todoXPStore';
import { getPlayerStats } from '../logic/xpEngine';
import { sumXP } from '../utils/xpUtils';
import AnimatedPressable from '../components/common/AnimatedPressable';
import { BADGE_DEFINITIONS } from '../constants/badges';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Tab = 'friends' | 'global';
type LeaderboardFilter = 'daily' | 'weekly' | 'monthly' | 'alltime';

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
  onPress?: () => void;
}
function Row({ rank, item, isYou, onRemove, onPress }: RowProps) {
  const { colors: Colors } = useColors();
  const color = avatarColor(item.displayName);
  const initial = (item.displayName || '?')[0].toUpperCase();
  const inner = (
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
      {onPress && !onRemove && (
        <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
      )}
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.75}>{inner}</TouchableOpacity>;
  }
  return inner;
}

export default function FriendsScreen() {
  const { colors: Colors, isLight } = useColors();
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('friends');
  const [leaderboardFilter, setLeaderboardFilter] = useState<LeaderboardFilter>('alltime');
  const [addVisible, setAddVisible] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [copied, setCopied] = useState(false);

  const {
    myUid, myInviteCode, friends, pendingRequests, leaderboard,
    loading, leaderboardLoading, error,
    load, sendRequest, acceptRequest, declineRequest, removeFriend, loadLeaderboard, syncMyProfile,
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
    if (!myUid || error) load();
  }, []);

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

  const handleSendRequest = useCallback(async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code || addLoading) return;
    setAddLoading(true);
    setAddError('');
    const result = await sendRequest(code);
    setAddLoading(false);
    if (result === 'success') {
      setCodeInput('');
      setAddVisible(false);
      Alert.alert('Request Sent!', 'Your friend request has been sent. They\'ll see it when they open the app.');
    } else if (result === 'not_found') {
      setAddError('No user found with that code. Double-check for typos.');
    } else if (result === 'self') {
      setAddError("That's your own code! Enter a friend's code.");
    } else if (result === 'already_friends') {
      setAddError("You're already friends with this person.");
    } else if (result === 'already_sent') {
      setAddError("You already sent a request to this person. Wait for them to accept.");
    } else {
      setAddError('Something went wrong. Check your connection and try again.');
    }
  }, [codeInput, addLoading, sendRequest]);

  const handleRemove = useCallback((friend: FriendEntry) => {
    Alert.alert('Remove Friend', `Remove ${friend.displayName} from your friends list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFriend(friend.uid) },
    ]);
  }, [removeFriend]);

  const handleAcceptRequest = useCallback((req: FriendRequest) => {
    Alert.alert('Accept Request', `Add ${req.fromDisplayName} as a friend?`, [
      { text: 'Decline', style: 'destructive', onPress: () => declineRequest(req.fromUid) },
      { text: 'Accept', onPress: () => acceptRequest(req.fromUid) },
    ]);
  }, [acceptRequest, declineRequest]);

  const navigateToFriendProfile = useCallback((friend: FriendEntry) => {
    navigation.navigate('FriendProfile', {
      uid: friend.uid,
      displayName: friend.displayName,
      level: friend.level,
      xp: friend.xp,
      bestStreak: friend.bestStreak,
      equippedTitle: friend.equippedTitle || undefined,
      topBadgeIds: friend.topBadgeIds || [],
    });
  }, [navigation]);

  const friendRows = [myEntry, ...friends.sort((a, b) => b.xp - a.xp)];
  const sortedLeaderboard = React.useMemo(() => {
    if (leaderboard.length === 0) return leaderboard;
    const scoreKey: Record<LeaderboardFilter, keyof typeof leaderboard[0]> = {
      daily: 'xpToday',
      weekly: 'xpThisWeek',
      monthly: 'xpThisMonth',
      alltime: 'leaderboardScore',
    };
    const key = scoreKey[leaderboardFilter];
    return [...leaderboard].sort((a, b) => ((b[key] as number) ?? 0) - ((a[key] as number) ?? 0));
  }, [leaderboard, leaderboardFilter]);

  const myGlobalRank = sortedLeaderboard.findIndex(e => e.uid === myUid) + 1;
  const formattedCode = myInviteCode
    ? `${myInviteCode.slice(0, 3)}-${myInviteCode.slice(3)}`
    : loading ? '······' : '------';

  const hasPendingRequests = pendingRequests.length > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['bottom']}>

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
          Share this code so friends can send you a request
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
            <View style={styles.tabInner}>
              <Text style={[styles.tabText, { color: tab === t ? Colors.accentBright : Colors.textSecondary }]}>
                {t === 'friends'
                  ? `Friends${friends.length > 0 ? ` (${friends.length})` : ''}`
                  : 'Global Top 100'}
              </Text>
              {t === 'friends' && hasPendingRequests && (
                <View style={[styles.requestBadge, { backgroundColor: Colors.danger }]}>
                  <Text style={styles.requestBadgeText}>{pendingRequests.length}</Text>
                </View>
              )}
            </View>
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
            <>
              {/* Pending Requests */}
              {hasPendingRequests && (
                <View style={styles.pendingSection}>
                  <View style={styles.pendingHeader}>
                    <Ionicons name="person-add" size={15} color={Colors.warning} />
                    <Text style={[styles.pendingTitle, { color: Colors.warning }]}>
                      Friend Requests ({pendingRequests.length})
                    </Text>
                  </View>
                  {pendingRequests.map(req => (
                    <View key={req.fromUid} style={[styles.requestRow, { backgroundColor: Colors.bg2, borderColor: hexAlpha(Colors.warning, 0.3) }]}>
                      <View style={[styles.requestAvatar, { backgroundColor: hexAlpha(avatarColor(req.fromDisplayName), 0.2) }]}>
                        <Text style={[styles.requestAvatarText, { color: avatarColor(req.fromDisplayName) }]}>
                          {(req.fromDisplayName || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.requestMid}>
                        <Text style={[styles.requestName, { color: Colors.textPrimary }]}>{req.fromDisplayName}</Text>
                        <Text style={[styles.requestCode, { color: Colors.textDisabled }]}>Code: {req.fromCode}</Text>
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={[styles.requestBtn, { backgroundColor: hexAlpha(Colors.success, 0.15), borderColor: Colors.success }]}
                          onPress={() => acceptRequest(req.fromUid)}
                        >
                          <Ionicons name="checkmark" size={16} color={Colors.success} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.requestBtn, { backgroundColor: hexAlpha(Colors.danger, 0.1), borderColor: hexAlpha(Colors.danger, 0.4) }]}
                          onPress={() => declineRequest(req.fromUid)}
                        >
                          <Ionicons name="close" size={16} color={Colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              <AnimatedPressable
                scale={0.97}
                style={[styles.addFriendBtn, { backgroundColor: Colors.accentBright }]}
                onPress={() => { setCodeInput(''); setAddError(''); setAddVisible(true); }}
              >
                <Ionicons name="person-add-outline" size={17} color="#fff" />
                <Text style={styles.addFriendBtnText}>Send Friend Request</Text>
              </AnimatedPressable>
            </>
          }
          ListEmptyComponent={null}
          renderItem={({ item, index }) => {
            const isYou = 'uid' in item && item.uid === (myUid || '__me__');
            const isFriend = !isYou && 'uid' in item && item.uid !== '__me__';
            return (
              <Row
                rank={index + 1}
                item={item}
                isYou={isYou}
                onRemove={isFriend ? () => handleRemove(item as FriendEntry) : undefined}
                onPress={isFriend ? () => navigateToFriendProfile(item as FriendEntry) : undefined}
              />
            );
          }}
          ListFooterComponent={
            friends.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={38} color={Colors.textDisabled} />
                <Text style={[styles.emptyTitle, { color: Colors.textSecondary }]}>No friends yet</Text>
                <Text style={[styles.emptyHint, { color: Colors.textDisabled }]}>
                  Share your code or tap "Send Friend Request" to add someone by their code.
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
            data={sortedLeaderboard}
            keyExtractor={item => item.uid}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
                  {([
                    { id: 'daily' as const, label: 'Daily' },
                    { id: 'weekly' as const, label: 'Weekly' },
                    { id: 'monthly' as const, label: 'Monthly' },
                    { id: 'alltime' as const, label: 'All-time' },
                  ]).map(f => (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.filterPill, leaderboardFilter === f.id && { backgroundColor: Colors.accentBright }]}
                      onPress={() => setLeaderboardFilter(f.id)}
                    >
                      <Text style={[styles.filterPillText, { color: leaderboardFilter === f.id ? '#fff' : Colors.textSecondary }]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {myGlobalRank > 0 ? (
                  <View style={[styles.myRankCard, { backgroundColor: hexAlpha(Colors.accentBright, 0.1), borderColor: hexAlpha(Colors.accentBright, 0.28) }]}>
                    <Ionicons name="trophy-outline" size={15} color={Colors.accentBright} />
                    <Text style={[styles.myRankText, { color: Colors.accentBright }]}>
                      You are #{myGlobalRank} globally
                    </Text>
                  </View>
                ) : null}
              </>
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
            renderItem={({ item, index }) => {
              const isYou = item.uid === myUid;
              const isFriend = !isYou && friends.some(f => f.uid === item.uid);
              return (
                <Row
                  rank={index + 1}
                  item={item as unknown as FriendEntry}
                  isYou={isYou}
                  onPress={isFriend ? () => {
                    const friend = friends.find(f => f.uid === item.uid);
                    if (friend) navigateToFriendProfile(friend);
                  } : undefined}
                />
              );
            }}
          />
        )
      )}

      {/* Send Request Modal */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setAddVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: Colors.bg0, borderColor: Colors.border }]}>
            <View style={[styles.handle, { backgroundColor: Colors.bg3 }]} />
            <Text style={[styles.sheetTitle, { color: Colors.textPrimary }]}>Send Friend Request</Text>
            <Text style={[styles.sheetSub, { color: Colors.textSecondary }]}>
              Enter their 6-character invite code. They'll receive a notification and can accept or decline.
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
              onSubmitEditing={handleSendRequest}
            />
            {addError ? (
              <Text style={[styles.addError, { color: Colors.danger }]}>{addError}</Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.addBtn,
                { backgroundColor: codeInput.trim().length === 6 && !addLoading ? Colors.accentBright : Colors.bg3 },
              ]}
              onPress={handleSendRequest}
              disabled={addLoading || codeInput.trim().length < 6}
              activeOpacity={0.85}
            >
              {addLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[styles.addBtnText, { color: codeInput.trim().length === 6 ? '#fff' : Colors.textDisabled }]}>
                    Send Request
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

  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },
  requestBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  requestBadgeText: { color: '#fff', fontSize: 10, fontFamily: FontFamily.bold },

  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 112 },

  pendingSection: { gap: Spacing.sm, marginBottom: Spacing.xs },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  pendingTitle: { fontSize: FontSize.sm, fontFamily: FontFamily.bold },
  requestRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1,
  },
  requestAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  requestAvatarText: { fontSize: FontSize.md, fontFamily: FontFamily.bold },
  requestMid: { flex: 1 },
  requestName: { fontSize: FontSize.md, fontFamily: FontFamily.semiBold },
  requestCode: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: Spacing.xs },
  requestBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

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

  filterPills: { flexDirection: 'row', gap: Spacing.sm, paddingBottom: Spacing.sm },
  filterPill: {
    borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  filterPillText: { fontSize: FontSize.sm, fontFamily: FontFamily.semiBold },

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
