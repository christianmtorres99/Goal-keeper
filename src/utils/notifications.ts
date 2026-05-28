import { Platform } from 'react-native';

export async function requestNotificationPermissions(): Promise<boolean> {
  const { default: Notifications } = await import('expo-notifications');
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleGoalReminder(
  goalId: string,
  time: string,
  goalName: string
): Promise<string> {
  const { default: Notifications, SchedulableTriggerInputTypes } = await import('expo-notifications');
  const [hour, minute] = time.split(':').map(Number);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Time to log ${goalName}! 🔥`,
      body: 'Keep your streak alive — tap to open Goal Keeper.',
      data: { goalId },
      ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelGoalReminder(notificationId: string): Promise<void> {
  if (!notificationId) return;
  const { default: Notifications } = await import('expo-notifications');
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function setupNotificationHandler(): Promise<void> {
  const { default: Notifications } = await import('expo-notifications');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Goal Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A855F7',
    });
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
