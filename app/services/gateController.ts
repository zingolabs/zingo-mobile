import { DeviceEventEmitter, Platform } from 'react-native';

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DeviceAuth from './DeviceAuthModule';
import { GlobalConst, TranslateType } from '@app/AppState';
import { errorKeyed } from '@app/AppState/types/Result';
import { GateFailure, GateFailureKey } from '@app/AppState/types/GateFailure';
import Utils from '@app/utils';

// The single gate controller of ADR 0007. The gate is a privacy shutter,
// not a security boundary: every trigger asks this controller, the
// controller runs at most one device-auth ceremony at a time, a pass stays
// fresh for a short window, and every way the gate cannot run fails open
// with a notice. The native module guarantees settlement, on the prompt's
// own terminal callback or on the host activity's destruction, so the
// controller holds no watchdog: the prompt ends exactly when the OS ends
// it, and a stall over a live prompt is unrepresentable here.

/** A ceremony the person answered no to, carrying the platform's code. */
export type DeclinedAnswer = { kind: 'declined'; failure: GateFailure };

/** Every way the gate controller answers a trigger. */
export type GateAnswer =
  | { kind: 'passed' }
  | DeclinedAnswer
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

// A pass stays fresh long enough to cover a quick app switch and short
// enough that the shutter still asks after any real absence.
export const AUTH_FRESHNESS_MS = 15 * 1000;

// A real frame normally lands in one tick; the budget only bounds a lagging
// cold start so the paint can never hold the gate.
const PAINT_BUDGET_MS = 1000;

// The keychain services the replaced sentinel gate shipped in the 2.0.23
// betas. Nothing reads them any more, and an auth-gated key left under a
// known name invites a future consumer to inherit a stale entry written
// under a different access control, the issue-1266 class.
const RETIRED_SENTINEL_SERVICES: readonly string[] = [
  'zingo-biometric-sentinel',
  'zingo-biometric-sentinel-v2',
];

const gateFailure = (errorKey: GateFailureKey, param?: string): GateFailure =>
  errorKeyed(errorKey, param);

const failedOpen = (errorKey: GateFailureKey, param?: string): GateAnswer => ({
  kind: 'failedOpen',
  failure: gateFailure(errorKey, param),
});

const describeFailure = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

// Yield one frame so the overlay paints before the system prompt opens.
// The paint is cosmetic: a missed or throwing frame resolves at once and
// never denies the gate.
const yieldOneFrame = (): Promise<void> =>
  new Promise(resolve => {
    const frameBudget = setTimeout(resolve, PAINT_BUDGET_MS);
    try {
      requestAnimationFrame(() => {
        clearTimeout(frameBudget);
        resolve();
      });
    } catch {
      clearTimeout(frameBudget);
      resolve();
    }
  });

// A pass is remembered so triggers landing inside the freshness window
// share it silently, and a ceremony in flight is shared so concurrent
// triggers never stack prompts. A shared decline answers every waiting
// trigger: with one controller there is no other purpose it could have
// been answering.
let lastPassedAt: number | undefined;
let ceremonyInFlight: Promise<GateAnswer> | undefined;

/** Clears the controller's process-wide memory, for tests that share one module registry. */
export const resetGateController = (): void => {
  lastPassedAt = undefined;
  ceremonyInFlight = undefined;
};

// Freshness is elapsed time, and only forwards. A clock moved back — a
// timezone or NTP correction, a manual change — makes the difference
// negative, which reads as inside the window for as long as it takes the
// clock to catch up, holding the shutter open across the gap. A pass from
// the future is no pass at all.
const freshlyPassed = (): boolean => {
  if (lastPassedAt === undefined) {
    return false;
  }
  const elapsed = Date.now() - lastPassedAt;
  return elapsed >= 0 && elapsed <= AUTH_FRESHNESS_MS;
};

const insecure = (failure: GateFailure): DeviceSecurityProbe => ({
  kind: 'insecure',
  failure,
});

