import { NativeModules } from 'react-native';

// The native half of the privacy shutter (ADR 0007): one OS ceremony at a
// time, resolved as a typed outcome. Both platforms guarantee settlement —
// on the prompt's own terminal callback, on the host's destruction or a
// context reload, or at once when the prompt cannot start — and both
// classify leaving-the-app endings as declined, so the gate controller
// needs no rejection path and no watchdog.
//
// Concurrent calls join the ceremony already in flight and share its one
// answer on both platforms; a duplicate trigger never stacks a prompt and
// never reaches a fail-open arm behind a live one.
//
// `unavailable` is every ending the platform owns, permanent (no
// hardware, no enrolment) and transient (the sensor held elsewhere, a
// vendor fault) alike: the gate could not run, and the shutter fails open
// with a notice. Anything unrecognised is classified `declined` instead,
// so an ending neither platform half knows locks rather than opens.

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
