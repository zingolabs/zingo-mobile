import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalConst } from '@app/AppState';
import RPCModule from '@app/RPCModule';
import {
  SwapStore,
  SWAP_RECORDS_KEY_PREFIX,
  readCurrentWalletFingerprint,
} from '@app/swap';
import { callFfi } from '@app/walletBackend/ffi';
import { RECEIVE_PIN_KEY_PREFIX } from './ReceivePinImpl';
import { IRONWOOD_HIDDEN_KEY_PREFIX } from './IronwoodNoticeImpl';

/**
 * What the app keeps beside the wallet file, keyed by the wallet's
 * fingerprint: its swap records, its pinned Receive address and whether it
 * hid the Ironwood notice. They must leave with the wallet file on every
 * path that deletes or replaces it, or they outlive a wallet the user
 * removed.
 *
 * The pointer names the wallet on file. It is what the delete falls back on
 * when no wallet is open to read the fingerprint from (onboarding), and what
 * catches a file replaced without a delete (an import over a wallet).
 */
const POINTER_KEY = 'wallet:fingerprint';

const WALLET_SCOPED_PREFIXES = [
  SWAP_RECORDS_KEY_PREFIX,
  RECEIVE_PIN_KEY_PREFIX,
  IRONWOOD_HIDDEN_KEY_PREFIX,
];

async function forget(fingerprint: string): Promise<void> {
  await SwapStore.clearForWallet(fingerprint);
  await AsyncStorage.removeItem(RECEIVE_PIN_KEY_PREFIX + fingerprint);
  await AsyncStorage.removeItem(IRONWOOD_HIDDEN_KEY_PREFIX + fingerprint);
}

/**
 * Before the wallet file is deleted or replaced. Throws when the data could
 * not be cleared, so the caller keeps the file too.
 */
export async function forgetWalletOnFile(): Promise<void> {
  const fingerprint =
    (await readCurrentWalletFingerprint().catch(() => '')) ||
    (await AsyncStorage.getItem(POINTER_KEY)) ||
    '';
  if (fingerprint) {
    await forget(fingerprint);
  }
  await AsyncStorage.removeItem(POINTER_KEY);
}

/**
 * Before the legacy backup swaps places with the wallet: the wallet lives on
 * as the backup, so its data stays, but it is no longer the one on file.
 */
export async function releaseWalletOnFile(): Promise<void> {
  await AsyncStorage.removeItem(POINTER_KEY);
}

async function backupExists(): Promise<boolean> {
  const reply = await callFfi(RPCModule.walletBackupExists());
  // Unknown counts as present: the sweep below must never reach a backup.
  return !reply.ok || (!!reply.value && reply.value !== GlobalConst.false);
}

/**
 * When a wallet opens, before its records are read. The previous wallet on
 * file, if another, was replaced. With no backup on disk this wallet is the
 * only one, so any other wallet's data is left over from a path that
 * deleted the file without it (older builds included) and goes too.
 */
export async function adoptWalletOnFile(fingerprint: string): Promise<void> {
  const previous = await AsyncStorage.getItem(POINTER_KEY);
  if (previous && previous !== fingerprint) {
    await forget(previous);
  }
  if (!(await backupExists())) {
    const orphans = new Set<string>();
    for (const key of await AsyncStorage.getAllKeys()) {
      const prefix = WALLET_SCOPED_PREFIXES.find(p => key.startsWith(p));
      const owner = prefix ? key.slice(prefix.length) : '';
      if (owner && owner !== fingerprint) {
        orphans.add(owner);
      }
    }
    for (const owner of orphans) {
      await forget(owner);
    }
  }
  await AsyncStorage.setItem(POINTER_KEY, fingerprint);
}
