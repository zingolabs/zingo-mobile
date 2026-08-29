import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';

/**
 * Centralized builders for `react-native-keychain` options.
 *
 * The lib's options surface is large, cross-platform, and easy to misuse: a
 * single missing key can silently change the resulting BiometricPrompt /
 * Keychain ACL into something that doesn't match the call site's intent.
 * This module enumerates the two profiles the app actually uses and forces
 * every call site to pick one explicitly. Any future code that needs
 * Keychain should reuse a profile from here (or add a new one with the same
 * platform-by-platform rationale documented) instead of hand-rolling
 * options.
 *
 * Profiles:
 *
 * - `INTERACTIVE_AUTH`: the read/write is gated by an OS auth prompt
 *   (biometric or device credential). The retired keychain-sentinel gate
 *   was its only consumer (ADR 0007 replaced it with the DeviceAuth
 *   native module), so the profile is currently unused and awaits its own
 *   removal. Critically, the Android prompt
 *   accepts EITHER biometric (BIOMETRIC_STRONG) OR the device passcode —
 *   without explicitly setting `accessControl` the lib defaults to a
 *   prompt that only accepts BIOMETRIC_STRONG, which fails on
 *   passcode-only devices (e.g. Galaxy Tab A8) with
 *   `BIOMETRIC_ERROR_HW_UNAVAILABLE` (code 12). Both platforms now use the
 *   `BIOMETRY_ANY_OR_DEVICE_PASSCODE` shape for the same reason.
 *
 * - `SILENT_SECURE`: no prompt. The data is encrypted at rest in the
 *   hardware-backed Keystore/Keychain but readable any time the device is
 *   unlocked. Used by `recoveryWalletInfo` so the seed/UFVK survives app
 *   uninstall+reinstall without prompting the user on every read.
 */
export type KeychainProfile = 'INTERACTIVE_AUTH' | 'SILENT_SECURE';

/**
 * Build options for `Keychain.setGenericPassword`.
 *
 * @param service - The Keychain service (logical bucket) the credentials
 *   live under. Different services don't collide.
 * @param profile - Auth profile; see `KeychainProfile`.
 * @param authPrompt - Localized prompt strings; required for
 *   INTERACTIVE_AUTH (the prompt is shown to the user), ignored for
 *   SILENT_SECURE.
 */
export function buildSetOptions(
  service: string,
  profile: KeychainProfile,
  authPrompt?: Keychain.AuthenticationPrompt,
): Keychain.SetOptions {
  const base = { service };

  if (profile === 'SILENT_SECURE') {
    const iosPart =
      Platform.OS === 'ios'
        ? { accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
        : {};
    const androidPart =
      Platform.OS === 'android'
        ? {
            securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
            storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
          }
        : {};
    return { ...base, ...iosPart, ...androidPart };
  }

  // INTERACTIVE_AUTH
  // iOS: `BIOMETRY_ANY_OR_DEVICE_PASSCODE` maps to
  // `kSecAccessControlTouchIDAny|Or|DevicePasscode`, which Apple defines as
  // `kSecAccessControlUserPresence`. The `CurrentSet` variant this used to
  // carry snapshots the biometric enrolment into the entry, so it breaks two
  // ways: re-enrolling Face ID invalidates the entry, and on a device with no
  // enrolment at all there is nothing to snapshot, so `SecItemAdd` rejects
  // before any prompt appears. The entry holds the string "1", so that
  // strictness buys nothing, and it cost a user their wallet (issue #1266).
  //
  // Do not "simplify" this to `USER_PRESENCE` even though iOS treats the two
  // as equal. `KeychainModule.kt` excludes that constant from both
  // `getUsePasscode` and `getUseBiometry`, which drops Android back to a
  // biometric-only prompt and reopens the passcode-only failure below.
  const iosPart =
    Platform.OS === 'ios'
      ? {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          accessControl:
            Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        }
      : {};
  // Android: `storage: AES_GCM` makes the underlying KeyStore key auth-
  // required (`setUserAuthenticationRequired(true)`), and `accessControl:
  // BIOMETRY_ANY_OR_DEVICE_PASSCODE` makes the lib's BiometricPrompt
  // builder include `DEVICE_CREDENTIAL` in `setAllowedAuthenticators(...)`.
  // Both pieces are necessary: without the storage the read is silent (no
  // prompt at all), and without the accessControl the prompt rejects
  // passcode-only devices.
  const androidPart =
    Platform.OS === 'android'
      ? {
          storage: Keychain.STORAGE_TYPE.AES_GCM,
          accessControl:
            Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        }
      : {};
  return {
    ...base,
    ...iosPart,
    ...androidPart,
    ...(authPrompt ? { authenticationPrompt: authPrompt } : {}),
  };
}

/**
 * Build options for `Keychain.getGenericPassword` / `hasGenericPassword` /
 * `resetGenericPassword`. Service and prompt come from the same source as
 * the set call so reads find what writes stored.
 */
export function buildGetOptions(
  service: string,
  profile: KeychainProfile,
  authPrompt?: Keychain.AuthenticationPrompt,
): Keychain.GetOptions {
  const base = { service };

  if (profile === 'SILENT_SECURE') {
    return base;
  }

  // INTERACTIVE_AUTH: include accessControl so the get-time prompt (Android
  // surfaces it on the access-controlled read) is built with the same
  // allowed authenticators as the set-time prompt. Without this the get
  // would re-fail with HW_UNAVAILABLE on passcode-only devices.
  const androidPart =
    Platform.OS === 'android'
      ? {
          accessControl:
            Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        }
      : {};
  return {
    ...base,
    ...androidPart,
    ...(authPrompt ? { authenticationPrompt: authPrompt } : {}),
  };
}

/**
 * Build base options for `hasGenericPassword` / `resetGenericPassword` on
 * the SILENT_SECURE profile (these don't take auth prompts).
 */
export function buildBaseOptions(
  service: string,
  profile: KeychainProfile,
): Keychain.BaseOptions {
  if (profile === 'SILENT_SECURE') {
    const iosPart =
      Platform.OS === 'ios'
        ? { accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
        : {};
    const androidPart =
      Platform.OS === 'android'
        ? {
            securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
            storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
          }
        : {};
    return { service, ...iosPart, ...androidPart };
  }
  // INTERACTIVE_AUTH base options are rarely needed (use buildGetOptions
  // for reads instead) but we mirror the set-time accessControl for
  // consistency.
  return buildGetOptions(service, profile);
}
