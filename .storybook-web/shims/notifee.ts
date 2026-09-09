// Web stub for @notifee/react-native, which throws without its native
// module. Only the surface app/notifications/reminders.ts touches.
export const AndroidImportance = { HIGH: 4 } as const;
export const AuthorizationStatus = { DENIED: 0, AUTHORIZED: 1 } as const;
export const TriggerType = { TIMESTAMP: 0 } as const;

export type TimestampTrigger = {
  type: number;
  timestamp: number;
  alarmManager?: boolean | { allowWhileIdle?: boolean };
};

const notifee = {
  requestPermission: async () => ({
    authorizationStatus: AuthorizationStatus.DENIED,
  }),
  createChannel: async () => 'storybook',
  createTriggerNotification: async () => 'storybook',
  getTriggerNotificationIds: async (): Promise<string[]> => [],
  cancelTriggerNotifications: async () => {},
};

export default notifee;
