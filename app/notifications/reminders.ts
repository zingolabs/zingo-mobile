import notifee, {
  AlarmType,
  AndroidImportance,
  AuthorizationStatus,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';

const CHANNEL_ID = 'ironwood-migration';
const REMINDER_PREFIX = 'ironwood-batch-';

// One scheduled reminder per broadcast window: fires at the window's advisory
// target time. The batch is already due from its boundary, so the target no
// longer gates sending — it just paces the nudge so sends disperse across the
// window (manual-execution mode, nothing is ever sent without the user opening
// the app).
export type BatchReminder = {
  // Stable per-window id (the bucket index), so re-arming replaces cleanly.
  id: string;
  // When to fire, in ms since epoch: the window's advisory target kept inside
  // the window (see reminderTimestampMs).
  timestampMs: number;
  title: string;
  body: string;
};

export async function requestReminderPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

// Reads the permission without prompting, for re-arming in the background of
// a screen: only the schedule confirmation may put up the system dialog.
export async function reminderPermissionGranted(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

// Replaces the whole reminder set. Always cancel-then-arm: after any
// reschedule, fold or slide the old schedule's times are void, so partial
// updates would leave stale reminders behind.
export async function armBatchReminders(
  reminders: BatchReminder[],
): Promise<void> {
  await cancelBatchReminders();
  if (reminders.length === 0) {
    return;
  }
  const channelId = await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Ironwood migration',
    importance: AndroidImportance.HIGH,
  });
  const now = Date.now();
  for (const reminder of reminders) {
    // Past or imminent targets need no reminder — the user is in the app
    // right now, and the execute path folds anything already due.
    if (reminder.timestampMs <= now + 5000) {
      continue;
    }
    // Android: AlarmManager, not notifee's default WorkManager path, which
    // Doze/App Standby defer for hours and OEM task killers wipe outright.
    // SET_AND_ALLOW_WHILE_IDLE is inexact (fires in Doze within minutes) and
    // needs no SCHEDULE_EXACT_ALARM. Never an exact type here: without that
    // permission notifee silently drops the trigger. Ignored on iOS.
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: reminder.timestampMs,
      alarmManager: { type: AlarmType.SET_AND_ALLOW_WHILE_IDLE },
    };
    await notifee.createTriggerNotification(
      {
        id: REMINDER_PREFIX + reminder.id,
        title: reminder.title,
        body: reminder.body,
        android: {
          channelId,
          // notifee defaults to 'ic_launcher', which this app does not ship
          // (its launcher icon is the adaptive @mipmap/zingo), and Android
          // rejects a notification whose small icon does not resolve — the
          // alarm then fires and shows nothing.
          //
          // A dedicated monochrome asset, not the launcher foreground: the
          // status bar draws this icon from its alpha alone, so the opaque
          // circle of @mipmap/zingo_foreground came out as a white blob, and
          // its adaptive-icon safe-zone padding left the mark tiny.
          smallIcon: 'ic_notification',
          pressAction: { id: 'default' },
        },
      },
      trigger,
    );
  }
}

export async function cancelBatchReminders(): Promise<void> {
  const ids = await notifee.getTriggerNotificationIds();
  const ours = ids.filter(id => id.startsWith(REMINDER_PREFIX));
  if (ours.length > 0) {
    await notifee.cancelTriggerNotifications(ours);
  }
}
