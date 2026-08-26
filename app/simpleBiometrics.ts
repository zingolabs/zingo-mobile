import { AppState, DeviceEventEmitter, Platform } from 'react-native';

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GlobalConst, TranslateType } from './AppState';
import { errorKeyed } from './AppState/types/Result';
import { GateFailure, GateFailureKey } from './AppState/types/GateFailure';
import {
  buildBaseOptions,
  buildGetOptions,
  buildSetOptions,
} from './utils/keychainOptions';

// Single biometric library: react-native-keychain. We use a "sentinel" entry
// stored under a dedicated service to drive every biometric prompt — the lib
// surfaces the OS BiometricPrompt as a side-effect of accessing a credential
// whose access control requires user authentication. This:
//   - drops react-native-biometrics (unmaintained since 2022, audit-backlog)
//   - reuses the keychain's auth window across prompts (no double-prompts)
//   - answers with a GateVerdict that callers switch on exhaustively.
const SENTINEL_SERVICE = 'zingo-biometric-sentinel-v2';
const SENTINEL_USERNAME = 'sentinel';
const SENTINEL_VALUE = '1';

// Issue #1266. v1 carried the BIOMETRY_CURRENT_SET access control, which no
// device without an enrolled biometric can satisfy. Renaming the service is
// what rebuilds the entry under the control keychainOptions now sets: at the
// JS layer an entry the OS refuses to serve reads the same as a healthy one,
// so keeping the name would leave upgraded devices on the broken entry.
// Any future change to the INTERACTIVE_AUTH control needs a new name here.
const SENTINEL_SERVICE_V1 = 'zingo-biometric-sentinel';

// Issue #1266. An entry that exists but that the OS will never hand back looks,
// at the JS layer, exactly like a user pressing Cancel. Both used to collapse
// into `false`, and `false` sends the app to the locked screen whose only
// action re-runs this same code, so the wallet became unreachable through a
// gate that guards nothing (the entry holds the string "1"). Telling the two
// apart is what allows a bad entry to be rebuilt instead of retried forever.
//
// `stalled` is the fourth way an attempt can end: the native call never came
// back at all. It must not trigger the rebuild (see NATIVE_STALL_MS below).
// What a stall settles as differs by platform, and the outcome carries that
// answer in `settleAs`, per interactiveStall.

const gateFailure = (errorKey: GateFailureKey, param?: string): GateFailure =>
  errorKeyed(errorKey, param);

/** The stalled attempt outcome, carrying the platform's settlement policy. */
export type StalledOutcome = {
  kind: 'stalled';
  settleAs: 'declined' | 'unavailable';
  failure: GateFailure;
};

/** Whether a broken entry followed a human failing the prompt or the platform declining to serve it. */
export type BrokenEntryCause = 'authFailed' | 'notServed';

/** Every way one keychain attempt against the sentinel can end. */
export type AttemptOutcome =
  | { kind: 'authenticated' }
  | { kind: 'declined'; failure: GateFailure }
  | { kind: 'brokenEntry'; cause: BrokenEntryCause; failure: GateFailure }
  | StalledOutcome;

// `unavailable` is the gate refusing to run, not the user refusing to
// authenticate: no device security, a wedged native queue, or a platform
// error nobody was prompted for. Callers proceed on it, because the entry
// guards nothing and blocking would lock the user out of the wallet.

// `unanswered` reaches only a caller whose purpose differs from the run it
// shared: the decline it saw answered somebody else's prompt. The caller
// re-asks if it still exists. The module must not re-ask on its behalf,
// because that raised prompts for components already unmounted.

/** Every answer the gate gives a caller that must act on it. */
export type AnsweredVerdict =
  | { kind: 'authenticated' }
  | { kind: 'declined'; failure: GateFailure }
  | { kind: 'unavailable'; failure: GateFailure };

/** The non-answer: the shared run's decline addressed another purpose, and the holder must do nothing. */
export type Unanswered = { kind: 'unanswered' };

/** Every way the gate as a whole can answer. */
export type GateVerdict = AnsweredVerdict | Unanswered;

