// Jest stand-in for @notifee/react-native, whose native module is absent under
// Jest. Screens that keep the batch reminders in step (the History banner, the
// migration status screen) reach it on every render test. Permission reads as
// denied, so nothing is armed unless a suite overrides it; suites that assert
// on notifee calls mock the module themselves.
const AuthorizationStatus = { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1 };

const notifee = {
  requestPermission: jest.fn(async () => ({
    authorizationStatus: AuthorizationStatus.DENIED,
  })),
  getNotificationSettings: jest.fn(async () => ({
    authorizationStatus: AuthorizationStatus.DENIED,
  })),
  createChannel: jest.fn(async () => 'mock-channel'),
  createTriggerNotification: jest.fn(async () => 'mock-id'),
  getTriggerNotificationIds: jest.fn(async () => []),
  cancelTriggerNotifications: jest.fn(async () => {}),
  // Unrestricted by default, so no battery warning renders unless a suite
  // overrides it.
  isBatteryOptimizationEnabled: jest.fn(async () => false),
  getPowerManagerInfo: jest.fn(async () => ({ activity: null })),
  openBatteryOptimizationSettings: jest.fn(async () => {}),
  openPowerManagerSettings: jest.fn(async () => {}),
};

module.exports = {
  __esModule: true,
  default: notifee,
  AlarmType: {
    SET: 0,
    SET_AND_ALLOW_WHILE_IDLE: 1,
    SET_EXACT: 2,
    SET_EXACT_AND_ALLOW_WHILE_IDLE: 3,
    SET_ALARM_CLOCK: 4,
  },
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  AuthorizationStatus,
  TriggerType: { TIMESTAMP: 0, INTERVAL: 1 },
};
