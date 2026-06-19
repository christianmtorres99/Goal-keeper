import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { House, CalendarDots, ChartBar, Trophy } from 'phosphor-react-native';
import { FontFamily, hexAlpha } from '../constants/theme';
import { Spring } from '../constants/motion';
import { useColors } from '../hooks/useColors';

import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import StatsScreen from '../screens/StatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GoalDetailScreen from '../screens/GoalDetailScreen';
import AddGoalScreen from '../screens/AddGoalScreen';
import ArchivedGoalsScreen from '../screens/ArchivedGoalsScreen';
import SkillTrackScreen from '../screens/SkillTrackScreen';
import JournalScreen from '../screens/JournalScreen';
import BossRaidScreen from '../screens/BossRaidScreen';
import SeasonScreen from '../screens/SeasonScreen';
import ShopScreen from '../screens/ShopScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FriendsScreen from '../screens/FriendsScreen';
import type { GoalCategory } from '../types';

export type RootStackParamList = {
  Tabs: undefined;
  GoalDetail: { goalId: string };
  AddGoal: { goalId?: string };
  ArchivedGoals: undefined;
  SkillTrack: { category: GoalCategory; customLabel?: string };
  Journal: { date?: string } | undefined;
  BossRaid: undefined;
  Season: undefined;
  Shop: undefined;
  Settings: undefined;
  Friends: undefined;
};

export type TabParamList = {
  Home: undefined;
  Calendar: undefined;
  Stats: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

type PhosphorIcon = React.ComponentType<{ size: number; color: string; weight: 'fill' | 'regular' }>;

function TabIcon({ Icon, color, focused }: { Icon: PhosphorIcon; color: string; focused: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withSpring(1.24, Spring.bouncy),
        withSpring(1, Spring.snappy)
      );
    }
  }, [focused]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Icon size={22} color={color} weight={focused ? 'fill' : 'regular'} />
    </Animated.View>
  );
}

function TabNavigator() {
  const { colors: Colors } = useColors();
  const insets = useSafeAreaInsets();

  const tabIcons: Record<string, PhosphorIcon> = {
    Home: House,
    Calendar: CalendarDots,
    Stats: ChartBar,
    Profile: Trophy,
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : hexAlpha(Colors.bg0, 0.94),
          borderTopColor: hexAlpha(Colors.border, 0.5),
          borderTopWidth: 0.5,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 10),
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={60}
              tint="dark"
              style={{ flex: 1, borderTopColor: hexAlpha(Colors.border, 0.4), borderTopWidth: 0.5 }}
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: hexAlpha(Colors.bg0, 0.94) }} />
          ),
        tabBarActiveTintColor: Colors.accentBright,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontFamily: FontFamily.regular },
        tabBarIcon: ({ color, focused }) => {
          const Icon = tabIcons[route.name] ?? House;
          return <TabIcon Icon={Icon} color={color} focused={focused} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerShown: true,
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: 'transparent' },
          headerShadowVisible: false,
          headerTintColor: Colors.textPrimary,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors: Colors } = useColors();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bg1 },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontFamily: FontFamily.bold },
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="AddGoal" component={AddGoalScreen} options={{ title: 'New Goal', headerTitleAlign: 'center' }} />
      <Stack.Screen name="ArchivedGoals" component={ArchivedGoalsScreen} options={{ title: 'Archived Goals' }} />
      <Stack.Screen
        name="SkillTrack"
        component={SkillTrackScreen}
        options={({ route }) => ({ title: route.params.customLabel ?? route.params.category.charAt(0).toUpperCase() + route.params.category.slice(1) })}
      />
      <Stack.Screen
        name="Journal"
        component={JournalScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="BossRaid" component={BossRaidScreen} options={{ title: 'Boss Raid' }} />
      <Stack.Screen name="Season" component={SeasonScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Shop" component={ShopScreen} options={{ title: 'Perk Shop', headerTitleAlign: 'center' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerTitleAlign: 'center' }} />
      <Stack.Screen name="Friends" component={FriendsScreen} options={{ title: 'Friends', headerTitleAlign: 'center' }} />
    </Stack.Navigator>
  );
}
