# Goal Keeper — Developer Handoff

**Last updated:** 2026-06-17  
**Active branch:** `claude/project-familiarization-XUrOV`  
**Remote:** `origin` → `https://github.com/christianmtorres99/Goal-keeper`  
**EAS Project ID:** `9d40c864-8d00-4f75-8395-a6688b1b1359`  
**Firebase Project:** `goalie-dfb0b` (Firebase Console → goalie-dfb0b)

---

## 1. What This App Is

Goal Keeper is a gamified habit tracker for Android (React Native / Expo SDK 56). Users log daily completions of personal goals (Habit, Build, Quit types), earn XP, level up through 11 tiers, collect badges, unlock titles, and can compare stats with friends on a global leaderboard backed by Firebase.

All personal habit data is stored **on-device only** (SQLite + AsyncStorage). Only a public stats snapshot (level, XP, streak, title, top badges) syncs to Firebase Firestore.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 56 / React Native 0.85.3 |
| Language | TypeScript 6 |
| State | Zustand 5 (19 stores) |
| Local DB | expo-sqlite (goals, logs, journals, todos, badges) |
| Persistence | @react-native-async-storage (lightweight store state) |
| Cloud backend | Firebase JS SDK v12.15.0 (Anonymous Auth + Firestore) |
| Navigation | React Navigation 7 (bottom tabs + native stack) |
| Icons | Phosphor React Native 3 |
| Fonts | Plus Jakarta Sans (expo-google-fonts) |
| Animations | React Native Reanimated 4 |
| Build/CI | EAS Build (GitHub Actions) |

---

## 3. Current Branch & Git State

### Branch
```
claude/project-familiarization-XUrOV
```

### Recent Commits (newest first)
```
2d1d4dc Fix crash: import from @firebase/* instead of firebase/* for React Native build resolution
e6c3c3c Add Firebase backend: auth, Firestore profile sync, friends invite codes, global leaderboard
0d6415b feat: interactive onboarding, friends leaderboard, and gamification polish
45ceab1 feat: production readiness — Phase 1-3 hardening
5951649 feat: Phase 2 revised — purposeful animations, no idle loops
038c0a9 feat: full UI/UX overhaul — Cinema Dark, Phosphor icons, emoji purge, game-feel animations
3dd8e7f feat: add Quit goal type and Weekly Mini-Challenges (Batch 5)
18498ea Add full gamification expansion: coins, raids, seasons, perks, titles, crafting
```

### Push Command
```bash
git push -u origin claude/project-familiarization-XUrOV
```

---

## 4. Firebase Integration

### Config (already in `src/services/firebase.ts`)
```typescript
const firebaseConfig = {
  apiKey: 'AIzaSyCf-WEBxr3HOBFd0pizytZDmBABAljCm0k',
  authDomain: 'goalie-dfb0b.firebaseapp.com',
  projectId: 'goalie-dfb0b',
  storageBucket: 'goalie-dfb0b.firebasestorage.app',
  messagingSenderId: '4529977651',
  appId: '1:4529977651:web:1b7b3a11c42126dfbce646',
};
```

### Auth
- Anonymous auth via `signInAnonymously` — no signup required
- Persistence via custom AsyncStorage adapter (inline in `firebase.ts`) — survives app restarts
- Each device gets a unique Firebase UID automatically

### Firestore Data Model
```
/users/{uid}
  displayName: string
  inviteCode: string        ← 6-char alphanumeric, e.g. "A7K2XP"
  level: number
  xp: number
  bestStreak: number
  equippedTitle: string
  topBadgeIds: string[]     ← up to 3 most recent badges
  updatedAt: Timestamp

/inviteCodes/{code}
  userId: string            ← reverse lookup: code → uid

/users/{uid}/friends/{friendUid}
  uid: string
  inviteCode: string
  displayName: string
  level: number
  xp: number
  bestStreak: number
  equippedTitle: string
  topBadgeIds: string[]
  addedAt: Timestamp

/leaderboard/{uid}
  (same fields as /users/{uid} plus uid)
  ← indexed on xp desc for top-100 query
```

