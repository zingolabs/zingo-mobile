import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';

async function requestPermissions() {
  const settings = await notifee.getNotificationSettings();
  console.log(settings);

  if (settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED) {
    console.log('Permission settings:', settings);
    return true;
  } else {
    console.log('User declined permissions');
    const request = await notifee.requestPermission();
    if (request.authorizationStatus >= AuthorizationStatus.AUTHORIZED) {
      console.log('Permission request:', request);
      return true;
    } else {
      console.log('User declined permissions');
      return false;
    }
  }
}

export async function scheduleReminder({
  seconds,
  title,
  body,
  notifeeId,
}: {
  seconds: number;
  title: string;
  body: string;
  notifeeId?: string,
}) {
  const allowed: boolean = await requestPermissions();

  if (allowed) {
    const channelId = await notifee.createChannel({
      id: 'reminders',
      name: 'Reminders',
      importance: AndroidImportance.HIGH,
    });

    const fireDate = Date.now() + seconds * 1000;

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: fireDate,
      alarmManager: true, // Android option for timestamp triggers
    };

    const id: string = await notifee.createTriggerNotification(
      {
        id: notifeeId,
        title: title,
        body: body,
        data: {
          deeplink: `delegator://reminder-opened`,
        },
        android: {
          channelId,
          pressAction: {
            id: 'default',
          },
        },
      },
      trigger,
    );

    return id;
  }
}
