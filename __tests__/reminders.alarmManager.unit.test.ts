/**
 * Batch reminders must reach Android's AlarmManager with the inexact
 * SET_AND_ALLOW_WHILE_IDLE type. Without `alarmManager` notifee falls back to
 * WorkManager, which Doze/App Standby defer for hours and OEM task killers
 * wipe, so reminders never show. An exact type is just as bad: the manifest
 * strips SCHEDULE_EXACT_ALARM, and without it notifee silently skips
 * scheduling exact alarms. And the alarm firing is not enough: without a
 * resolvable small icon Android rejects the notification it posts.
 */
// The real enums come from notifee's pure types module (no native code), so
// the assertions hold against notifee's actual values rather than a copy.
const TRIGGER_TYPES = '@notifee/react-native/dist/types/Trigger';

jest.mock('@notifee/react-native', () => {
  const types = jest.requireActual('@notifee/react-native/dist/types/Trigger');
  return {
    __esModule: true,
    default: {
      requestPermission: jest.fn(),
      createChannel: jest.fn(async () => 'ironwood-migration'),
      createTriggerNotification: jest.fn(async () => 'id'),
      getTriggerNotificationIds: jest.fn(async () => []),
      cancelTriggerNotifications: jest.fn(async () => {}),
    },
    AlarmType: types.AlarmType,
    TriggerType: types.TriggerType,
    AndroidImportance: { HIGH: 4 },
    AuthorizationStatus: { DENIED: 0, AUTHORIZED: 1 },
  };
});

import notifee from '@notifee/react-native';
import { armBatchReminders } from '@app/notifications/reminders';

const { AlarmType, TriggerType } = jest.requireActual(TRIGGER_TYPES);
const createTrigger = notifee.createTriggerNotification as jest.Mock;

const EXACT_TYPES = [
  AlarmType.SET_EXACT,
  AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
  AlarmType.SET_ALARM_CLOCK,
];

describe('armBatchReminders trigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('every future reminder uses AlarmManager SET_AND_ALLOW_WHILE_IDLE and a shipped small icon', async () => {
    const now = Date.now();
    await armBatchReminders([
      { id: '1', timestampMs: now + 60 * 60 * 1000, title: 't1', body: 'b' },
      {
        id: '2',
        timestampMs: now + 4 * 60 * 60 * 1000,
        title: 't2',
        body: 'b',
      },
    ]);

    expect(createTrigger).toHaveBeenCalledTimes(2);
    for (const [notification, trigger] of createTrigger.mock.calls) {
      // notifee's default 'ic_launcher' does not exist in this app, and
      // Android drops a notification without a valid small icon. The status
      // bar draws it from its alpha, so it is a monochrome asset of its own.
      expect(notification.android.smallIcon).toBe('ic_notification');
      expect(trigger.type).toBe(TriggerType.TIMESTAMP);
      expect(trigger.alarmManager).toEqual({
        type: AlarmType.SET_AND_ALLOW_WHILE_IDLE,
      });
      expect(EXACT_TYPES).not.toContain(trigger.alarmManager.type);
    }
  });

  // The small icon is looked up by name at display time, so deleting the
  // resource only fails on device, silently. Pin it to the main source set,
  // which every flavor inherits.
  test('the small icon resource exists in every density', () => {
    const fs = jest.requireActual('fs');
    const path = jest.requireActual('path');
    const res = path.join(__dirname, '../android/app/src/main/res');
    for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
      expect(
        fs.existsSync(
          path.join(res, `drawable-${density}`, 'ic_notification.png'),
        ),
      ).toBe(true);
    }
  });
});