### Service Files (`src/services/`)

| File | Purpose |
|---|---|
| `firebase.ts` | App init, Auth, Firestore exports |
| `authService.ts` | `ensureAuth()` (anon sign-in), `getCurrentUid()` |
| `profileService.ts` | `initUserProfile()`, `syncProfile(inviteCode)` |
| `friendsService.ts` | `addFriendByCode()`, `getFriends()`, `removeFriend()` |
| `leaderboardService.ts` | `getTopLeaderboard(count=100)` |

### Store: `src/store/friendsStore.ts`
The Zustand store that ties all Firebase services together:
- `load()` — called at app startup in `App.tsx`; runs `ensureAuth → initUserProfile → getFriends → background syncProfile`
- `addFriend(code)` — returns `'success' | 'not_found' | 'self' | 'already_friends' | 'error'`
- `removeFriend(uid)` — removes from Firestore + local state
- `loadLeaderboard()` — fetches top 100 from `/leaderboard`
- `syncMyProfile()` — manually push local stats to cloud
- Caches invite code locally under AsyncStorage key `firebaseInviteCode_v1` so it shows immediately before Firebase loads

---

## 5. CRITICAL: Firebase Import Gotcha

**Always import from `@firebase/*`, never `firebase/*`.**

The `firebase` npm package's sub-paths (e.g. `firebase/auth`) do NOT have a `react-native` export condition. Metro falls back to the browser ESM build, which accesses `window.localStorage` — **this crashes the app immediately on launch**.

The `@firebase/*` packages (e.g. `@firebase/auth`) are the underlying implementations and DO have `react-native` export conditions pointing to their RN builds.

```typescript
// CORRECT
import { signInAnonymously } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';

// WRONG — crashes the app on launch
import { signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
```

This applies to all 5 service files. The fix is already in place as of the latest commit.

---

## 6. Architecture Overview

```
App.tsx
├── Bootstrap sequence (fonts, stores, Firebase auth)
├── Navigation (AppNavigator.tsx)
│   ├── Bottom Tabs: Home | Calendar | Stats | Journal | Profile
│   └── Stack screens: AddGoal, GoalDetail, ArchivedGoals, Settings,
│                       SkillTrack, Shop, BossRaid, Season,
│                       OnboardingScreen, WeeklyReview, Friends
│
├── Screens (src/screens/)   ← 16 screens
├── Stores (src/store/)      ← 19 Zustand stores
├── Services (src/services/) ← 5 Firebase services
├── Logic (src/logic/)       ← xpEngine, badgeEngine, questEngine, etc.
└── Utils (src/utils/)       ← xpUtils, dateUtils, hexAlpha, etc.
```

### XP & Level Formula
```typescript
// src/logic/xpEngine.ts
BASE_XP = 15
xpForLevel(n) = 80 * n^1.65

// Total XP = sumXP(logs) + todoXPStore.totalXP
// Adjusted XP = gameStore.getAdjustedXP(rawXP)  ← applies any multiplier perks
```

### 11 Level Tiers
Seedling (1–5) → Sprout → Apprentice → Journeyman → Adept → Expert → Master → Grandmaster → Legend → Champion → Transcendent (51–55)

---

## 7. All Screens

