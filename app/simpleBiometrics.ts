import { DeviceEventEmitter, Platform } from 'react-native';

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
//   - keeps simpleBiometrics() callers untouched (same signature/contract).
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
type GateOutcome = 'authenticated' | 'declined' | 'broken';

// The iOS bridge rejects with the OSStatus as the error code.
const IOS_DECLINED = ['-128', '-25293']; // errSecUserCanceled, errSecAuthFailed

// Android reports every failure as E_CRYPTO_FAILED and carries the real
// BiometricPrompt code inside the message ("code: 13, msg: ..."). Lockout
// belongs here: waving five bad faces at the prompt must not open the gate.
const ANDROID_DECLINED = [
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

const classifyFailure = (e: unknown): GateOutcome => {
  if (Platform.OS === 'ios') {
    return IOS_DECLINED.includes(failureCode(e)) ? 'declined' : 'broken';
  }
  const promptCode = Number(/code:\s*(-?\d+)/.exec(failureMessage(e))?.[1]);
  return ANDROID_DECLINED.includes(promptCode) ? 'declined' : 'broken';
};

let lastFailure = '';

/**
 * Platform error behind the most recent refused gate, empty when the last
 * attempt went through. The locked screen shows it so a bug report carries an
 * OSStatus instead of "it just bounces back".
 */
export const getLastGateFailure = (): string => lastFailure;

const attemptGate = async (
  translate: (key: string) => TranslateType,
  create: boolean,
): Promise<GateOutcome> => {
  try {
    if (create) {
      // On Android the AES_GCM key is user-auth required so the set itself
      // drives the BiometricPrompt; on iOS the set is silent and the prompt
      // comes from the read below.
      await Keychain.setGenericPassword(
        SENTINEL_USERNAME,
        SENTINEL_VALUE,
        buildSetOptions(
          SENTINEL_SERVICE,
          'INTERACTIVE_AUTH',
          buildAuthPrompt(translate),
        ),
      );
    }
    const cred = await Keychain.getGenericPassword(
      buildGetOptions(
        SENTINEL_SERVICE,
        'INTERACTIVE_AUTH',
        buildAuthPrompt(translate),
      ),
    );
    if (cred) {
      lastFailure = '';
      return 'authenticated';
    }
    // A resolved `false` means the entry was not found. No prompt can have
    // been satisfied against an entry that is not there.
    lastFailure = 'sentinel entry missing';
    return 'broken';
  } catch (e) {
    lastFailure = describeFailure(e);
    return classifyFailure(e);
  }
};

/**
 * Triggers an OS biometric / device-credential prompt.
 *
 * Return values are preserved from the previous react-native-biometrics
 * implementation so callers do not need to change:
 *   - true      → authenticated
 *   - false     → user cancelled or auth failed
 *   - undefined → the gate cannot run on this device (no auth method, or a
 *                 keychain entry the OS refuses to serve); caller should
 *                 proceed rather than lock the user out of their own wallet.
 */
const simpleBiometrics = async (
  props: simpleBiometricsProps,
): Promise<boolean | undefined> => {
  // Pre-flight: if the device cannot authenticate at all (no biometry, no
  // passcode), short-circuit so the caller can decide whether to allow the
  // operation rather than blocking on an impossible prompt.
  if (!(await hasDeviceSecurity())) {
    return undefined;
  }

  if (Platform.OS === 'android') {
    DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, true);
    // Yield one frame so the overlay paints before the system prompt opens.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }

  try {
    // hasGenericPassword answers "an entry exists", never "an entry works".
    // The iOS bridge resolves it to true on errSecInteractionNotAllowed, so
    // use it to decide whether a create is worth paying for, not as proof.
    const has = await Keychain.hasGenericPassword({
      service: SENTINEL_SERVICE,
    });
    if (!has) {
      // Nothing reads v1 from here on. The delete needs no prompt, and
      // deleting an absent entry resolves, so it runs without a lookup.
      await Keychain.resetGenericPassword({ service: SENTINEL_SERVICE_V1 });
    }
    let outcome = await attemptGate(props.translate, !has);

    if (outcome === 'broken') {
      await Keychain.resetGenericPassword(
        buildBaseOptions(SENTINEL_SERVICE, 'INTERACTIVE_AUTH'),
      );
      outcome = await attemptGate(props.translate, true);
    }

    if (outcome === 'authenticated') {
      return true;
    }
    return outcome === 'declined' ? false : undefined;
  } catch (e) {
    // hasGenericPassword and resetGenericPassword reject on an unexpected
    // platform status. The user was never asked, so this is a gate we cannot
    // run rather than an authentication anybody failed.
    lastFailure = describeFailure(e);
    return undefined;
  } finally {
    if (Platform.OS === 'android') {
      DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, false);
    }
    // iOS treats the auth prompt as the app going to background;
    // restore the foreground flag so background-state handling doesn't trip.
    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
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
 */
export const hasDeviceSecurity = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      return await Keychain.canImplyAuthentication();
    }
    const biometry = await Keychain.getSupportedBiometryType();
    if (biometry !== null) {
      return true;
    }
    return await Keychain.isPasscodeAuthAvailable();
  } catch {
    return false;
  }
};

export default simpleBiometrics;
