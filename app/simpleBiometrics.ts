import { DeviceEventEmitter, Platform } from 'react-native';

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GlobalConst, TranslateType } from './AppState';
import { buildGetOptions, buildSetOptions } from './utils/keychainOptions';

// Single biometric library: react-native-keychain. We use a "sentinel" entry
// stored under a dedicated service to drive every biometric prompt — the lib
// surfaces the OS BiometricPrompt as a side-effect of accessing a credential
// whose access control requires user authentication. This:
//   - drops react-native-biometrics (unmaintained since 2022, audit-backlog)
//   - reuses the keychain's auth window across prompts (no double-prompts)
//   - keeps simpleBiometrics() callers untouched (same signature/contract).
const SENTINEL_SERVICE = 'zingo-biometric-sentinel';
const SENTINEL_USERNAME = 'sentinel';
const SENTINEL_VALUE = '1';

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

/**
 * Triggers an OS biometric / device-credential prompt.
 *
 * Return values are preserved from the previous react-native-biometrics
 * implementation so callers do not need to change:
 *   - true      → authenticated
 *   - false     → user cancelled or auth failed
 *   - undefined → device has no auth method at all; caller should proceed
 *                 rather than lock the user out of their own wallet.
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
    const has = await Keychain.hasGenericPassword({
      service: SENTINEL_SERVICE,
    });
    if (!has) {
      // Lazy sentinel creation. On Android the AES_GCM key is user-auth
      // required so the set itself drives the BiometricPrompt; on iOS the
      // set is silent and the prompt comes from the get below.
      await Keychain.setGenericPassword(
        SENTINEL_USERNAME,
        SENTINEL_VALUE,
        buildSetOptions(
          SENTINEL_SERVICE,
          'INTERACTIVE_AUTH',
          buildAuthPrompt(props.translate),
        ),
      );
    }
    // Always exercise the access-controlled read so every call surfaces a
    // prompt (or reuses a recent auth window if one is still valid).
    const cred = await Keychain.getGenericPassword(
      buildGetOptions(
        SENTINEL_SERVICE,
        'INTERACTIVE_AUTH',
        buildAuthPrompt(props.translate),
      ),
    );
    return !!cred;
  } catch (e) {
    // After canAuth=true the only ways here are user cancel or platform
    // error. We treat both as "not authenticated" — same as the prior lib.
    console.log('biometrics: prompt failed', e);
    return false;
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
