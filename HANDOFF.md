# Goal Keeper — Handoff Document
**Date:** 2026-06-02
**Branch:** `claude/project-overview-planning-kXME1`
**Repo:** `christianmtorres99/Goal-keeper`
**CI Status:** EAS build triggered ✓

---

## What This App Is

React Native / Expo SDK ~56.0.3 goal-tracking app with:
- Habit & count-based goals with streaks, XP, and leveling
- Badge/achievement system (38 badges across 8 categories)
- Journal with mood/energy tracking and drawing
- Todo system with scheduled tasks
- Skill tracking screen
- Calendar heatmap
- Weekly review modal
- Daily quests
- Light/dark themes with 6 color palettes each
- Onboarding flow

---

## Tech Stack

- **Framework:** Expo SDK ~56.0.3, React Native, TypeScript
- **State:** Zustand stores (badgeStore, gameStore, goalStore, journalStore, logStore, questStore, restDayStore, scheduledTaskStore, themeStore, todoStore, todoXPStore)
- **DB:** expo-sqlite (tables: `earned_badges`, `todos`, `logs`)
- **Persistence:** AsyncStorage (theme, prefs, quests, todo XP)
- **Animation:** react-native-reanimated v4 (useSharedValue, withRepeat, withSequence, withTiming, cancelAnimation) AND React Native Animated API (modal backdrops/sheets)
- **Navigation:** @react-navigation/bottom-tabs + stack
- **Other:** expo-linear-gradient, @expo/vector-icons (Ionicons), react-native-draggable-flatlist, react-native-safe-area-context

---

## Design System (`src/constants/theme.ts`)

```ts
Spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }
FontSize: { xs: 11, sm: 13, md: 15, lg: 18, xl: 22, xxl: 28, xxxl: 36 }
Radius: { sm, md, lg, full }
Colors: { bg0, bg1, bg2, bg3, accent, accentBright, accentDim, border, textPrimary, textSecondary, success, warning, error, ... }
```

Always use these constants. Never hardcode pixel values, hex colors, or font sizes when a constant exists.

---

## Theme System

### Architecture

The app supports 6 themes (`violet`, `ocean`, `forest`, `crimson`, `golden`, `sakura`) each with a dark and a light variant. The user can choose dark / light / system.

**Three layers, all kept in sync:**

| Layer | File | Purpose |
|-------|------|---------|
| `THEMES` / `LIGHT_THEMES` | `src/constants/themes.ts` | Static palette records |
| `ThemeContext` / `ThemeProvider` | `src/context/ThemeContext.tsx` | React context driven by `useThemeStore` |
| `Colors` (mutable object) | `src/constants/theme.ts` | Legacy fallback for `StyleSheet.create` calls in error/loading states only |

**`useColors()` hook** (`src/hooks/useColors.ts`) — the standard way every component reads colors:
```ts
const { colors, isLight } = useColors();
// colors.bg0, colors.accent, etc.
```

`ThemeProvider` in `App.tsx` wraps the whole navigation tree. It reads `useThemeStore` directly, so any theme/mode change triggers a React context update — **no navigation remount needed**.

