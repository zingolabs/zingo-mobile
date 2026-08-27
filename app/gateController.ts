import { DeviceEventEmitter, Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import DeviceAuth from './DeviceAuthModule';
import { GlobalConst, TranslateType } from './AppState';
import { errorKeyed } from './AppState/types/Result';
import { GateFailure, GateFailureKey } from './AppState/types/GateFailure';

// The single gate controller of ADR 0007. The gate is a privacy shutter,
// not a security boundary: every trigger asks this controller, the
// controller runs at most one device-auth ceremony at a time, a pass stays
// fresh for a short window, and every way the gate cannot run fails open
// with a notice.

/** Every way the gate controller answers a trigger. */
export type GateAnswer =
  | { kind: 'passed' }
  | { kind: 'declined'; failure: GateFailure }
  | { kind: 'failedOpen'; failure: GateFailure };

/** The device-security probe's answer, carrying the reason when it cannot secure. */
export type DeviceSecurityProbe =
  { kind: 'secured' } | { kind: 'insecure'; failure: GateFailure };

type GateControllerProps = {
  translate: (key: string) => TranslateType;
};

// Emitted with a boolean payload (true=show, false=hide) so a root-level
// overlay can cover the activity while the system BiometricPrompt is up.
// Audit Issue C: on Android the prompt does not cover the whole screen and
// sensitive content stays visible behind it. iOS already gets this from the
// SceneDelegate privacyWindow.
export const BIOMETRIC_BLANKING_EVENT = 'biometric-blanking';

// A pass stays fresh long enough to cover a quick app switch and the
// locked screen's retry re-entering the boot path, and short enough that
// the shutter still asks after any real absence.
export const AUTH_FRESHNESS_MS = 15 * 1000;

// The availability probe shows no UI, so any stall is a wedged native
// module.
export const PROBE_STALL_MS = 10 * 1000;

// The ceremony is user-paced: a person deciding at the prompt keeps the
// promise pending, so the window is wide. A ceremony the OS never answers
// fails open with a notice instead of leaving a dead Unlock button.
export const CEREMONY_STALL_MS = 120 * 1000;

// A real frame normally lands in one tick; the budget only bounds a lagging
// cold start so the paint can never hold the gate.
const PAINT_BUDGET_MS = 1000;

const gateFailure = (errorKey: GateFailureKey, param?: string): GateFailure =>
  errorKeyed(errorKey, param);

const failedOpen = (errorKey: GateFailureKey, param?: string): GateAnswer => ({
  kind: 'failedOpen',
  failure: gateFailure(errorKey, param),
});

const STALLED = Symbol('device-auth-stalled');

/** Resolves to STALLED when `op` outlives its window. */
const stallBounded = <T>(
  op: Promise<T>,
  windowMs: number,
): Promise<T | typeof STALLED> => {
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const watchdog = new Promise<typeof STALLED>(resolve => {
    expiry = setTimeout(() => resolve(STALLED), windowMs);
  });
  return Promise.race([op, watchdog]).finally(() => clearTimeout(expiry));
};

// Yield one frame so the overlay paints before the system prompt opens.
// The paint is cosmetic: a missed frame resolves at the budget and never
// denies the gate.
const yieldOneFrame = (): Promise<void> =>
  new Promise(resolve => {
    const frameBudget = setTimeout(resolve, PAINT_BUDGET_MS);
    requestAnimationFrame(() => {
      clearTimeout(frameBudget);
      resolve();
    });
  });

// A pass is remembered so triggers landing inside the freshness window
// share it silently, and a ceremony in flight is shared so concurrent
// triggers never stack prompts. A shared decline answers every waiting
// trigger: with one controller there is no other purpose it could have
// been answering.
let lastPassedAt: number | undefined;
let ceremonyInFlight: Promise<GateAnswer> | undefined;

const freshlyPassed = (): boolean =>
  lastPassedAt !== undefined && Date.now() - lastPassedAt <= AUTH_FRESHNESS_MS;

const runCeremony = async ({
  translate,
}: GateControllerProps): Promise<GateAnswer> => {
  const availability = await stallBounded(
    DeviceAuth.canAuthenticate(),
    PROBE_STALL_MS,
  );
  if (availability === STALLED) {
    return failedOpen('biometrics-failure-stalled', 'canAuthenticate');
  }
  if (!availability.available) {
    return failedOpen('biometrics-failure-nosecurity', availability.code);
  }
  try {
    if (Platform.OS === 'android') {
      DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, true);
      await yieldOneFrame();
    }
    const ceremony = await stallBounded(
      DeviceAuth.authenticate(
        translate('biometrics-message') as string,
        translate('cancel') as string,
      ),
      CEREMONY_STALL_MS,
    );
    if (ceremony === STALLED) {
      return failedOpen('biometrics-failure-stalled', 'authenticate');
    }
    switch (ceremony.outcome) {
      case 'authenticated':
        lastPassedAt = Date.now();
        return { kind: 'passed' };
      case 'declined':
        return {
          kind: 'declined',
          failure: gateFailure('biometrics-failure-declined', ceremony.code),
        };
      case 'unavailable':
        return failedOpen('biometrics-failure-notserved', ceremony.code);
    }
  } finally {
    if (Platform.OS === 'android') {
      DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, false);
    }
    // iOS treats the auth prompt as the app going to background; restore
    // the foreground flag so background-state handling doesn't trip. A
    // failing write must not replace the answer every caller shares.
    try {
      await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
    } catch {
      // The answer outranks the flag restore.
    }
  }
};

/** Runs one device-auth ceremony for a trigger, sharing a fresh pass or a ceremony already in flight. */
export const askGate = (props: GateControllerProps): Promise<GateAnswer> => {
  if (freshlyPassed()) {
    return Promise.resolve({ kind: 'passed' });
  }
  if (ceremonyInFlight) {
    return ceremonyInFlight;
  }
  ceremonyInFlight = runCeremony(props).finally(() => {
    ceremonyInFlight = undefined;
  });
  return ceremonyInFlight;
};

const insecure = (failure: GateFailure): DeviceSecurityProbe => ({
  kind: 'insecure',
  failure,
});

/** Answers whether the device can authenticate its user, with the reason when it cannot. */
export const probeDeviceSecurity = async (): Promise<DeviceSecurityProbe> => {
  const availability = await stallBounded(
    DeviceAuth.canAuthenticate(),
    PROBE_STALL_MS,
  );
  if (availability === STALLED) {
    return insecure(
      gateFailure('biometrics-failure-stalled', 'canAuthenticate'),
    );
  }
  return availability.available
    ? { kind: 'secured' }
    : insecure(gateFailure('biometrics-failure-nosecurity'));
};
