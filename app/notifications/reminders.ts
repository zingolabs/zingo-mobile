import notifee, {
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
  // When to fire, in ms since epoch: the window's advisory target, estimated
  // from its block distance at the observed spacing.
  timestampMs: number;
  title: string;
  body: string;
};

export async function requestReminderPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
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
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: reminder.timestampMs,
    };
    await notifee.createTriggerNotification(
      {
        id: REMINDER_PREFIX + reminder.id,
        title: reminder.title,
        body: reminder.body,
        android: {
          channelId,
          pressAction: { id: 'default' },
        },
      },
      trigger,
    );
  }
}

async function cancelBatchReminders(): Promise<void> {
  const ids = await notifee.getTriggerNotificationIds();
  const ours = ids.filter(id => id.startsWith(REMINDER_PREFIX));
  if (ours.length > 0) {
    await notifee.cancelTriggerNotifications(ours);
  }
}
