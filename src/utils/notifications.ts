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

export function setupNotificationHandler(): void {
  import('expo-notifications').then(({ default: Notifications }) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  });
}
