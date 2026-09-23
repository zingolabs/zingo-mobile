import * as Keychain from 'react-native-keychain';
import { GlobalConst, WalletType } from '@app/AppState';
import {
  buildBaseOptions,
  buildGetOptions,
  buildSetOptions,
} from '@app/utils/keychainOptions';

const service = GlobalConst.serviceKeyChain;

// SILENT_SECURE profile — encryption-at-rest only, no prompt. Rationale:
//   - The recovery seed/UFVK is gated at the SCREEN level (Seed.tsx /
//     ShowUfvk.tsx ask the gate controller on mount when the user enables
//     security.seedUfvkScreen). That is the user-visible authorisation.
//   - Stacking a second bio gate at the keychain item caused
//     startup-save failures on Android (the gate auth window expired
//     before the post-wallet-load save ran, so the AES_GCM auth-required
//     cipher init threw and the entry was silently missing). It also
//     produced the iOS double-prompt (one for our gate, one for the
//     keychain read on the protected accessControl).
//   - Audit Issue T only required migrating from RSA to AES-GCM for
//     payload-size reasons. It does not mandate biometric gating on the
//     keychain item — that is a separate, optional layer that we now
//     handle entirely at the screen level.
// The item is still:
//   - iOS: encrypted with a key tied to the device, accessible only
//     while the device is unlocked, never copied to backups (WHEN_-
//     UNLOCKED_THIS_DEVICE_ONLY).
//   - Android: AES-GCM in the hardware-backed Keystore. No biometric
//     binding, but the Keystore is the device's secure enclave.

const baseOptions: Keychain.BaseOptions = buildBaseOptions(
  service,
  'SILENT_SECURE',
);
const setOptions: Keychain.SetOptions = buildSetOptions(
  service,
  'SILENT_SECURE',
);
const getOptions: Keychain.GetOptions = buildGetOptions(
  service,
  'SILENT_SECURE',
);

// The recovery info is no longer optional, so a device that refuses to store
// or return it is a failure the user has to be told about instead of a line in
// the log. The last outcome is remembered here and Settings reads it through
// `recoveryWalletInfoIsFailing`; any later success clears it.
let lastOperationFailed: boolean = false;

export const saveRecoveryWalletInfo = async (
  keys: WalletType,
): Promise<void> => {
  if (!keys.seed && !keys.ufvk) {
    console.log('no seed or ufvk to store');
    return;
  }
  const password = JSON.stringify(keys);
  try {
    await Keychain.setGenericPassword(
      GlobalConst.keyKeyChain,
      password,
      setOptions,
    );
    lastOperationFailed = false;
  } catch (error) {
    // An existing entry from a previous app version may use an
    // incompatible cipher (e.g. the old auth-required AES_GCM or RSA).
    // Deleting never requires auth, so reset and retry with the
    // current spec.
    console.log('Error saving keys, resetting and retrying:', error);
    try {
      await Keychain.resetGenericPassword({ service });
      await Keychain.setGenericPassword(
        GlobalConst.keyKeyChain,
        password,
        baseOptions,
      );
      lastOperationFailed = false;
    } catch (retryError) {
      console.log('Error saving keys after reset:', retryError);
      lastOperationFailed = true;
    }
  }
};

export const getRecoveryWalletInfo = async (): Promise<WalletType> => {
  try {
    const credentials = await Keychain.getGenericPassword(getOptions);
    if (credentials) {
      if (
        credentials.username === GlobalConst.keyKeyChain &&
        credentials.service === service
      ) {
        lastOperationFailed = false;
        return JSON.parse(credentials.password) as WalletType;
      } else {
        console.log('no match the key');
      }
    } else {
      console.log('no recovery keys stored');
    }
  } catch (error) {
    // Leave the entry intact on any error — saveRecoveryWalletInfo has
    // its own reset+retry for genuine cipher incompatibilities, and a
    // wipe-on-read makes the seed unrecoverable until the next save.
    console.log('Error getting recovery keys (entry left intact):', error);
    lastOperationFailed = true;
  }
  return {} as WalletType;
};

export const hasRecoveryWalletInfo = async (): Promise<boolean> => {
  try {
    // A device that answers does not clear a failed save: the entry it is
    // reporting may well be the one an older wallet left behind.
    return await Keychain.hasGenericPassword(baseOptions);
  } catch (error) {
    console.log('Error asking the device for the recovery keys:', error);
    lastOperationFailed = true;
    return false;
  }
};

// Whether the device is currently failing to keep the recovery info: the last
// call to the keychain errored, or the entry is missing although every wallet
// the App opens, creates or restores writes it. Probing also refreshes the
// answer, so the warning it feeds goes away on its own once the device
// behaves again.
export const recoveryWalletInfoIsFailing = async (): Promise<boolean> => {
  const stored = await hasRecoveryWalletInfo();
  return lastOperationFailed || !stored;
};

export const createUpdateRecoveryWalletInfo = async (
  keys: WalletType,
): Promise<void> => {
  await saveRecoveryWalletInfo(keys);
};

export const removeRecoveryWalletInfo = async (): Promise<void> => {
  if (await hasRecoveryWalletInfo()) {
    const removed = await Keychain.resetGenericPassword(baseOptions);
    if (!removed) {
      console.log('error removing keys');
    } else {
      console.log('keys removed');
    }
  } else {
    console.log('no keys to remove');
  }
};
