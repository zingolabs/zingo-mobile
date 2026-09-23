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
// the log. Settings reads the outcome through `recoveryWalletInfoIsFailing`.
//
// Saves and reads are remembered apart because they clear differently:
//   - a failed save stays flagged until a later save succeeds. The device
//     answering `hasGenericPassword` proves nothing about it, since the entry
//     being reported may well be the one an older wallet left behind.
//   - a failed read is cleared by the next keychain call that answers, so a
//     transient error does not pin the warning until the App restarts.
let lastSaveFailed: boolean = false;
let lastReadFailed: boolean = false;

// `setGenericPassword` reports a refusal by resolving falsy, it does not
// always throw. Both are the same failure here, so the falsy result is turned
// into the throw the caller's reset+retry is written around.
const setOrThrow = async (
  password: string,
  options: Keychain.SetOptions | Keychain.BaseOptions,
): Promise<void> => {
  const stored = await Keychain.setGenericPassword(
    GlobalConst.keyKeyChain,
    password,
    options as Keychain.SetOptions,
  );
  if (!stored) {
    throw new Error('the device refused to store the recovery info');
  }
};

type SaveOptions = {
  // Whether a refused write may delete the entry before retrying. The boot
  // paths want it: an entry an older app version left behind can carry a
  // cipher this build cannot overwrite, and replacing it is the point. The
  // Seed/ShowUfvk refresh does not: it runs on every visit, so a transient
  // refusal there would destroy a good entry the App is not replacing.
  resetOnFailure?: boolean;
};

export const saveRecoveryWalletInfo = async (
  keys: WalletType,
  { resetOnFailure = true }: SaveOptions = {},
): Promise<void> => {
  if (!keys.seed && !keys.ufvk) {
    // Nothing to store, and nothing to conclude from it. `fetchWallet` answers
    // with an empty object when the RPC resolves with an error body, so a
    // wallet with no keys and a wallet that failed to answer look the same
    // here. Only the wallet-kind branch in LoadingApp tells them apart, and it
    // drops the previous entry itself through `removeRecoveryWalletInfo`.
    console.log('no seed or ufvk to store');
    return;
  }
  const password = JSON.stringify(keys);
  try {
    await setOrThrow(password, setOptions);
    lastSaveFailed = false;
  } catch (error) {
    if (!resetOnFailure) {
      console.log('Error saving keys, entry left intact:', error);
      lastSaveFailed = true;
      return;
    }
    // An existing entry from a previous app version may use an
    // incompatible cipher (e.g. the old auth-required AES_GCM or RSA).
    // Deleting never requires auth, so reset and retry with the
    // current spec.
    console.log('Error saving keys, resetting and retrying:', error);
    try {
      await Keychain.resetGenericPassword({ service });
      await setOrThrow(password, baseOptions);
      lastSaveFailed = false;
    } catch (retryError) {
      console.log('Error saving keys after reset:', retryError);
      lastSaveFailed = true;
    }
  }
};

// A read that also says whether the device answered. Callers deciding whether
// a write may delete what is stored need the two apart: an empty answer is
// evidence that there is nothing worth keeping, while no answer at all is no
// evidence, and only the first one makes a reset safe.
export const readRecoveryWalletInfo = async (): Promise<{
  answered: boolean;
  keys: WalletType;
}> => {
  const nothing = { answered: true, keys: {} as WalletType };
  try {
    const credentials = await Keychain.getGenericPassword(getOptions);
    // The device answered, whatever it answered.
    lastReadFailed = false;
    if (!credentials) {
      console.log('no recovery keys stored');
      return nothing;
    }
    if (
      credentials.username !== GlobalConst.keyKeyChain ||
      credentials.service !== service
    ) {
      console.log('no match the key');
      return nothing;
    }
    try {
      return {
        answered: true,
        keys: JSON.parse(credentials.password) as WalletType,
      };
    } catch (parseError) {
      // The device is fine, its payload is not: an entry nothing can read is
      // an entry there is no reason to protect.
      console.log('Stored recovery keys could not be parsed:', parseError);
      return nothing;
    }
  } catch (error) {
    // Leave the entry intact on any error — saveRecoveryWalletInfo has
    // its own reset+retry for genuine cipher incompatibilities, and a
    // wipe-on-read makes the seed unrecoverable until the next save.
    console.log('Error getting recovery keys (entry left intact):', error);
    lastReadFailed = true;
    return { answered: false, keys: {} as WalletType };
  }
};

export const getRecoveryWalletInfo = async (): Promise<WalletType> => {
  return (await readRecoveryWalletInfo()).keys;
};

export const hasRecoveryWalletInfo = async (): Promise<boolean> => {
  try {
    const has = await Keychain.hasGenericPassword(baseOptions);
    lastReadFailed = false;
    return has;
  } catch (error) {
    console.log('Error asking the device for the recovery keys:', error);
    lastReadFailed = true;
    return false;
  }
};

// Whether the device is currently failing to keep the recovery info: the last
// save errored, the last read errored, or the entry is missing although every
// wallet the App opens, creates or restores writes it. Probing also refreshes
// the read half, so a transient read error stops answering true on its own.
//
// `expectStored` is false for a wallet with no keys of its own to store, the
// one case where an empty keychain is the right answer instead of a failure.
export const recoveryWalletInfoIsFailing = async (
  expectStored: boolean = true,
): Promise<boolean> => {
  const stored = await hasRecoveryWalletInfo();
  return lastSaveFailed || lastReadFailed || (expectStored && !stored);
};

export const createUpdateRecoveryWalletInfo = async (
  keys: WalletType,
): Promise<void> => {
  await saveRecoveryWalletInfo(keys);
};

export const removeRecoveryWalletInfo = async (): Promise<void> => {
  if (!(await hasRecoveryWalletInfo())) {
    console.log('no keys to remove');
    return;
  }
  // A removal that does not go through leaves another wallet's keys on the
  // device, so it is retried once with the bare options, the same shape the
  // save path resets with. It never throws at the caller: the next boot of
  // this wallet asks for the removal again.
  try {
    if (await Keychain.resetGenericPassword(baseOptions)) {
      console.log('keys removed');
      return;
    }
    console.log('the device refused to remove the keys, retrying');
    if (await Keychain.resetGenericPassword({ service })) {
      console.log('keys removed on retry');
      return;
    }
    console.log('error removing keys');
  } catch (error) {
    console.log('Error removing keys:', error);
  }
};