// The iOS bridge rejects with the OSStatus as the error code.
//
// Only an explicit cancel is a decline. errSecAuthFailed (-25293) used to be
// listed here as well, and that reopened issue #1266 through a second door:
// iOS returns it just as readily for an access control it cannot satisfy (an
// enrolment that changed under a BIOMETRY_CURRENT_SET entry, say) as for a
// human getting the passcode wrong, and the two need opposite handling — a
// decline is final, an unsatisfiable entry has to be rebuilt. Rebuilding
// after a genuinely failed passcode costs one extra prompt and grants
// nothing: SecItemAdd is silent, but the read that follows it still goes
// through the OS.
const IOS_DECLINED: readonly string[] = ['-128']; // errSecUserCanceled

// Android reports every failure as E_CRYPTO_FAILED and carries the real
// BiometricPrompt code inside the message ("code: 13, msg: ..."). Lockout
// belongs here: waving five bad faces at the prompt must not open the gate.
const ANDROID_DECLINED: readonly number[] = [
  3, // ERROR_TIMEOUT
  5, // ERROR_CANCELED
  7, // ERROR_LOCKOUT
  9, // ERROR_LOCKOUT_PERMANENT
  10, // ERROR_USER_CANCELED
  13, // ERROR_NEGATIVE_BUTTON
];

/** Which authorization point a gate run answers for. */
export type GatePurpose = 'appEntry' | 'screenEntry';

type simpleBiometricsProps = {
  translate: (key: string) => TranslateType;
  purpose: GatePurpose;
};

// Emitted with a boolean payload (true=show, false=hide) so a root-level
// overlay can cover the activity while the system BiometricPrompt is up.
// Audit Issue C: on Android the prompt does not cover the whole screen and
// sensitive content stays visible behind it. iOS already gets this from the
// SceneDelegate privacyWindow (LocalAuthentication triggers willResignActive).
export const BIOMETRIC_BLANKING_EVENT = 'biometric-blanking';

// A keychain call that never comes back must not become a dead Unlock button.
// On iOS every method of the native module runs on one serial queue, and
// SecItemCopyMatching holds that queue for as long as the system auth UI is
// up — so one call that never settles silently swallows every call queued
// behind it. The awaits below would stay pending forever and the locked
// screen's only action would do literally nothing, with no error to report.
// A guarded call reports a stall instead. What a stall settles as is
// per-platform, per interactiveStall.
const NATIVE_STALL_MS = 10 * 1000;

// Android cannot veto a fire the way iOS can (the BiometricPrompt sheet need
// not take the activity out of 'active'), so its interactive window is wide
// enough that a person still deciding at the prompt almost never outlasts it.
const ANDROID_PROMPT_STALL_MS = 60 * 1000;

// AppState.currentState mutates only when the change event reaches the JS
// thread, so a resign-active event behind a just-appeared auth sheet can
// still be in flight when the window closes and the veto would read a stale
// 'active'. A veto-capable fire waits this long for it to land first.
const VETO_GRACE_MS = 1000;

// A real frame normally lands in one tick, so the budget costs nothing on
// a healthy launch. The overlay is a separate Android window whose first
// draw can lag a busy cold start, so the budget is generous without ever
// holding the gate for a stall window.
const PAINT_BUDGET_MS = 1000;

// The interactive stall policy's three axes move together, so one record
// answers all of them: how long the window runs, whether a fire can be
// vetoed off a live prompt, and what a stall settles as. A platform that
// can veto (iOS, where a live auth sheet provably leaves 'active') affords
// the short window and the fail-open verdict. One that cannot pairs the
// wide window with the fail-closed verdict, and every platform other than
// iOS takes that pairing: without a proven veto signal it is the safe one.
type InteractiveStallPolicy = {
  windowMs: number;
  vetoOffActive: boolean;
  settleAs: 'declined' | 'unavailable';
};