### Rule for new screens / components
- Use `useColors()` at the top of the component for any color reference.
- Never use the static `Colors` object in screen code (it's only kept for the bootstrap `StyleSheet.create` in `App.tsx`).
- `StyleSheet.create({})` called inside a component body (not at module level) is fine — pass `colors.*` into it.

### themeStore API
```ts
useThemeStore.getState().setTheme(name: ThemeName)       // persists to AsyncStorage
useThemeStore.getState().setColorMode('dark'|'light'|'system')
```

---

## Project Structure

```
src/
  screens/           # Full screens
    HomeScreen.tsx           — goal list (DraggableFlatList), collapsible "Done" section
    AddGoalScreen.tsx        — habit/count goal creation
    GoalDetailScreen.tsx     — per-goal stats, log history, badges
    StatsScreen.tsx          — analytics, filter by goal/category
    CalendarScreen.tsx       — monthly heatmap, Sunday-first
    JournalScreen.tsx        — journal entries with mood/energy + drawing
    ProfileScreen.tsx        — XP/level card, badge gallery, theme picker, share card
    SkillTrackScreen.tsx     — skill heatmap per category
    WeeklyReviewScreen.tsx   — weekly XP/streak summary modal
    OnboardingScreen.tsx     — first-launch slides
    ArchivedGoalsScreen.tsx  — archived goals list

  components/
    common/    BadgeItem, DailyQuestsCard, LevelUpModal, LevelLadderModal,
               MilestoneCompleteModal, UndoToast, StreakFlame, XPBar,
               LogCountModal, LogNoteModal, BadgeDetailModal, BadgeModal, EmptyState
    goals/     GoalCard (animated flame icon, 2-line names)
    home/      RestDayModal, MoodSuggestionCard
    todos/     TodoSection, ScheduledTaskModal
    calendar/  (calendar sub-components)
    charts/    HeatmapGrid (and others)
    journal/   (journal sub-components)
    profile/   ThemePickerModal

  store/             # Zustand stores (see list above)
  logic/             # Pure business logic
    badgeEngine.ts   — checkBadges() — pure function, no side effects
    streakEngine.ts  — computeStreakWithGrace()
    xpEngine.ts      — getPlayerStats(), getStreakMultiplier()
  utils/             # Helpers (dates, colors, journal, moods, XP, notifications)
  constants/         # theme.ts, badges.ts, themes.ts, xp.ts
  context/           # ThemeContext.tsx
  hooks/             # useColors.ts
  types/index.ts     # All shared TypeScript types
  db/client.ts       # SQLite init + getDb()
```

---

## Badge System

**Definitions:** `src/constants/badges.ts` — `BADGE_DEFINITIONS[]`
**Engine:** `src/logic/badgeEngine.ts` — `checkBadges(params)` pure function
**Store:** `src/store/badgeStore.ts`

### Badge Categories (38 total)
| Category | IDs | Trigger |
|----------|-----|---------|
| streak | streak_1/3/7/14/21/30/45/60/90/120/180/240/365 | currentStreak ≥ threshold |
| logs | logs_1/5/10/25/50/100/250/500 | totalLogs ≥ threshold |
| consistency | perfect_week, perfect_month, comeback, new_best | boolean flags |
| cycle | cycle_1/3/5 | cycleCount ≥ threshold |
| todos | todos_10/50/100/250 | totalTodosCompleted ≥ threshold |
| journal | journal_3/7/30 | journalStreak ≥ threshold |
| time | early_bird (before 8am), night_owl (after 10pm) | logHour |
| level | level_1/3/5/7/10/15/20/25/50 | playerLevel ≥ threshold |

### How to award badges
- **Per-goal:** `useBadgeStore.getState().checkAndAward({ goalId, currentStreak, totalLogs, playerLevel, cycleCount?, isPerfectWeek?, isPerfectMonth?, isComeback?, isNewBest?, logHour? })`
- **Global (todos/journal/time):** `useBadgeStore.getState().checkAndAwardGlobal({ totalTodosCompleted?, journalStreak?, logHour? })`
- Both return `BadgeDefinition[]` of newly earned badges (show in UI)
- Global badges always get `goalId = null` in the DB

---

## Key Patterns & Gotchas

### Async/Zustand
- **Never** call `AsyncStorage.setItem` inside Zustand's `set()` callback — `set()` is synchronous. Always move async ops OUTSIDE `set()`:
  ```ts
  setTheme: async (name) => {
    set(s => ({ ...s, activeTheme: name })); // sync state update
    await AsyncStorage.setItem(KEY, ...);    // async persistence
  }
  ```

### Animation Libraries
- **Reanimated v4** (`useSharedValue`, `useAnimatedStyle`, `withTiming`, `withRepeat`, `withSequence`) — used in GoalCard flame, progress bars, ThemePickerModal sheet.
- **React Native Animated API** — used in modal backdrops and sheet slide-ins (TodoSection, ScheduledTaskModal). Do NOT mix the two in the same animated value.

### GoalCard Flame
`src/components/goals/GoalCard.tsx` — `FlameIcon` component with 4 tiers:
- 0 streak: gray, static
- 1–6: yellow, gentle pulse
- 7–29: orange, pulse
- 30–89: red, shake + particles
- 90+: white/hot, fast shake + more particles

### HomeScreen Collapsible Done Section
`src/screens/HomeScreen.tsx`:
- `pendingGoals` = goals not logged today → DraggableFlatList
- `loggedGoals` = goals logged today → collapsible section in `ListFooterComponent`
- `loggedCollapsed` state controls visibility

### Calendar
Sunday-first week. `firstDow = d.getDay()` (not `(d.getDay()+6)%7`).

### Journal Badge Check
After saving a journal entry, call:
```ts
const streak = computeJournalStreak(entries);
useBadgeStore.getState().checkAndAwardGlobal({ journalStreak: streak });
```

### Todo XP / Badge Check
`todoStore.completeTodo()` increments `AsyncStorage('totalTodosCompleted')` and calls `checkAndAwardGlobal`.

### ThemePickerModal
- `animationType="fade"` (NOT "slide") — slide causes a dark-box artifact on transparent modals.
- The internal `Animated.View` handles its own slide-up animation via `useSharedValue`.
- Preview card palette: `isLight ? LIGHT_THEMES[key] : THEMES[key]`.

---

## Session History Summary

| Session | Key Work |
|---------|----------|
| 1–8 | Core app build: goals, logs, streaks, XP, badges, journal, todos, calendar, stats, profile, themes |
| 9 | Log animation, progress bar, accent bar, 1-min time picker increments |
| 10 | Animated flame icon (4-tier), collapsible "Done" section, journal fixes, todo modal flash fix, ScheduledTaskModal keyboard fix, Calendar sunday-start, Profile gradient, new badges (streak 45/120/240, todos, journal, time-of-day) |
| 11 | metro.config.js fix, code audit (async/Zustand bug, questStore, badgeStore), design audit (tap targets ≥44px, spacing/typography/shadow constants) |
| 12 | Full light mode: migrated all 34 files to `useColors()` + `ThemeContext`; added `ThemeProvider`, `useColors` hook, 6 LIGHT_THEMES palettes; `OVERLAY_LIGHT_MODE`/`OVERLAY_DARK_MODE` constants; `isLight` guard throughout |
| 13 | Light mode polish: chart & badge slot colors, XP bar, share card swatches (+6 light, −2 redundant dark); nav reset fix (removed `key={themeKey}` from NavigationContainer); ThemePickerModal fade animation; light-mode preview cards in theme picker |

---

## What's NOT Done / Possible Next Steps

- No end-to-end tests exist
- No Storybook or component docs
- Push notifications (`src/utils/notifications.ts`) exists but untested on real device
- Weekly review modal is not auto-triggered (must be opened manually from Profile)
- EAS build is configured (Android Preview workflow)

---

## Running Locally

```bash
cd /home/user/Goal-keeper
npx expo start
```

TypeScript check:
```bash
npx tsc --noEmit
```

**Important:** Read `https://docs.expo.dev/versions/v56.0.0/` before writing any Expo-specific code (per AGENTS.md).
