import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { FontFamily } from '../constants/theme';
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
import type { GoalCategory } from '../types';

export type RootStackParamList = {
  Tabs: undefined;
  GoalDetail: { goalId: string };
  AddGoal: { goalId?: string };
  ArchivedGoals: undefined;
  SkillTrack: { category: GoalCategory; customLabel?: string };
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

function TabIcon({ name, color, focused }: { name: string; color: string; focused: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withSpring(1.28, Spring.bouncy),
        withSpring(1, Spring.snappy)
      );
    }
  }, [focused]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Ionicons name={name as any} size={22} color={color} />
    </Animated.View>
  );
}

function TabNavigator() {
  const { colors: Colors } = useColors();
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
        tabBarLabelStyle: { fontSize: 11, fontFamily: FontFamily.regular },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, [string, string]> = {
            Home:     ['home',       'home-outline'],
            Calendar: ['calendar',   'calendar-outline'],
            Stats:    ['bar-chart',  'bar-chart-outline'],
            Profile:  ['trophy',     'trophy-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <TabIcon name={focused ? active : inactive} color={color} focused={focused} />;
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
          headerStyle: { backgroundColor: Colors.bg1 },
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
        contentStyle: { backgroundColor: Colors.bg0 },
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
    </Stack.Navigator>
  );
}