| Screen | File | Notes |
|---|---|---|
| Home | `HomeScreen.tsx` | Dashboard: active goals, streak, daily log |
| Calendar | `CalendarScreen.tsx` | Month view, log history |
| Stats | `StatsScreen.tsx` | XP chart, skill breakdown, achievements |
| Journal | `JournalScreen.tsx` | Freeform note entries per day |
| Profile | `ProfileScreen.tsx` | Level, badges, titles, coins, Friends nav button |
| Add Goal | `AddGoalScreen.tsx` | Create Habit/Build/Quit goal |
| Goal Detail | `GoalDetailScreen.tsx` | Edit goal, view history |
| Archived Goals | `ArchivedGoalsScreen.tsx` | Completed/deleted goals |
| Settings | `SettingsScreen.tsx` | Notifications, username, data export |
| Skill Track | `SkillTrackScreen.tsx` | Skill tree progression |
| Shop | `ShopScreen.tsx` | Spend coins on perks/titles |
| Boss Raid | `BossRaidScreen.tsx` | Weekly boss challenge |
| Season | `SeasonScreen.tsx` | Seasonal pass/rewards |
| Onboarding | `OnboardingScreen.tsx` | First-launch setup (needs tour rewrite — see §9) |
| Weekly Review | `WeeklyReviewScreen.tsx` | End-of-week summary |
| Friends | `FriendsScreen.tsx` | Friends list + global leaderboard (Firebase-backed) |

---

## 8. All Stores

| Store | Persistence | Notes |
|---|---|---|
| `gameStore` | AsyncStorage | XP multiplier, userName, personal records |
| `goalStore` | SQLite | Goals list |
| `logStore` | SQLite | Daily completion logs |
| `badgeStore` | SQLite | Earned badges |
| `journalStore` | SQLite | Journal entries |
| `todoStore` | SQLite | Quick todos |
| `todoXPStore` | AsyncStorage | XP from todo completions |
| `coinStore` | AsyncStorage | Coin balance |
| `titleStore` | AsyncStorage | Unlocked/equipped titles |
| `perkStore` | AsyncStorage | Unlocked perks |
| `craftingStore` | AsyncStorage | Crafting recipes used |
| `raidStore` | AsyncStorage | Boss raid state |
| `seasonStore` | AsyncStorage | Season pass state |
| `questStore` | AsyncStorage | Active quests |
| `weeklyChallengeStore` | AsyncStorage | Weekly mini-challenges |
| `restDayStore` | AsyncStorage | Rest day tracking |
| `scheduledTaskStore` | AsyncStorage | Notification schedule |
| `themeStore` | AsyncStorage | Light/dark theme |
| `friendsStore` | Firebase + AsyncStorage cache | Friends, leaderboard |

---

## 9. Pending Features (Next Steps)

### A. Onboarding Tour (Priority 1)
**File:** `src/screens/OnboardingScreen.tsx`

Rewrite as interactive 7-step tour:
1. Welcome + app name intro
2. Name entry → calls `gameStore.setUserName(name)` (function already exists)
3. Create first goal (mini AddGoal form)
4. Feature tour — Home tab
5. Feature tour — Calendar tab
6. Feature tour — Stats tab
7. Feature tour — Profile tab → "You're ready!"

### B. Gamification Polish (Priority 2)
- **Confetti on level-up:** Add confetti burst to `LevelUpModal.tsx` when it opens after a tier change
- **Tier progression timeline:** Redesign `LevelLadderModal.tsx` as a horizontal-scroll timeline showing all 11 tiers with the user's position highlighted
- **Extract tiers constant:** Move tier data to `src/constants/tiers.ts` so both `xpEngine.ts` and the timeline UI can share it

### C. Profile Sync on Goal Log (Priority 3)
**Problem:** `syncProfile()` is only called at app startup. Logging a goal mid-session doesn't update the leaderboard until the next launch.

**Fix:** In the log store (or wherever goal completions are recorded), call `useFriendsStore.getState().syncMyProfile()` after a successful write. Fire-and-forget so it doesn't block the UI.

### D. EAS Update / OTA Auto-Deploy (Priority 4)
See §10 below for full step-by-step instructions.

---

## 10. EAS Update — Auto-Deploy to expo.dev

Currently `app.json` has `"updates": { "enabled": false }` and GitHub Actions only builds APKs. To push OTA JavaScript updates to the installed app automatically on every push:

### Step 1: Install expo-updates
```bash
npx expo install expo-updates
```

