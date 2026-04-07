const notifee = {
  requestPermission: jest.fn(),
  createChannel: jest.fn(),
  getChannel: jest.fn(),
  getChannels: jest.fn(),
  deleteChannel: jest.fn(),
  displayNotification: jest.fn(),
  createTriggerNotification: jest.fn(),
  cancelNotification: jest.fn(),
  cancelAllNotifications: jest.fn(),
  getInitialNotification: jest.fn(),
  onForegroundEvent: jest.fn(),
  onBackgroundEvent: jest.fn(),
  isChannelBlocked: jest.fn(),
  isBatteryOptimizationEnabled: jest.fn(),
  openBatteryOptimizationSettings: jest.fn(),
  openNotificationSettings: jest.fn(),
};

const AndroidImportance = {
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
};

const TriggerType = {
  TIMESTAMP: 0,
  INTERVAL: 1,
};

const AndroidStyle = {
  BIGTEXT: 0,
  BIGPICTURE: 1,
  INBOX: 2,
};

const EventType = {
  DISMISSED: 0,
  PRESS: 1,
  ACTION_PRESS: 2,
  DELIVERED: 3,
  TRIGGER_NOTIFICATION_CREATED: 4,
};

module.exports = {
  __esModule: true,
  default: notifee,
  AndroidImportance,
  TriggerType,
  AndroidStyle,
  EventType,
};
