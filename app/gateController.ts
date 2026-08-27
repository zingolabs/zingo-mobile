import { AppState, DeviceEventEmitter, Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import DeviceAuth, { DeviceAuthResult } from './DeviceAuthModule';
import { GlobalConst, TranslateType } from './AppState';
import { errorKeyed } from './AppState/types/Result';
import { GateFailure, GateFailureKey } from './AppState/types/GateFailure';
import Utils from './utils';

// The single gate controller of ADR 0007. The gate is a privacy shutter,
// not a security boundary: every trigger asks this controller, the
// controller runs at most one device-auth ceremony at a time, a pass stays
// fresh for a short window, and every way the gate cannot run fails open
// with a notice.

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

// The availability probe shows no UI, so any stall is a wedged native
// module.
export const PROBE_STALL_MS = 10 * 1000;

// The ceremony is user-paced: a person deciding at the prompt keeps the
// promise pending, so the window is wide, and the countdown runs only
// while the app is observed 'active' (a live iOS auth sheet and Android's
// credential screen both take it off 'active'), so a stall is never
// declared over a provably live prompt. A ceremony the OS never answers
// fails open with a notice instead of leaving a dead Unlock button.
export const CEREMONY_STALL_MS = 120 * 1000;

// A real frame normally lands in one tick; the budget only bounds a lagging
// cold start so the paint can never hold the gate.
const PAINT_BUDGET_MS = 1000;

// A ceremony these codes end carries an answer, not a broken gate: the
// person left the app while it asked. It locks like a decline, uniformly
// on both platforms (Android's in-prompt backgrounding already reaches
// ERROR_CANCELED natively). iOS reports the backgrounded sheet as
// LAError.systemCancel, and a cold Android start backgrounded before the
// prompt as the module's own no-resumed-activity token.
const INTERRUPTED_CODES: readonly string[] = ['-4', 'no-resumed-activity'];

const gateFailure = (errorKey: GateFailureKey, param?: string): GateFailure =>
  errorKeyed(errorKey, param);

const failedOpen = (errorKey: GateFailureKey, param?: string): GateAnswer => ({
  kind: 'failedOpen',
  failure: gateFailure(errorKey, param),
});

const describeFailure = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

// Only 'inactive' and 'background' prove absence; an 'unknown' seed proves
// nothing and must never park a countdown.
const provablyAway = (): boolean =>
  AppState.currentState === 'inactive' ||
  AppState.currentState === 'background';

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

// The ceremony's stall countdown runs only while the app is observed
// 'active': leaving pauses it, returning re-arms it in full, and a fire
// that lands while the app is provably away re-parks instead of resolving,
// so time the OS spends holding a live prompt or a credential screen never
// counts toward a stall.
const ceremonyStallBounded = <T>(
  op: Promise<T>,
): Promise<T | typeof STALLED> => {
  let disarm = () => {};
  const watchdog = new Promise<typeof STALLED>(resolve => {
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const pause = () => {
      clearTimeout(expiry);
      expiry = undefined;
    };
    const arm = () => {
      expiry = setTimeout(() => {
        if (provablyAway()) {
          // The change event that would have paused the countdown can
          // lose the race against the timer; the state it was carrying
          // still vetoes the fire, and the handler re-arms on the way
          // back.
          pause();
          return;
        }
        resolve(STALLED);
      }, CEREMONY_STALL_MS);
    };
    const subscription = AppState.addEventListener('change', next => {
      pause();
      if (next === 'active') {
        arm();
      }
    });
    arm();
    disarm = () => {
      pause();
      subscription.remove();
    };
  });
  return Promise.race([op, watchdog]).finally(() => disarm());
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
// been answering. A stalled ceremony's native call is kept, not abandoned:
// its prompt may still be on screen, and a fresh authenticate() would
// cancel one of the two and read as a decline nobody made, so the next
// trigger adopts the pending call instead.
let lastPassedAt: number | undefined;
let ceremonyInFlight: Promise<GateAnswer> | undefined;
let pendingNativeCeremony: Promise<DeviceAuthResult> | undefined;

/** Clears the controller's process-wide memory, for tests that share one module registry. */
export const resetGateController = (): void => {
  lastPassedAt = undefined;
  ceremonyInFlight = undefined;
  pendingNativeCeremony = undefined;
};

const freshlyPassed = (): boolean =>
  lastPassedAt !== undefined && Date.now() - lastPassedAt <= AUTH_FRESHNESS_MS;

const startNativeCeremony = (
  translate: GateControllerProps['translate'],
): Promise<DeviceAuthResult> => {
  const native = DeviceAuth.authenticate(
    translate('biometrics-message') as string,
    translate('cancel') as string,
  );
  pendingNativeCeremony = native;
  // The one place a pass arms the freshness window, so an adopted or
  // late-settling ceremony arms it the same as a raced one.
  native.then(
    outcome => {
      if (pendingNativeCeremony === native) {
        pendingNativeCeremony = undefined;
      }
      if (outcome.outcome === 'authenticated') {
        lastPassedAt = Date.now();
      }
    },
    () => {
      if (pendingNativeCeremony === native) {
        pendingNativeCeremony = undefined;
      }
    },
  );
  return native;
};

const ceremonyBody = async ({
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
    const ceremony = await ceremonyStallBounded(
      pendingNativeCeremony ?? startNativeCeremony(translate),
    );
    if (ceremony === STALLED) {
      return failedOpen('biometrics-failure-stalled', 'authenticate');
    }
    switch (ceremony.outcome) {
      case 'authenticated':
        return { kind: 'passed' };
      case 'declined':
        return {
          kind: 'declined',
          failure: gateFailure('biometrics-failure-declined', ceremony.code),
        };
      case 'unavailable':
        return INTERRUPTED_CODES.includes(ceremony.code)
          ? {
              kind: 'declined',
              failure: gateFailure(
                'biometrics-failure-declined',
                ceremony.code,
              ),
            }
          : failedOpen('biometrics-failure-notserved', ceremony.code);
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

const insecure = (failure: GateFailure): DeviceSecurityProbe => ({
  kind: 'insecure',
  failure,
});

/** Answers whether the device can authenticate its user, with the reason when it cannot. */
export const probeDeviceSecurity = async (): Promise<DeviceSecurityProbe> => {
  try {
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
      : insecure(
          gateFailure('biometrics-failure-nosecurity', availability.code),
        );
  } catch (e) {
    return insecure(
      gateFailure('biometrics-failure-notserved', describeFailure(e)),
    );
  }
};
