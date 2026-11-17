import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SwapStore,
  SWAP_RECORDS_KEY_PREFIX,
  readCurrentWalletFingerprint,
} from '@app/swap';
import {
  updateWalletMeta,
  walletsOnDevice,
} from '@app/walletBackend/utils/walletStore';
import { RECEIVE_PIN_KEY_PREFIX } from './ReceivePinImpl';
import AddressBookFileImpl from './AddressBookFileImpl';
import { IRONWOOD_HIDDEN_KEY_PREFIX } from './IronwoodNoticeImpl';

/**
 * What the app keeps beside each wallet file, keyed by the wallet's
 * fingerprint: its swap records, its pinned Receive address and whether it
 * hid the Ironwood notice. The address book is shared by every wallet, and
 * only the tags of the addresses its swaps made go with it. They must leave
 * with the last wallet of that fingerprint, or they outlive a wallet the
 * user removed.
 *
 * Each wallet's meta records its fingerprint the first time it opens. The
 * pointer names the wallet open last: what the delete falls back on when no
 * wallet is open to read the fingerprint from (onboarding).
 */
const POINTER_KEY = 'wallet:fingerprint';

const WALLET_SCOPED_PREFIXES = [
  SWAP_RECORDS_KEY_PREFIX,
  RECEIVE_PIN_KEY_PREFIX,
  IRONWOOD_HIDDEN_KEY_PREFIX,
];

async function forget(fingerprint: string): Promise<void> {
  await AddressBookFileImpl.removeAddresses(
    await SwapStore.madeAddressesFor(fingerprint),
  );
  await SwapStore.clearForWallet(fingerprint);
  await AsyncStorage.removeItem(RECEIVE_PIN_KEY_PREFIX + fingerprint);
  await AsyncStorage.removeItem(IRONWOOD_HIDDEN_KEY_PREFIX + fingerprint);
}

/** Whether a wallet other than `walletId` carries the fingerprint, unknown counting as yes. */
async function keptByAnother(
  fingerprint: string,
  walletId: string,
): Promise<boolean> {
  const result = await walletsOnDevice();
  return (
    !result.ok ||
    result.value.wallets.some(
      w => w.id !== walletId && w.meta.fingerprint === fingerprint,
    )
  );
}

async function activeWalletId(): Promise<string> {
  const result = await walletsOnDevice();
  return result.ok && result.value.active.kind === 'wallet'
    ? result.value.active.id
    : '';
}

/**
 * Before the active wallet's file is deleted or replaced. Throws when the
 * data could not be cleared, so the caller keeps the file too.
 */
export async function forgetWalletOnFile(): Promise<void> {
  const fingerprint =
    (await readCurrentWalletFingerprint().catch(() => '')) ||
    (await AsyncStorage.getItem(POINTER_KEY)) ||
    '';
  if (
    fingerprint &&
    !(await keptByAnother(fingerprint, await activeWalletId()))
  ) {
    await forget(fingerprint);
  }
  await AsyncStorage.removeItem(POINTER_KEY);
}

/**
 * Before the wallet `walletId` is deleted. Throws when the data could not be
 * cleared, so the caller keeps the wallet too.
 */
export async function forgetWallet(walletId: string): Promise<void> {
  const result = await walletsOnDevice();
  const fingerprint = result.ok
    ? (result.value.wallets.find(w => w.id === walletId)?.meta.fingerprint ??
      '')
    : '';
  if (fingerprint && !(await keptByAnother(fingerprint, walletId))) {
    await forget(fingerprint);
  }
  if (
    fingerprint &&
    (await AsyncStorage.getItem(POINTER_KEY)) === fingerprint
  ) {
    await AsyncStorage.removeItem(POINTER_KEY);
  }
}

/**
 * Before another wallet takes the active one's place: the wallet stays on
 * the device, so its data stays, but it is no longer the one open.
 */
export async function releaseWalletOnFile(): Promise<void> {
  await AsyncStorage.removeItem(POINTER_KEY);
}

/**
 * Records the fingerprint in the active wallet's meta and answers every
 * fingerprint on the device, or none when one of them is still unknown.
 */
async function fingerprintsOnDevice(
  fingerprint: string,
): Promise<{ kind: 'known'; fingerprints: Set<string> } | { kind: 'unknown' }> {
  const result = await walletsOnDevice();
  if (!result.ok || result.value.active.kind === 'none') {
    return { kind: 'unknown' };
  }
  const activeId = result.value.active.id;
  const active = result.value.wallets.find(w => w.id === activeId);
  if (active && active.meta.fingerprint !== fingerprint) {
    const written = await updateWalletMeta(activeId, { fingerprint });
    if (!written.ok) {
      console.log(`adoptWalletOnFile: ${written.error.message}`);
    }
  }
  const fingerprints = result.value.wallets.map(w =>
    w.id === activeId ? fingerprint : (w.meta.fingerprint ?? ''),
  );
  return fingerprints.every(Boolean)
    ? { kind: 'known', fingerprints: new Set(fingerprints) }
    : { kind: 'unknown' };
}

/**
 * When a wallet opens, before its records are read. Once every wallet on the
 * device has recorded its fingerprint, data no wallet owns is left over from
 * a path that deleted a file without it (older builds included) and goes.
 */
export async function adoptWalletOnFile(fingerprint: string): Promise<void> {
  const onDevice = await fingerprintsOnDevice(fingerprint);
  if (onDevice.kind === 'known') {
    const orphans = new Set<string>();
    for (const key of await AsyncStorage.getAllKeys()) {
      const prefix = WALLET_SCOPED_PREFIXES.find(p => key.startsWith(p));
      const owner = prefix ? key.slice(prefix.length) : '';
      if (owner && !onDevice.fingerprints.has(owner)) {
        orphans.add(owner);
      }
    }
    for (const owner of orphans) {
      await forget(owner);
    }
  }
  await AsyncStorage.setItem(POINTER_KEY, fingerprint);
}
