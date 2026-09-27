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

// The raw stored password, or null when there is none or it can't be read.
const readRecoveryWalletInfo = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword(getOptions);
    if (
      credentials &&
      credentials.username === GlobalConst.keyKeyChain &&
      credentials.service === service
    ) {
      return credentials.password;
    }
    console.log('no recovery keys stored');
  } catch (error) {
    console.log('Error getting recovery keys:', error);
  }
  return null;
};

const writeRecoveryWalletInfo = async (password: string): Promise<void> => {
  try {
    await Keychain.setGenericPassword(
      GlobalConst.keyKeyChain,
      password,
      setOptions,
    );
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
    } catch (retryError) {
      console.log('Error saving keys after reset:', retryError);
    }
  }
};

// Only recovery info known to be right stays on the device: it is written
// and read back, and anything else is removed. That covers a wallet that
// couldn't be read (`null`), one without a seed or a UFVK, and a write or
// read that failed, so the entry never holds another wallet's keys.
export const saveRecoveryWalletInfo = async (
  keys: WalletType | null,
): Promise<void> => {
  if (keys && (keys.seed || keys.ufvk)) {
    const password = JSON.stringify(keys);
    await writeRecoveryWalletInfo(password);
    if ((await readRecoveryWalletInfo()) === password) {
      return;
    }
  }
  await removeRecoveryWalletInfo();
};

export const getRecoveryWalletInfo = async (): Promise<WalletType> => {
  const password = await readRecoveryWalletInfo();
  if (password) {
    try {
      return JSON.parse(password) as WalletType;
    } catch (error) {
      console.log('Error parsing recovery keys:', error);
    }
  }
  return {} as WalletType;
};

export const hasRecoveryWalletInfo = async (): Promise<boolean> => {
  try {
    return await Keychain.hasGenericPassword(baseOptions);
  } catch (error) {
    console.log('Error checking recovery keys:', error);
    return false;
  }
};

export const createUpdateRecoveryWalletInfo = async (
  keys: WalletType | null,
): Promise<void> => {
  await saveRecoveryWalletInfo(keys);
};

export const removeRecoveryWalletInfo = async (): Promise<void> => {
  try {
    const removed = await Keychain.resetGenericPassword(baseOptions);
    console.log(removed ? 'keys removed' : 'error removing keys');
  } catch (error) {
    console.log('Error removing keys:', error);
  }
};