const interactiveStallPolicy = (): InteractiveStallPolicy =>
  Platform.OS === 'ios'
    ? {
        windowMs: NATIVE_STALL_MS,
        vetoOffActive: true,
        settleAs: 'unavailable',
      }
    : {
        windowMs: ANDROID_PROMPT_STALL_MS,
        vetoOffActive: false,
        settleAs: 'declined',
      };

const STALLED = Symbol('keychain-stalled');

// The countdown for an interactive call runs only while the app is observed
// 'active'. Leaving 'active' pauses it and returning re-arms it in full, so
// time the OS parks on a human never counts toward a stall, and a queue
// that is still wedged when the app comes back is caught by the fresh
// window. Where the policy record allows a veto, a fire is vetoed while the
// current state is 'inactive' or 'background', the two states that prove a
// live auth sheet or a backgrounded app, so a live prompt can never be
// declared a stall. An 'unknown' seed proves nothing (RN can seed it at
// launch and never replay the missed transition), so it does not veto:
// parking a wedged call on it would leave the gate pending forever. Calls
// that never show UI (the capability probes, has, reset) pass `false`: for
// them any stall is a wedged queue, full stop.

/** Resolves to STALLED when `op` outlives the platform's stall window. */
const stallGuard = <T>(
  op: Promise<T>,
  interactive: boolean,
): Promise<T | typeof STALLED> => {
  let disarm = () => {};
  const watchdog = new Promise<typeof STALLED>(resolve => {
    const policy = interactiveStallPolicy();
    const stallWindowMs = interactive ? policy.windowMs : NATIVE_STALL_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pause = () => {
      clearTimeout(timer);
      timer = undefined;
    };
    const fire = () => {
      if (
        interactive &&
        policy.vetoOffActive &&
        (AppState.currentState === 'inactive' ||
          AppState.currentState === 'background')
      ) {
        // The change event that would have paused the countdown can lose
        // the race against the timer. The veto reads the state that event
        // was carrying, and the handler below re-arms on the way back.
        pause();
        return;
      }
      resolve(STALLED);
    };
    const arm = () => {
      timer = setTimeout(() => {
        if (interactive && policy.vetoOffActive) {
          // Give an in-flight resign-active event the grace to land before
          // the veto reads the state. The change handler clears this timer
          // like any other.
          timer = setTimeout(fire, VETO_GRACE_MS);
          return;
        }
        fire();
      }, stallWindowMs);
    };
    const subscription = interactive
      ? AppState.addEventListener('change', next => {
          pause();
          if (next === 'active') {
            arm();
          }
        })
      : undefined;
    arm();
    disarm = () => {
      pause();
      subscription?.remove();
    };
  });
  return Promise.race([op, watchdog]).finally(() => disarm());
};

// A stall settles by the policy record: fail-open where the veto proved the
// prompt was off screen, fail-closed (a locked screen with a live retry)
// where nothing could prove it.
const interactiveStall = (failure: GateFailure): StalledOutcome => ({
  kind: 'stalled',
  settleAs: interactiveStallPolicy().settleAs,
  failure,
});

// Every native call the gate guards, named so the stall diagnostic is a
// machine token rather than prose.
type GuardedOp =
  | 'canImplyAuthentication'
  | 'getSupportedBiometryType'
  | 'isPasscodeAuthAvailable'
  | 'hasGenericPassword'
  | 'resetGenericPassword:v1'
  | 'resetGenericPassword:rebuild'
  | 'setGenericPassword'
  | 'getGenericPassword'
  | 'AsyncStorage.setItem';

type Guarded<T> =
  { kind: 'settled'; value: T } | { kind: 'stalled'; failure: GateFailure };

// Interactivity is a property of the op, not of the call site: the record
// removes the degree of freedom that would let a new site hand an
// interactive read the probe window (declaring a live prompt a stall) or
// park a wedged probe for the prompt window.
const OP_INTERACTIVITY: Record<GuardedOp, boolean> = {
  canImplyAuthentication: false,
  getSupportedBiometryType: false,
  isPasscodeAuthAvailable: false,
  hasGenericPassword: false,
  'resetGenericPassword:v1': false,
  'resetGenericPassword:rebuild': false,
  setGenericPassword: true,
  getGenericPassword: true,
  'AsyncStorage.setItem': false,
};

