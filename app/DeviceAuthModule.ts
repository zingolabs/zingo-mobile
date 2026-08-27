import { NativeModules } from 'react-native';

// The native half of the privacy shutter (ADR 0007): one OS ceremony per
// authenticate() call, resolved as a typed outcome. The promise always
// resolves, so the gate controller needs no rejection path.

/** Every way one device-auth ceremony can end. */
export type DeviceAuthOutcome = 'authenticated' | 'declined' | 'unavailable';

/** A ceremony's ending plus the platform's own code, for bug reports. */
export type DeviceAuthResult = {
  outcome: DeviceAuthOutcome;
  code: string;
};

/** Whether the device can run a ceremony at all, with the refusing code. */
export type DeviceAuthAvailability = {
  available: boolean;
  code: string;
};

type DeviceAuthAPI = {
  authenticate(title: string, cancelLabel: string): Promise<DeviceAuthResult>;
  canAuthenticate(): Promise<DeviceAuthAvailability>;
};

export default NativeModules.DeviceAuth as DeviceAuthAPI;
