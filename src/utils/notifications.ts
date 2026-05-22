import Constants, { ExecutionEnvironment } from 'expo-constants';

// Push notification listener was removed from Expo Go in SDK 53.
// Guard every call so the app loads normally in Expo Go (local scheduled
// notifications also don't work in Expo Go, so we just no-op silently).
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isExpoGo) return false;
  const { default: Notifications } = await import('expo-notifications');
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleGoalReminder(
  goalId: string,
  time: string,
  goalName: string
): Promise<string> {
  if (isExpoGo) return '';
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
  if (isExpoGo || !notificationId) return;
  const { default: Notifications } = await import('expo-notifications');
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export function setupNotificationHandler(): void {
  if (isExpoGo) return;
  // Dynamic import so Expo Go never touches the module at all
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