// The one place a native call meets the stall guard: the op name doubles as
// the stall diagnostic, so a new call site can neither silently regain the
// unbounded hang nor invent failure prose.
const guarded = async <T>(
  op: GuardedOp,
  call: () => Promise<T>,
): Promise<Guarded<T>> => {
  const raced = await stallGuard(call(), OP_INTERACTIVITY[op]);
  return raced === STALLED
    ? {
        kind: 'stalled',
        failure: gateFailure('biometrics-failure-stalled', op),
      }
    : { kind: 'settled', value: raced };
};

const buildAuthPrompt = (
  translate: (key: string) => TranslateType,
): Keychain.AuthenticationPrompt => ({
  title: translate('biometrics-message') as string,
  cancel: translate('cancel') as string,
});

// All set/get options for the sentinel come from the central
// `keychainOptions` module (INTERACTIVE_AUTH profile) — see that module for
// the rationale on accessControl, storage type, and the cross-platform
// mapping. Any future Keychain call site should reuse one of the profiles
// there instead of hand-rolling options.

const failureCode = (e: unknown): string =>
  typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : '';

const failureMessage = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

const describeFailure = (e: unknown): string => {
  const code = failureCode(e);
  return code ? `${code} ${failureMessage(e)}` : failureMessage(e);
};

// errSecAuthFailed is the one broken-entry code that follows a human
// actually failing the prompt (Android's equivalent, lockout, is already a
// decline). Every other code reaches brokenEntry without anyone asked.
const IOS_AUTH_FAILED = '-25293';

const classifyFailure = (e: unknown): AttemptOutcome => {
  const detail = describeFailure(e);
  // The prompt-code scrape stays anchored to E_CRYPTO_FAILED. Any other
  // error whose text happens to contain "code: N" is a platform failure
  // nobody was asked about, never a decline.
  const declined =
    Platform.OS === 'ios'
      ? IOS_DECLINED.includes(failureCode(e))
      : failureCode(e) === 'E_CRYPTO_FAILED' &&
        ANDROID_DECLINED.includes(
          Number(/code:\s*(-?\d+)/.exec(failureMessage(e))?.[1]),
        );
  if (declined) {
    return {
      kind: 'declined',
      failure: gateFailure('biometrics-failure-declined', detail),
    };
  }
  const cause: BrokenEntryCause =
    Platform.OS === 'ios' && failureCode(e) === IOS_AUTH_FAILED
      ? 'authFailed'
      : 'notServed';
  return {
    kind: 'brokenEntry',
    cause,
    failure: gateFailure(
      cause === 'authFailed'
        ? 'biometrics-failure-declined'
        : 'biometrics-failure-notserved',
      detail,
    ),
  };
};

// The rebuild decision needs one bit the outcome alone cannot carry: whether
// the entry the attempt ran against predates this gate run. A pre-existing
// entry that misbehaves may be the stale entry of issue #1266 and earns one
// rebuild. An entry written seconds ago under the current access control
// cannot be stale, so a failure against it is the user failing to
// authenticate. Collapsing the two is what let two failed prompts in a row
// open the gate.
type SettledPhase = { phase: 'settled'; verdict: GateVerdict };
type GatePhase =
  { phase: 'trustedEntry' } | { phase: 'freshEntry' } | SettledPhase;

const settled = (verdict: GateVerdict): SettledPhase => ({
  phase: 'settled',
  verdict,
});