/** Answers whether the device can authenticate its user, with the reason when it cannot. */
export const probeDeviceSecurity = async (): Promise<DeviceSecurityProbe> => {
  try {
    const availability = await DeviceAuth.canAuthenticate();
    return availability.available
      ? { kind: 'secured' }
      : insecure(
          gateFailure('biometrics-failure-nosecurity', availability.code),
        );
  } catch (e) {
    return insecure(
      gateFailure('biometrics-failure-notserved', describeFailure(e)),
    );
  }
};

const ceremonyBody = async ({
  translate,
}: GateControllerProps): Promise<GateAnswer> => {
  const security = await probeDeviceSecurity();
  if (security.kind === 'insecure') {
    return { kind: 'failedOpen', failure: security.failure };
  }
  try {
    if (Platform.OS === 'android') {
      DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, true);
      await yieldOneFrame();
    }
    const ceremony = await DeviceAuth.authenticate(
      translate('biometrics-message') as string,
      translate('cancel') as string,
    );
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
      default:
        // A native binary newer or older than this bundle can answer
        // outside the union; the controller still always answers.
        return failedOpen(
          'biometrics-failure-notserved',
          String(ceremony.outcome),
        );
    }
  } finally {
    if (Platform.OS === 'android') {
      DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, false);
    }
    // iOS treats the auth prompt as the app going to background; restore
    // the foreground flag so background-state handling doesn't trip. The
    // write floats: neither a wedged nor a failing store may delay or
    // replace the answer every caller shares.
    AsyncStorage.setItem(GlobalConst.background, GlobalConst.no).catch(() => {
      // The answer outranks the flag restore.
    });
  }
};

const runCeremony = async (props: GateControllerProps): Promise<GateAnswer> => {
  try {
    return await ceremonyBody(props);
  } catch (e) {
    // The controller always answers: an unexpected rejection anywhere in
    // the ceremony is a gate that cannot run, and it fails open with a
    // notice like every other.
    return failedOpen('biometrics-failure-notserved', describeFailure(e));
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

/** Resolves a trigger's answer from a carried one, a ceremony when the trigger is enabled, or a silent pass. */
export const resolveTriggerGate = (
  carried: GateAnswer | undefined,
  enabled: boolean,
  props: GateControllerProps,
): Promise<GateAnswer> => {
  if (carried) {
    return Promise.resolve(carried);
  }
  return enabled ? askGate(props) : Promise.resolve({ kind: 'passed' });
};

// The shutter policy, held in one place so its call sites cannot drift:
// only a decline blocks, and a gate that could not run proceeds with the
// rendered reason.

/** Applies the shutter policy to an answer, locking a decline, noticing a fail-open, and reporting whether the caller proceeds. */
export const enactGateAnswer = (
  answer: GateAnswer,
  site: {
    lock: (declined: DeclinedAnswer) => void;
    notice: (message: string) => void;
  },
  translate: GateControllerProps['translate'],
): boolean => {
  switch (answer.kind) {
    case 'declined':
      site.lock(answer);
      return false;
    case 'failedOpen':
      site.notice(Utils.renderGateFailure(answer.failure, translate));
      return true;
    case 'passed':
      return true;
  }
};

/** Wraps an async action so calls arriving during a flight are dropped. */
export const dropWhileInFlight = (
  action: () => Promise<void>,
): (() => Promise<void>) => {
  let inFlight = false;
  return async () => {
    if (inFlight) {
      return;
    }
    inFlight = true;
    try {
      await action();
    } finally {
      inFlight = false;
    }
  };
};

/** Deletes the retired keychain-sentinel entries, best-effort. */
export const retireSentinelEntries = async (): Promise<void> => {
  for (const service of RETIRED_SENTINEL_SERVICES) {
    try {
      await Keychain.resetGenericPassword({ service });
    } catch {
      // Best-effort: an entry that resists deletion guards nothing.
    }
  }
};
