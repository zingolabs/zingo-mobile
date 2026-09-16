/**
 * Batch reminders must reach Android's AlarmManager with the inexact
 * SET_AND_ALLOW_WHILE_IDLE type. Without `alarmManager` notifee falls back to
 * WorkManager, which Doze/App Standby defer for hours and OEM task killers
 * wipe, so reminders never show. An exact type is just as bad: the manifest
 * strips SCHEDULE_EXACT_ALARM, and without it notifee silently skips
 * scheduling exact alarms.
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

  test('every future reminder uses AlarmManager SET_AND_ALLOW_WHILE_IDLE', async () => {
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
    for (const [, trigger] of createTrigger.mock.calls) {
      expect(trigger.type).toBe(TriggerType.TIMESTAMP);
      expect(trigger.alarmManager).toEqual({
        type: AlarmType.SET_AND_ALLOW_WHILE_IDLE,
      });
      expect(EXACT_TYPES).not.toContain(trigger.alarmManager.type);
    }
  });
});