// Pure and total: every (phase, outcome) pair maps to exactly one next
// phase, and the annotated types make the compiler hold the table
// exhaustive. The driver's loop condition proves the settled phase never
// reaches this function.
const advance = (
  state: Exclude<GatePhase, SettledPhase>,
  outcome: AttemptOutcome,
): GatePhase => {
  switch (outcome.kind) {
    case 'authenticated':
      return settled({ kind: 'authenticated' });
    case 'declined':
      return settled({ kind: 'declined', failure: outcome.failure });
    case 'stalled':
      // Never a rebuild: retrying would just spend another stall window in
      // front of a dead screen. The verdict is the platform's answer.
      return settled({ kind: outcome.settleAs, failure: outcome.failure });
    case 'brokenEntry':
      if (state.phase === 'trustedEntry') {
        return { phase: 'freshEntry' };
      }
      // Against an entry written seconds ago, only a failure the user was
      // actually asked about is a decline. An entry the platform would not
      // serve is a gate that cannot run, and locking on it would re-open
      // the issue #1266 trap.
      return outcome.cause === 'authFailed'
        ? settled({ kind: 'declined', failure: outcome.failure })
        : settled({ kind: 'unavailable', failure: outcome.failure });
  }
};

const attemptGate = async (
  translate: (key: string) => TranslateType,
  create: boolean,
): Promise<AttemptOutcome> => {
  try {
    if (create) {
      // On Android the AES_GCM key is user-auth required so the set itself
      // drives the BiometricPrompt; on iOS the set is silent and the prompt
      // comes from the read below.
      const written = await guarded('setGenericPassword', () =>
        Keychain.setGenericPassword(
          SENTINEL_USERNAME,
          SENTINEL_VALUE,
          buildSetOptions(
            SENTINEL_SERVICE,
            'INTERACTIVE_AUTH',
            buildAuthPrompt(translate),
          ),
        ),
      );
      if (written.kind === 'stalled') {
        return interactiveStall(written.failure);
      }
    }
    const cred = await guarded('getGenericPassword', () =>
      Keychain.getGenericPassword(
        buildGetOptions(
          SENTINEL_SERVICE,
          'INTERACTIVE_AUTH',
          buildAuthPrompt(translate),
        ),
      ),
    );
    if (cred.kind === 'stalled') {
      return interactiveStall(cred.failure);
    }
    if (cred.value) {
      return { kind: 'authenticated' };
    }
    // A resolved `false` means the entry was not found. No prompt can have
    // been satisfied against an entry that is not there.
    return {
      kind: 'brokenEntry',
      cause: 'notServed',
      failure: gateFailure(
        'biometrics-failure-notserved',
        'getGenericPassword:empty',
      ),
    };
  } catch (e) {
    return classifyFailure(e);
  }
};