### Step 2: Update `app.json`
```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "url": "https://u.expo.dev/9d40c864-8d00-4f75-8395-a6688b1b1359"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

> `runtimeVersion` with `"appVersion"` policy ties OTA updates to users on the same app version (1.2.0). When you add a native package or change permissions, bump `version` in `app.json` and build a new APK — existing installs won't receive that update over-the-air.

### Step 3: Add channels to `eas.json`
```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" }
    },
    "production": {
      "channel": "production",
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### Step 4: Update `.github/workflows/eas-build.yml`
Replace the existing workflow with:

```yaml
name: EAS Build + Update (Android Preview)

on:
  push:
    branches:
      - claude/goal-tracking-app-QiCgn
      - claude/project-overview-planning-kXME1
      - claude/project-familiarization-XUrOV

jobs:
  build:
    name: Build Android Preview
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build
        run: eas build --platform android --profile preview --non-interactive

      - name: Publish OTA Update
        run: eas update --branch preview --message "Auto update from ${{ github.sha }}" --non-interactive
```

### Step 5: Rebuild the app once
After adding `expo-updates` and modifying `app.json`, you must build a new APK and install it. The OTA channel URL is embedded in the native binary at build time.

```bash
eas build --platform android --profile preview
```

### After That
Every push to the branch will:
1. Build a new APK (native changes) — or skip the build step if you remove it for JS-only pushes
2. Run `eas update` → pushes a new JS bundle to the `preview` channel on expo.dev
3. The app auto-applies the update on next launch (when online)

### Verify OTA Is Working
In [expo.dev](https://expo.dev) → Your Project → Updates — each push creates a new update entry. On device: launch the app twice after a push (first launch downloads, second applies).

---

## 11. EAS Build — Existing Setup

The current workflow (`.github/workflows/eas-build.yml`) triggers an Android Preview APK build on every push to the three active branches. The `EXPO_TOKEN` secret must be set in GitHub → Repo Settings → Secrets and Variables → Actions → `EXPO_TOKEN`.

To add a new branch to auto-builds, add it under `branches:` in the workflow file.

---

## 12. Known Gotchas & Decisions

### Firebase imports must use `@firebase/*`
See §5. This is the single most important thing to remember when working with Firebase in this codebase.

### No user accounts
Auth is fully anonymous — no login screen, no email, no password. Each install gets a unique Firebase UID automatically.

### Local-first architecture
All habit data stays on device. Firebase holds only a public profile snapshot. The app works offline; friends see your stats as of the last sync.

### AsyncStorage cache for invite code
The invite code is cached under `firebaseInviteCode_v1` so the Friends screen shows it immediately, before Firebase initializes.

### XP is adjusted by perks
The XP value synced to Firebase uses `gameStore.getAdjustedXP(rawXP)` which applies any multiplier perks. The leaderboard shows effective XP, not raw logged XP — this is intentional.

### Top badges are last 3, reversed
`topBadgeIds` = last 3 entries from `badgeStore.earnedBadges`, reversed (most recent first).

### Firestore security rules — update before production
Rules are currently in test mode (open read/write). Before public release, apply these rules in the Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if true;
      allow write: if request.auth.uid == uid;

      match /friends/{friendId} {
        allow read, write: if request.auth.uid == uid;
      }
    }
    match /inviteCodes/{code} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /leaderboard/{uid} {
      allow read: if true;
      allow write: if request.auth.uid == uid;
    }
  }
}
```

---

## 13. Verification Checklist

After picking up and making changes, verify these manually:

- [ ] `expo start --clear` — app launches without crash
- [ ] Profile screen → "Friends & Leaderboard" button navigates to FriendsScreen
- [ ] Invite code card shows a 6-char code (e.g. "A7K2XP")
- [ ] Copy button copies the code to clipboard
- [ ] Share button opens the native share sheet
- [ ] Sync button calls `syncMyProfile()` with brief loading indicator
- [ ] "Add Friend" modal — entering own code shows "That's you!" error
- [ ] Entering a nonexistent code shows "No user found" error
- [ ] Global Top 100 tab loads the leaderboard
- [ ] Firebase Console → Authentication → Users shows anonymous user entries
- [ ] Firebase Console → Firestore → leaderboard collection shows your user document
