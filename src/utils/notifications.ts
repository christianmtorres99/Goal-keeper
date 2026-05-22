import * as Notifications from 'expo-notifications';

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleGoalReminder(
  goalId: string,
  time: string,
  goalName: string
): Promise<string> {
  const [hour, minute] = time.split(':').map(Number);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time to log ${goalName}! 🔥`,
      body: "Keep your streak alive — tap to open Goal Keeper.",
      data: { goalId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return id;
}

export async function cancelGoalReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export function setupNotificationHandler(): void {
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