const runGate = async (props: simpleBiometricsProps): Promise<GateVerdict> => {
  // Pre-flight: if the device cannot authenticate at all (no biometry, no
  // passcode), short-circuit so the caller can decide whether to allow the
  // operation rather than blocking on an impossible prompt.
  const security = await probeDeviceSecurity();
  if (security.kind === 'insecure') {
    // A stalled probe proves nothing about a live prompt, so it settles by
    // the platform's stall policy like every other stall. A retry's probe
    // queues behind the very call that stalled its parent, and answering
    // it 'unavailable' would open on Android the lock the parent held.
    // Only a genuine no-security answer fails open, because no lock could
    // ever open it.
    const kind =
      security.failure.errorKey === 'biometrics-failure-stalled'
        ? interactiveStallPolicy().settleAs
        : 'unavailable';
    return { kind, failure: security.failure };
  }

  try {
    if (Platform.OS === 'android') {
      // Raised inside the try so the finally can always lower it: a
      // rejection anywhere past this line still drops the overlay.
      DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, true);
      // Yield one frame so the overlay paints before the system prompt
      // opens. The paint is cosmetic, so the wait is bounded by a frame
      // budget and a frameless or throwing yield never denies the gate.
      await new Promise<void>(resolve => {
        let frame: number | undefined;
        const frameBudget = setTimeout(() => {
          if (frame !== undefined) {
            cancelAnimationFrame(frame);
          }
          resolve();
        }, PAINT_BUDGET_MS);
        try {
          frame = requestAnimationFrame(() => {
            clearTimeout(frameBudget);
            resolve();
          });
        } catch {
          clearTimeout(frameBudget);
          resolve();
        }
      });
    }
    // hasGenericPassword answers "an entry exists", never "an entry works".
    // The iOS bridge resolves it to true on errSecInteractionNotAllowed, so
    // use it to decide whether a create is worth paying for, not as proof.
    const has = await guarded('hasGenericPassword', () =>
      Keychain.hasGenericPassword({
        service: SENTINEL_SERVICE,
      }),
    );
    if (has.kind === 'stalled') {
      return { kind: 'unavailable', failure: has.failure };
    }
    if (!has.value) {
      // Nothing reads v1 from here on. The delete needs no prompt, and
      // deleting an absent entry resolves, so it runs without a lookup.
      const clearedV1 = await guarded('resetGenericPassword:v1', () =>
        Keychain.resetGenericPassword({ service: SENTINEL_SERVICE_V1 }),
      );
      if (clearedV1.kind === 'stalled') {
        // A wedge starting here settles now, like every sibling guard,
        // instead of riding into the interactive attempt and its window.
        return {
          kind: 'unavailable',
          failure: clearedV1.failure,
        };
      }
    }

    // The effectful driver of the pure `advance` table. It terminates in at
    // most two attempts: `advance` never re-enters trustedEntry, and from
    // freshEntry every outcome settles.
    let state: GatePhase = has.value
      ? { phase: 'trustedEntry' }
      : { phase: 'freshEntry' };
    // A first-run create writes into an empty service. Only the
    // trustedEntry -> freshEntry rebuild must clear the stale entry first.
    let clearBeforeAttempt = false;
    while (state.phase !== 'settled') {
      if (clearBeforeAttempt) {
        const cleared = await guarded('resetGenericPassword:rebuild', () =>
          Keychain.resetGenericPassword(
            buildBaseOptions(SENTINEL_SERVICE, 'INTERACTIVE_AUTH'),
          ),
        );
        if (cleared.kind === 'stalled') {
          return {
            kind: 'unavailable',
            failure: cleared.failure,
          };
        }
      }
      state = advance(
        state,
        await attemptGate(props.translate, state.phase === 'freshEntry'),
      );
      clearBeforeAttempt = state.phase === 'freshEntry';
    }
    return state.verdict;
  } catch (e) {
    // The probes, the resets, and the frame yield reject on an unexpected
    // platform status. The user was never asked, so this is a gate we cannot
    // run rather than an authentication anybody failed.
    return {
      kind: 'unavailable',
      failure: gateFailure('biometrics-failure-notserved', describeFailure(e)),
    };
  } finally {
    if (Platform.OS === 'android') {
      // Dropped at the verdict, accepting the bounded exposure behind a
      // still-live prompt over a black overlay that outlives its purpose.
      DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, false);
    }
    // iOS treats the auth prompt as the app going to background; restore the
    // foreground flag so background-state handling doesn't trip. Guarded and
    // swallowed: neither a wedged nor a failing store write may replace the
    // verdict every caller shares.
    try {
      await guarded('AsyncStorage.setItem', () =>
        AsyncStorage.setItem(GlobalConst.background, GlobalConst.no),
      );
    } catch {
      // The verdict outranks the flag restore.
    }
  }
};

// The gate's process-wide lifecycle. `running` shares the run in flight so
// concurrent callers never stack prompts. A settled verdict always returns
// to `idle`, and a retry runs fresh even while an earlier call is still
// pending in the native module. The collision costs at most one immediate,
// retriable ERROR_CANCELED decline. Blocking retries instead made a
// never-settling call unrecoverable, the issue #1266 trap.
type GateLifecycle =
  | { stage: 'idle' }
  | {
      stage: 'running';
      purpose: GatePurpose;
      verdictOut: Promise<GateVerdict>;
    };

let lifecycle: GateLifecycle = { stage: 'idle' };

const startRun = (props: simpleBiometricsProps): Promise<GateVerdict> => {
  const verdictOut = runGate(props).finally(() => {
    lifecycle = { stage: 'idle' };
  });
  lifecycle = { stage: 'running', purpose: props.purpose, verdictOut };
  return verdictOut;
};

