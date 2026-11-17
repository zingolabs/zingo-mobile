import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SwapStore,
  SWAP_RECORDS_KEY_PREFIX,
  readCurrentWalletFingerprint,
} from '@app/swap';
import {
  updateWalletMeta,
  walletsOnDevice,
  WalletEntry,
} from '@app/walletBackend/utils/walletStore';
import { RECEIVE_PIN_KEY_PREFIX } from './ReceivePinImpl';
import { forgetRecoveryEntry } from './recoveryWalletInfo';
import AddressBookFileImpl from './AddressBookFileImpl';
import { IRONWOOD_HIDDEN_KEY_PREFIX } from './IronwoodNoticeImpl';
import { SAVED_BALANCE_KEY_PREFIX } from './savedBalance';

/**
 * What the app keeps beside each wallet, keyed by the wallet's id: its swap
 * records, its pinned Receive address, whether it hid the Ironwood notice
 * and the balance it showed last. The address book is shared by every wallet, and only the tags of
 * the addresses its swaps made go with it. They leave with the wallet, or
 * they outlive a wallet the user removed. Its Keychain entry goes too,
 * unless it is the last wallet: a later restore reads that one.
 *
 * Single-wallet builds keyed them by the wallet's fingerprint. A wallet
 * migrated from that layout takes the data of its fingerprint on its first
 * open, once; no other wallet ever reads a fingerprint key.
 */
const WALLET_SCOPED_PREFIXES = [
  SWAP_RECORDS_KEY_PREFIX,
  RECEIVE_PIN_KEY_PREFIX,
  IRONWOOD_HIDDEN_KEY_PREFIX,
  SAVED_BALANCE_KEY_PREFIX,
];

/** The pointer single-wallet builds kept to the fingerprint on file. */
const LEGACY_POINTER_KEY = 'wallet:fingerprint';

const WALLET_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function forget(owner: string): Promise<void> {
  await AddressBookFileImpl.removeAddresses(
    await SwapStore.madeAddressesFor(owner),
  );
  await SwapStore.clearForWallet(owner);
  await AsyncStorage.removeItem(RECEIVE_PIN_KEY_PREFIX + owner);
  await AsyncStorage.removeItem(IRONWOOD_HIDDEN_KEY_PREFIX + owner);
  await AsyncStorage.removeItem(SAVED_BALANCE_KEY_PREFIX + owner);
}

/**
 * Before the wallet `walletId` is deleted or replaced. Throws when the data
 * could not be cleared, so the caller keeps the wallet too.
 */
export async function forgetWallet(walletId: string): Promise<void> {
  if (walletId) {
    await forget(walletId);
    await forgetRecoveryEntry(walletId);
  }
}

/** Before the active wallet is deleted or replaced, as forgetWallet. */
export async function forgetWalletOnFile(): Promise<void> {
  const result = await walletsOnDevice();
  if (result.ok && result.value.active.kind === 'wallet') {
    await forgetWallet(result.value.active.id);
  }
}

/** Moves each fingerprint key to the wallet's id, unless the id already has one. */
async function moveFingerprintData(
  fingerprint: string,
  walletId: string,
): Promise<void> {
  for (const prefix of WALLET_SCOPED_PREFIXES) {
    const value = await AsyncStorage.getItem(prefix + fingerprint);
    if (value === null) {
      continue;
    }
    if ((await AsyncStorage.getItem(prefix + walletId)) === null) {
      await AsyncStorage.setItem(prefix + walletId, value);
    }
    await AsyncStorage.removeItem(prefix + fingerprint);
  }
}

const awaitsMove = (wallet: WalletEntry) =>
  !!wallet.meta.migratedFrom && !wallet.meta.localDataMoved;

/**
 * When a wallet opens, before its records are read. A wallet migrated from
 * the single-wallet layout takes its fingerprint's data first. Data of an id
 * no wallet on the device has is left over and goes, and fingerprint data
 * goes too once no migrated wallet still waits to take it.
 */
export async function adoptWalletOnFile(walletId: string): Promise<void> {
  const result = await walletsOnDevice();
  if (!result.ok) {
    return;
  }
  const wallets = result.value.wallets;
  const opened = wallets.find(w => w.id === walletId);
  let moved = false;
  if (opened && awaitsMove(opened)) {
    const fingerprint = await readCurrentWalletFingerprint().catch(() => '');
    if (fingerprint) {
      await moveFingerprintData(fingerprint, walletId);
      const written = await updateWalletMeta(walletId, {
        localDataMoved: true,
      });
      moved = written.ok;
      if (!written.ok) {
        console.log(`adoptWalletOnFile: ${written.error.message}`);
      }
    }
  }
  const ids = new Set(wallets.map(w => w.id));
  const fingerprintsPending = wallets.some(
    w => awaitsMove(w) && !(moved && w.id === walletId),
  );
  const orphans = new Set<string>();
  for (const key of await AsyncStorage.getAllKeys()) {
    const prefix = WALLET_SCOPED_PREFIXES.find(p => key.startsWith(p));
    const owner = prefix ? key.slice(prefix.length) : '';
    if (!owner || ids.has(owner)) {
      continue;
    }
    if (WALLET_ID.test(owner) || !fingerprintsPending) {
      orphans.add(owner);
    }
  }
  for (const owner of orphans) {
    await forget(owner);
  }
  if (!fingerprintsPending) {
    await AsyncStorage.removeItem(LEGACY_POINTER_KEY);
  }
}
