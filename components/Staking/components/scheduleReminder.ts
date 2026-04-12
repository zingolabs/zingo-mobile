import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  TimestampTrigger,
  TriggerNotification,
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
  numberActions,
}: {
  seconds: number;
  numberActions: number;
}) {
  const allowed: boolean = await requestPermissions();

  if (allowed) {
    // only one notification...
    let notifeeId: string | undefined;
    const triggers: TriggerNotification[] =
      await notifee.getTriggerNotifications();
    if (triggers.length === 1) {
      notifeeId = triggers[0].notification.id;
    } else if (triggers.length > 1) {
      await notifee.cancelAllNotifications();
    }

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

    const notification = {
      ...(notifeeId !== undefined && { id: notifeeId }),
      title: 'Staking day has arrived',
      body: `You have ${numberActions} scheduled action${numberActions > 1 ? 's' : ''}.`,
      data: {
        deeplink: `delegator://reminder-opened`,
      },
      android: {
        channelId,
        pressAction: {
          id: 'default',
        },
      },
    };

    await notifee.createTriggerNotification(notification, trigger);

    return;
  }
}
