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

// Whether two records describe the same wallet. The birthday counts: restoring
// the same seed from an earlier one is how a wallet that missed its funds gets
// repaired, and the stored birthday is what "Recover last Keys used" hands
// back. Zero and absent are the same birthday, since the two producers of the
// entry disagree on the shape — `createNewWallet` writes `birthday || 0` while
// `fetchWallet` leaves the field out when it is falsy.
const holdsTheSameWallet = (stored: WalletType, wallet: WalletType): boolean =>
  stored.seed === wallet.seed &&
  stored.ufvk === wallet.ufvk &&
  (stored.birthday || 0) === (wallet.birthday || 0);

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

export const saveRecoveryWalletInfo = async (
  keys: WalletType,
): Promise<void> => {
  if (!keys.seed && !keys.ufvk) {
    // Nothing to store, and nothing to conclude from it. `fetchWallet` answers
    // with an empty object when the RPC resolves with an error body, so a
    // wallet with no keys and a wallet that failed to answer look the same
    // here, and neither is a reason to touch what is stored. The entry is only
    // ever replaced, never deleted: a wallet with keys of its own overwrites
    // it, and the screens refuse to show one that is not theirs.
    console.log('no seed or ufvk to store');
    return;
  }
  const password = JSON.stringify(keys);
  try {
    await setOrThrow(password, setOptions);
  } catch (error) {
    // An existing entry from a previous app version may use an
    // incompatible cipher (e.g. the old auth-required AES_GCM or RSA).
    // Deleting never requires auth, so reset and retry with the
    // current spec.
    console.log('Error saving keys, resetting and retrying:', error);
    try {
      await Keychain.resetGenericPassword({ service });
      await setOrThrow(password, baseOptions);
    } catch (retryError) {
      console.log('Error saving keys after reset:', retryError);
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
    return { answered: false, keys: {} as WalletType };
  }
};

export const getRecoveryWalletInfo = async (): Promise<WalletType> => {
  return (await readRecoveryWalletInfo()).keys;
};

export const hasRecoveryWalletInfo = async (): Promise<boolean> => {
  try {
    const has = await Keychain.hasGenericPassword(baseOptions);
    return has;
  } catch (error) {
    console.log('Error asking the device for the recovery keys:', error);
    return false;
  }
};

// Whether the device is failing to keep this wallet's recovery info, asked of
// the device and the wallet rather than of a memory of what happened to them.
//
// This used to be inferred from two module booleans remembering how the last
// save and the last read went, and every bug in this feature came out of that
// shape: the flags outlive the wallet they describe — switching wallets does
// not reload the JS context — so one wallet's failed save warned about the
// next wallet's perfectly good entry, and a keyless wallet inherited a
// complaint about a keychain that was exactly as empty as it should be. The
// answer is a comparison, and a comparison can just be made when it is asked
// for.
//
// `wallet` is what the open wallet says its keys are, or null when it has
// none of its own to store.
export const recoveryWalletInfoIsFailing = async (
  wallet: WalletType | null,
): Promise<boolean> => {
  const stored = await readRecoveryWalletInfo();
  if (!stored.answered) {
    // A device that will not talk about the entry is a failure whatever the
    // wallet holds: nothing can be concluded, and silence is not a backup.
    return true;
  }
  if (!wallet?.seed && !wallet?.ufvk) {
    // Nothing of this wallet's belongs in there, so an empty keychain — or
    // somebody else's entry, which no screen will show — is the right answer.
    return false;
  }
  return !holdsTheSameWallet(stored.keys, wallet);
};

// The write every caller wants: it looks before it leaps.
//
// An entry that already holds this wallet's keys and birthday is left alone,
// which is what most calls find — the boot paths used to write blind on every
// open, and since a refused write resets the entry before retrying, a
// transient refusal was enough to destroy a good backup the App was not even
// replacing.
//
// The birthday counts as part of what is stored: restoring the same seed from
// an earlier birthday is how a wallet that missed its funds gets repaired, and
// the stored birthday is handed back to the user by "Recover last Keys used".
// An entry left on the later birthday would send them back to a wallet blind
// to its own history.
//
// Looking first is also what makes the reset before the retry safe again: the
// write is only reached when the entry is not this wallet's, or when the
// device would not say what it is, so a reset always replaces something the
// App means to replace. Gating that reset on the read having succeeded was
// worse than useless — an entry left by an older app version with an
// auth-required cipher is exactly the one a silent read cannot return, so the
// one case the reset exists for was the one case it was skipped in, and the
// legacy entry was never migrated.
export const createUpdateRecoveryWalletInfo = async (
  keys: WalletType,
): Promise<void> => {
  const stored = await readRecoveryWalletInfo();
  if (holdsTheSameWallet(stored.keys, keys)) {
    console.log('the device already holds these keys, nothing to write');
    return;
  }
  await saveRecoveryWalletInfo(keys);
};
