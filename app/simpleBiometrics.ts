import { AppState, DeviceEventEmitter, Platform } from 'react-native';

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GlobalConst, TranslateType } from './AppState';
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
// back at all. It must not trigger the rebuild — see NATIVE_STALL_MS below.
// What a stall settles as differs by platform, and the outcome carries that
// answer in `settleAs` — see interactiveStall for the policy.

/** The stalled attempt outcome, carrying the platform's settlement policy. */
export type StalledOutcome = {
  kind: 'stalled';
  settleAs: 'declined' | 'unavailable';
  failure: string;
};

/** Every way one keychain attempt against the sentinel can end. */
export type AttemptOutcome =
  | { kind: 'authenticated' }
  | { kind: 'declined'; failure: string }
  | { kind: 'brokenEntry'; failure: string }
  | StalledOutcome;

// `unavailable` is the gate refusing to run, not the user refusing to
// authenticate: no device security, a wedged native queue, or a platform
// error nobody was prompted for. Callers proceed on it, because the entry
// guards nothing and blocking would lock the user out of the wallet.

/** Every way the gate as a whole can answer. */
export type GateVerdict =
  | { kind: 'authenticated' }
  | { kind: 'declined'; failure: string }
  | { kind: 'unavailable'; failure: string };

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

type simpleBiometricsProps = {
  translate: (key: string) => TranslateType;
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
// A guarded call reports a stall instead; what a stall settles as is
// per-platform — see interactiveStall.
const NATIVE_STALL_MS = 10 * 1000;

// Android cannot veto a fire the way iOS can (the BiometricPrompt sheet need
// not take the activity out of 'active'), so its interactive window is wide
// enough that a person still deciding at the prompt almost never outlasts it.
const ANDROID_PROMPT_STALL_MS = 60 * 1000;

// AppState.currentState mutates only when the change event reaches the JS
// thread, so a resign-active event behind a just-appeared auth sheet can
// still be in flight when the window closes and the veto would read a stale
// 'active'. An iOS interactive fire waits this long for it to land first.
const IOS_VETO_GRACE_MS = 1000;

const STALLED = Symbol('keychain-stalled');

const swallow = () => undefined;

// Native calls that lost their stall race but are still pending inside the
// native module — their eventual prompt and result belong to nobody. The
// gate lifecycle below waits on them so a retry never stacks a second
// prompt on top of one, and the Android blanking overlay stays up until
// they settle.
let strandedCalls: Array<Promise<undefined>> = [];

// The countdown for an interactive call runs only while the app is observed
// 'active'. Leaving 'active' pauses it and returning re-arms it in full, so
// time the OS parks on a human never counts toward a stall, and a queue
// that is still wedged when the app comes back is caught by the fresh
// window. On iOS a fire is vetoed while the current state is 'inactive' or
// 'background' — the two states that prove a live auth sheet or a
// backgrounded app — so a live prompt can never be declared a stall there.
// An 'unknown' seed proves nothing (RN can seed it at launch and never
// replay the missed transition), so it does not veto: parking a wedged call
// on it would leave the gate pending forever. Android keeps its
// BiometricPrompt inside the resumed activity, so no veto is possible and a
// fire is answered by policy instead (see interactiveStall). Calls that
// never show UI (the capability probes, has, reset) pass `false`: for them
// any stall is a wedged queue, full stop.

/** Resolves to STALLED when `op` outlives the platform's stall window. */
const stallGuard = <T>(
  op: Promise<T>,
  interactive: boolean,
): Promise<T | typeof STALLED> => {
  let disarm = () => {};
  const watchdog = new Promise<typeof STALLED>(resolve => {
    const stallWindowMs =
      interactive && Platform.OS === 'android'
        ? ANDROID_PROMPT_STALL_MS
        : NATIVE_STALL_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pause = () => {
      clearTimeout(timer);
      timer = undefined;
    };
    const fire = () => {
      if (
        interactive &&
        Platform.OS === 'ios' &&
        (AppState.currentState === 'inactive' ||
          AppState.currentState === 'background')
      ) {
        // The change event that would have paused the countdown can lose
        // the race against the timer; the veto reads the state that event
        // was carrying, and the handler below re-arms on the way back.
        pause();
        return;
      }
      if (interactive) {
        strandedCalls.push(op.then(swallow, swallow));
      }
      resolve(STALLED);
    };
    const arm = () => {
      timer = setTimeout(() => {
        if (interactive && Platform.OS === 'ios') {
          // Give an in-flight resign-active event the grace to land before
          // the veto reads the state; the change handler clears this timer
          // like any other.
          timer = setTimeout(fire, IOS_VETO_GRACE_MS);
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

// On iOS a fire proves the prompt is not on screen (a live prompt keeps the
// app out of 'active' and vetoes it), so the gate cannot run and the caller
// proceeds. On Android a fire cannot prove that, and proceeding would open
// the wallet to whoever waits out the prompt, so it settles as declined: the
// locked screen returns with a retry that issues a fresh prompt.
const interactiveStall = (failure: string): StalledOutcome => ({
  kind: 'stalled',
  settleAs: Platform.OS === 'ios' ? 'unavailable' : 'declined',
  failure,
});

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

const classifyFailure = (e: unknown): AttemptOutcome => {
  const declined =
    Platform.OS === 'ios'
      ? IOS_DECLINED.includes(failureCode(e))
      : ANDROID_DECLINED.includes(
          Number(/code:\s*(-?\d+)/.exec(failureMessage(e))?.[1]),
        );
  return declined
    ? { kind: 'declined', failure: describeFailure(e) }
    : { kind: 'brokenEntry', failure: describeFailure(e) };
};

// The rebuild decision needs one bit the outcome alone cannot carry: whether
// the entry the attempt ran against predates this gate run. A pre-existing
// entry that misbehaves may be the stale entry of issue #1266 and earns one
// rebuild; an entry written seconds ago under the current access control
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
// phase, and the annotated return type makes the compiler hold the table
// exhaustive.
const advance = (state: GatePhase, outcome: AttemptOutcome): GatePhase => {
  if (state.phase === 'settled') {
    return state;
  }
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
      return state.phase === 'trustedEntry'
        ? { phase: 'freshEntry' }
        : settled({ kind: 'declined', failure: outcome.failure });
  }
};

let lastFailure = '';

/**
 * Platform error behind the most recent refused gate, empty when the last
 * attempt went through. The locked screen shows it so a bug report carries an
 * OSStatus instead of "it just bounces back".
 */
export const getLastGateFailure = (): string => lastFailure;

const recordVerdict = (verdict: GateVerdict): GateVerdict => {
  lastFailure = verdict.kind === 'authenticated' ? '' : verdict.failure;
  return verdict;
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
      const written = await stallGuard(
        Keychain.setGenericPassword(
          SENTINEL_USERNAME,
          SENTINEL_VALUE,
          buildSetOptions(
            SENTINEL_SERVICE,
            'INTERACTIVE_AUTH',
            buildAuthPrompt(translate),
          ),
        ),
        true,
      );
      if (written === STALLED) {
        return interactiveStall('keychain stalled writing the sentinel');
      }
    }
    const cred = await stallGuard(
      Keychain.getGenericPassword(
        buildGetOptions(
          SENTINEL_SERVICE,
          'INTERACTIVE_AUTH',
          buildAuthPrompt(translate),
        ),
      ),
      true,
    );
    if (cred === STALLED) {
      return interactiveStall('keychain stalled reading the sentinel');
    }
    if (cred) {
      return { kind: 'authenticated' };
    }
    // A resolved `false` means the entry was not found. No prompt can have
    // been satisfied against an entry that is not there.
    return { kind: 'brokenEntry', failure: 'sentinel entry missing' };
  } catch (e) {
    return classifyFailure(e);
  }
};

// Audit Issue C: the overlay hides wallet content behind Android's
// partial-screen prompt. A stranded call may still have that prompt on
// screen when the verdict comes back, so the overlay stays up until every
// strand settles.
const hideBlankingWhenClear = (): void => {
  if (strandedCalls.length === 0) {
    DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, false);
    return;
  }
  Promise.all(strandedCalls).then(() =>
    DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, false),
  );
};

const runGate = async (props: simpleBiometricsProps): Promise<GateVerdict> => {
  // Pre-flight: if the device cannot authenticate at all (no biometry, no
  // passcode), short-circuit so the caller can decide whether to allow the
  // operation rather than blocking on an impossible prompt. `lastFailure`
  // still holds whatever a stalled probe recorded, so pass it through.
  if (!(await hasDeviceSecurity())) {
    return { kind: 'unavailable', failure: lastFailure };
  }

  if (Platform.OS === 'android') {
    DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, true);
    // Yield one frame so the overlay paints before the system prompt opens.
    // A backgrounded launch delivers no frames, so the wait is guarded: the
    // prompt then opens without the paint rather than parking the gate.
    await stallGuard(
      new Promise<void>(resolve => requestAnimationFrame(() => resolve())),
      false,
    );
  }

  try {
    // hasGenericPassword answers "an entry exists", never "an entry works".
    // The iOS bridge resolves it to true on errSecInteractionNotAllowed, so
    // use it to decide whether a create is worth paying for, not as proof.
    const has = await stallGuard(
      Keychain.hasGenericPassword({
        service: SENTINEL_SERVICE,
      }),
      false,
    );
    if (has === STALLED) {
      return recordVerdict({
        kind: 'unavailable',
        failure: 'keychain stalled probing the sentinel',
      });
    }
    if (!has) {
      // Nothing reads v1 from here on. The delete needs no prompt, and
      // deleting an absent entry resolves, so it runs without a lookup.
      await stallGuard(
        Keychain.resetGenericPassword({ service: SENTINEL_SERVICE_V1 }),
        false,
      );
    }

    // The effectful driver of the pure `advance` table. It terminates in at
    // most two attempts: `advance` never re-enters trustedEntry, and from
    // freshEntry every outcome settles.
    let state: GatePhase = has
      ? { phase: 'trustedEntry' }
      : { phase: 'freshEntry' };
    // A first-run create writes into an empty service; only the
    // trustedEntry -> freshEntry rebuild must clear the stale entry first.
    let clearBeforeAttempt = false;
    while (state.phase !== 'settled') {
      if (clearBeforeAttempt) {
        const cleared = await stallGuard(
          Keychain.resetGenericPassword(
            buildBaseOptions(SENTINEL_SERVICE, 'INTERACTIVE_AUTH'),
          ),
          false,
        );
        if (cleared === STALLED) {
          return recordVerdict({
            kind: 'unavailable',
            failure: 'keychain stalled clearing the sentinel',
          });
        }
      }
      state = advance(
        state,
        await attemptGate(props.translate, state.phase === 'freshEntry'),
      );
      clearBeforeAttempt = state.phase === 'freshEntry';
    }
    return recordVerdict(state.verdict);
  } catch (e) {
    // hasGenericPassword and resetGenericPassword reject on an unexpected
    // platform status. The user was never asked, so this is a gate we cannot
    // run rather than an authentication anybody failed.
    return recordVerdict({ kind: 'unavailable', failure: describeFailure(e) });
  } finally {
    if (Platform.OS === 'android') {
      hideBlankingWhenClear();
    }
    // iOS treats the auth prompt as the app going to background; restore the
    // foreground flag so background-state handling doesn't trip. Guarded: a
    // wedged storage write must not park the verdict every caller shares.
    await stallGuard(
      AsyncStorage.setItem(GlobalConst.background, GlobalConst.no),
      false,
    );
  }
};

// The gate's process-wide lifecycle. `running` shares the run in flight so
// concurrent callers never stack prompts. `strandedCall` is the state a
// bare Promise-or-undefined cache cannot represent: the verdict is out but
// a native call is still pending, and a fresh run started against it
// collides (Android answers the collision with ERROR_CANCELED, re-locking
// every retry). A caller arriving then waits for the strand under the
// stall window before running.
type GateLifecycle =
  | { stage: 'idle' }
  | { stage: 'running'; verdictOut: Promise<GateVerdict> }
  | { stage: 'strandedCall'; settled: Promise<undefined> };

let lifecycle: GateLifecycle = { stage: 'idle' };

const settleLifecycle = (): void => {
  if (strandedCalls.length === 0) {
    lifecycle = { stage: 'idle' };
    return;
  }
  const strandSettled = Promise.all(strandedCalls).then(swallow);
  strandedCalls = [];
  const stranded: GateLifecycle = {
    stage: 'strandedCall',
    settled: strandSettled,
  };
  lifecycle = stranded;
  strandSettled.then(() => {
    if (lifecycle === stranded) {
      lifecycle = { stage: 'idle' };
    }
  });
};

const startRun = (props: simpleBiometricsProps): Promise<GateVerdict> => {
  const verdictOut = runGate(props).finally(settleLifecycle);
  lifecycle = { stage: 'running', verdictOut };
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
    case 'running':
      return lifecycle.verdictOut;
    case 'strandedCall': {
      const verdictOut = stallGuard(lifecycle.settled, true).then(strand => {
        if (strand === STALLED) {
          // The strand outlived another full window; stallGuard re-entered
          // it into strandedCalls, and the verdict follows the platform's
          // stall policy rather than risking a stacked prompt.
          const stall = interactiveStall(
            'a keychain call from an earlier gate is still pending',
          );
          settleLifecycle();
          return recordVerdict({
            kind: stall.settleAs,
            failure: stall.failure,
          });
        }
        return runGate(props).finally(settleLifecycle);
      });
      lifecycle = { stage: 'running', verdictOut };
      return verdictOut;
    }
    case 'idle':
      return startRun(props);
  }
};

/**
 * True when the device can authenticate the user via biometry or device
 * credential. Used by Settings to enable/disable the per-screen bio toggles.
 * Replaces the react-native-biometrics isSensorAvailable() check.
 *
 * canImplyAuthentication() is iOS-only in react-native-keychain and always
 * returns false on Android. So we compose the Android answer ourselves from
 * the biometry-type query plus the device passcode probe.
 *
 * These probes are the first keychain calls of the flow, which makes them the
 * ones that queue behind a wedged predecessor. A stall reads as "no device
 * security", and that is what settles the gate as `unavailable` instead of
 * leaving the caller waiting forever.
 */
export const hasDeviceSecurity = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      const can = await stallGuard(Keychain.canImplyAuthentication(), false);
      if (can === STALLED) {
        lastFailure = 'keychain stalled probing device security';
        return false;
      }
      return can;
    }
    const biometry = await stallGuard(
      Keychain.getSupportedBiometryType(),
      false,
    );
    if (biometry === STALLED) {
      lastFailure = 'keychain stalled probing biometry type';
      return false;
    }
    if (biometry !== null) {
      return true;
    }
    const passcode = await stallGuard(
      Keychain.isPasscodeAuthAvailable(),
      false,
    );
    if (passcode === STALLED) {
      lastFailure = 'keychain stalled probing passcode availability';
      return false;
    }
    return passcode;
  } catch {
    return false;
  }
};

export default simpleBiometrics;
