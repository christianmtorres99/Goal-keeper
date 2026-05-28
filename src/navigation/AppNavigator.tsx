import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import StatsScreen from '../screens/StatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GoalDetailScreen from '../screens/GoalDetailScreen';
import AddGoalScreen from '../screens/AddGoalScreen';
import ArchivedGoalsScreen from '../screens/ArchivedGoalsScreen';
import SkillTrackScreen from '../screens/SkillTrackScreen';
import JournalScreen from '../screens/JournalScreen';
import type { GoalCategory } from '../types';

export type RootStackParamList = {
  Tabs: undefined;
  GoalDetail: { goalId: string };
  AddGoal: { goalId?: string };
  ArchivedGoals: undefined;
  SkillTrack: { category: GoalCategory };
  Journal: { date?: string } | undefined;
};

export type TabParamList = {
  Home: undefined;
  Calendar: undefined;
  Stats: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bg1,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 10),
          elevation: 0,
        },
        tabBarActiveTintColor: Colors.accentBright,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, string> = {
            Home: focused ? 'home' : 'home-outline',
            Calendar: focused ? 'calendar' : 'calendar-outline',
            Stats: focused ? 'bar-chart' : 'bar-chart-outline',
            Profile: focused ? 'trophy' : 'trophy-outline',
          };
          return <Ionicons name={icons[route.name] as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Badges' }} />
    </Tab.Navigator>
  );
}

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#A855F7',
    background: '#080B12',
    card: '#080B12',
    text: '#F1F5F9',
    border: '#2D3555',
    notification: '#A855F7',
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={NAV_THEME}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.bg1 },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.bg0 },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ title: '' }} />
        <Stack.Screen name="AddGoal" component={AddGoalScreen} options={{ title: 'New Goal' }} />
        <Stack.Screen name="ArchivedGoals" component={ArchivedGoalsScreen} options={{ title: 'Archived Goals' }} />
        <Stack.Screen
          name="SkillTrack"
          component={SkillTrackScreen}
          options={({ route }) => ({ title: route.params.category.charAt(0).toUpperCase() + route.params.category.slice(1) })}
        />
        <Stack.Screen
          name="Journal"
          component={JournalScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