/**
 * Triggers an OS biometric / device-credential prompt and answers with a
 * GateVerdict.
 */
const simpleBiometrics = (
  props: simpleBiometricsProps,
): Promise<GateVerdict> => {
  switch (lifecycle.stage) {
    case 'running': {
      const running = lifecycle;
      if (running.purpose === props.purpose) {
        return running.verdictOut;
      }
      // A pass authenticates the person for any purpose. A decline answers
      // only the purpose the user was actually shown, so a cross-purpose
      // caller receives `unanswered` and decides for itself whether to
      // re-ask.
      return running.verdictOut.then((verdict): GateVerdict =>
        verdict.kind === 'declined' ? { kind: 'unanswered' } : verdict,
      );
    }
    case 'idle':
      return startRun(props);
  }
};

/** The device-security probe's answer, carrying the reason when it cannot secure. */
export type DeviceSecurityProbe =
  { kind: 'secured' } | { kind: 'insecure'; failure: GateFailure };

const insecure = (failure: GateFailure): DeviceSecurityProbe => ({
  kind: 'insecure',
  failure,
});

const NO_DEVICE_SECURITY: GateFailure = gateFailure(
  'biometrics-failure-nosecurity',
);

// canImplyAuthentication() is iOS-only in react-native-keychain and always
// returns false on Android, so the Android answer is composed from the
// biometry-type query plus the device passcode probe. These probes are the
// first keychain calls of the flow, which makes them the ones that queue
// behind a wedged predecessor. Each refusal carries its own reason, so the
// pre-flight verdict never inherits a stale one.

/** Answers whether the device can authenticate its user, with the reason when it cannot. */
export const probeDeviceSecurity = async (): Promise<DeviceSecurityProbe> => {
  try {
    if (Platform.OS === 'ios') {
      const can = await guarded('canImplyAuthentication', () =>
        Keychain.canImplyAuthentication(),
      );
      if (can.kind === 'stalled') {
        return insecure(can.failure);
      }
      return can.value ? { kind: 'secured' } : insecure(NO_DEVICE_SECURITY);
    }
    const biometry = await guarded('getSupportedBiometryType', () =>
      Keychain.getSupportedBiometryType(),
    );
    if (biometry.kind === 'stalled') {
      return insecure(biometry.failure);
    }
    if (biometry.value !== null) {
      return { kind: 'secured' };
    }
    const passcode = await guarded('isPasscodeAuthAvailable', () =>
      Keychain.isPasscodeAuthAvailable(),
    );
    if (passcode.kind === 'stalled') {
      return insecure(passcode.failure);
    }
    return passcode.value ? { kind: 'secured' } : insecure(NO_DEVICE_SECURITY);
  } catch (e) {
    return insecure(
      gateFailure('biometrics-failure-notserved', describeFailure(e)),
    );
  }
};

// The re-ask loop for app-level callers. A re-ask for a backgrounded
// activity is answered ERROR_CANCELED, which classifies as a decline and
// locks, so the loop holds while the app is provably away and asks again
// the moment it returns. An 'inactive' read right after the shared sheet
// closes is stale, and the pending active event releases the hold moments
// later; an 'unknown' seed proves nothing and never parks the loop. A
// concurrent run started by the caller's own re-entry shares, so the hold
// can never stack prompts.

const untilProvablyActive = (): Promise<void> => {
  if (
    AppState.currentState !== 'inactive' &&
    AppState.currentState !== 'background'
  ) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        subscription.remove();
        resolve();
      }
    });
  });
};

/** Runs the gate for an app-level caller, re-asking on `unanswered` once the app is back in the foreground. */
export const gateUntilAnswered = async (
  props: simpleBiometricsProps,
): Promise<AnsweredVerdict> => {
  let verdict = await simpleBiometrics(props);
  while (verdict.kind === 'unanswered') {
    await untilProvablyActive();
    verdict = await simpleBiometrics(props);
  }
  return verdict;
};

export default simpleBiometrics;
