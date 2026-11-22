import * as Keychain from 'react-native-keychain';
import { defaultTo, sortBy } from 'lodash';
import { GlobalConst, WalletType } from '@app/AppState';
import {
  buildBaseOptions,
  buildGetOptions,
  buildSetOptions,
} from '@app/utils/keychainOptions';
import {
  activeWalletEntry,
  walletsOnDevice,
} from '@app/walletBackend/utils/walletStore';

const service = GlobalConst.serviceKeyChain;

// SILENT_SECURE profile — encryption-at-rest only, no prompt. Rationale:
//   - The recovery seed/UFVK is gated in the screens that reveal it
//     (WalletSeed.tsx / ViewingKey.tsx / SeedBackup.tsx ask at Show or
//     Copy when the biometrics switch is on). That is the user-visible
//     authorisation.
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

/**
 * One entry per wallet, under its own service, so a reinstall or a wallet
 * that no longer opens can rebuild every wallet as it was. Single-wallet
 * builds kept one entry under the bare service; the migrated wallet takes
 * its place on its first save.
 */
const WALLET_SERVICE_PREFIX = `${service}:wallet:`;

const serviceFor = (walletId: string) => WALLET_SERVICE_PREFIX + walletId;

const optionsFor = (svc: string) => ({
  base: buildBaseOptions(svc, 'SILENT_SECURE'),
  set: buildSetOptions(svc, 'SILENT_SECURE'),
  get: buildGetOptions(svc, 'SILENT_SECURE'),
});

/** What an entry holds: the keys and what the wallet looked like on the device. */
export type RecoveryEntry = WalletType & {
  walletId: string;
  name: string;
  chain: string;
  category: number;
  order: number;
};

// The raw stored password, or '' when there is none or it can't be read.
const readEntry = async (svc: string): Promise<string> => {
  try {
    const credentials = await Keychain.getGenericPassword(optionsFor(svc).get);
    if (
      credentials &&
      credentials.username === GlobalConst.keyKeyChain &&
      credentials.service === svc
    ) {
      return credentials.password;
    }
    console.log('no recovery keys stored');
  } catch (error) {
    console.log('Error getting recovery keys:', error);
  }
  return '';
};

// The error that kept the entry from being written, or '' when it was.
const writeEntry = async (svc: string, password: string): Promise<string> => {
  const options = optionsFor(svc);
  try {
    await Keychain.setGenericPassword(
      GlobalConst.keyKeyChain,
      password,
      options.set,
    );
    return '';
  } catch (error) {
    // An existing entry from a previous app version may use an
    // incompatible cipher (e.g. the old auth-required AES_GCM or RSA).
    // Deleting never requires auth, so reset and retry with the
    // current spec.
    console.log('Error saving keys, resetting and retrying:', error);
    try {
      await Keychain.resetGenericPassword({ service: svc });
      await Keychain.setGenericPassword(
        GlobalConst.keyKeyChain,
        password,
        options.base,
      );
      return '';
    } catch (retryError) {
      console.log('Error saving keys after reset:', retryError);
      return retryError instanceof Error
        ? retryError.message
        : String(retryError);
    }
  }
};

const removeEntry = async (svc: string): Promise<void> => {
  try {
    const removed = await Keychain.resetGenericPassword({ service: svc });
    console.log(removed ? 'keys removed' : 'error removing keys');
  } catch (error) {
    console.log('Error removing keys:', error);
  }
};

/**
 * Earlier releases dropped a birthday of 0 when saving, so an entry can
 * hold the phrase without one. Throws when the entry is not JSON.
 */
const parseEntry = (walletId: string, password: string): RecoveryEntry => {
  const saved: Partial<RecoveryEntry> = password ? JSON.parse(password) : {};
  return {
    seed: saved.seed,
    ufvk: saved.ufvk,
    birthday: defaultTo(saved.birthday, 0),
    walletId,
    name: defaultTo(saved.name, ''),
    chain: defaultTo(saved.chain, ''),
    category: defaultTo(saved.category, 0),
    order: defaultTo(saved.order, 0),
  };
};

// Why recovery info did not end up on the device, or none when it did.
export type RecoveryInfoSaveResult =
  | { kind: 'saved' }
  | { kind: 'no-keys' }
  | { kind: 'write-failed'; error: string }
  | { kind: 'mismatch' };

/** Drops the single-wallet entry once the migrated wallet holding the same keys has its own. */
const retireLegacyEntry = async (keys: WalletType): Promise<void> => {
  const legacy = await readEntry(service);
  if (!legacy) {
    return;
  }
  try {
    const saved = parseEntry('', legacy);
    if (
      defaultTo(saved.seed, '') === defaultTo(keys.seed, '') &&
      defaultTo(saved.ufvk, '') === defaultTo(keys.ufvk, '')
    ) {
      await removeEntry(service);
    }
  } catch (error) {
    console.log('Error parsing the single-wallet recovery keys:', error);
  }
};

// Only recovery info known to be right stays on the device: it is written
// and read back, and anything else is removed. That covers a wallet that
// couldn't be read (`null`), one without a seed or a UFVK, and a write or
// read that failed, so the entry never holds another wallet's keys. The
// entry is the open wallet's; with none open nothing is written.
export const saveRecoveryWalletInfo = async (
  keys: WalletType | null,
): Promise<RecoveryInfoSaveResult> => {
  const entry = await activeWalletEntry();
  if (entry.kind === 'none') {
    return { kind: 'write-failed', error: 'no wallet is open' };
  }
  const { id, meta } = entry.wallet;
  const svc = serviceFor(id);
  let result: RecoveryInfoSaveResult = { kind: 'no-keys' };
  if (keys && (keys.seed || keys.ufvk)) {
    const password = JSON.stringify({
      seed: keys.seed,
      ufvk: keys.ufvk,
      birthday: keys.birthday,
      chain: defaultTo(meta.chain, ''),
      name: meta.name,
      category: defaultTo(meta.category, 0),
      order: meta.order,
    });
    const error = await writeEntry(svc, password);
    if ((await readEntry(svc)) === password) {
      if (meta.migratedFrom) {
        await retireLegacyEntry(keys);
      }
      return { kind: 'saved' };
    }
    result = error ? { kind: 'write-failed', error } : { kind: 'mismatch' };
  }
  await removeEntry(svc);
  return result;
};

/** The open wallet's entry, empty when it has none: never another wallet's keys. */
export const getRecoveryWalletInfo = async (): Promise<WalletType> => {
  const entry = await activeWalletEntry();
  if (entry.kind === 'none') {
    return {} as WalletType;
  }
  try {
    const password = await readEntry(serviceFor(entry.wallet.id));
    if (password) {
      const { seed, ufvk, birthday } = parseEntry(entry.wallet.id, password);
      return { seed, ufvk, birthday };
    }
  } catch (error) {
    console.log('Error parsing recovery keys:', error);
  }
  return {} as WalletType;
};

/** The entry a wallet on the device saved, by its id. */
export const recoveryEntryFor = async (
  walletId: string,
): Promise<{ kind: 'none' } | { kind: 'entry'; entry: RecoveryEntry }> => {
  try {
    const entry = parseEntry(walletId, await readEntry(serviceFor(walletId)));
    return entry.seed || entry.ufvk
      ? { kind: 'entry', entry }
      : { kind: 'none' };
  } catch (error) {
    console.log('Error parsing recovery keys:', error);
    return { kind: 'none' };
  }
};

/** Whether the open wallet has its entry on the device. */
export const hasRecoveryWalletInfo = async (): Promise<boolean> => {
  const entry = await activeWalletEntry();
  if (entry.kind === 'none') {
    return false;
  }
  try {
    return await Keychain.hasGenericPassword(
      optionsFor(serviceFor(entry.wallet.id)).base,
    );
  } catch (error) {
    console.log('Error checking recovery keys:', error);
    return false;
  }
};

/**
 * Every entry with keys in it that a previous install left: its wallet is no
 * longer on the device, and the single-wallet entry only while no migrated
 * wallet holds it. In the order the wallets were added, the
 * single-wallet entry first, with no id and no name.
 */
export const recoveryEntriesOnDevice = async (): Promise<RecoveryEntry[]> => {
  const onDevice = await walletsOnDevice();
  const wallets = onDevice.ok ? onDevice.value.wallets : [];
  const present = new Set(wallets.map(w => w.id));
  const migrated = wallets.some(w => !!w.meta.migratedFrom);
  let services: string[] = [];
  try {
    services = await Keychain.getAllGenericPasswordServices();
  } catch (error) {
    console.log('Error listing recovery keys:', error);
  }
  const entries: RecoveryEntry[] = [];
  for (const svc of services) {
    const walletId = svc.startsWith(WALLET_SERVICE_PREFIX)
      ? svc.slice(WALLET_SERVICE_PREFIX.length)
      : '';
    if ((!walletId && (svc !== service || migrated)) || present.has(walletId)) {
      continue;
    }
    try {
      const parsed = parseEntry(walletId, await readEntry(svc));
      if (parsed.seed || parsed.ufvk) {
        entries.push(parsed);
      }
    } catch (error) {
      console.log('Error parsing recovery keys:', error);
    }
  }
  return sortBy(entries, e => (e.walletId ? e.order : -1));
};

export const createUpdateRecoveryWalletInfo = async (
  keys: WalletType | null,
): Promise<RecoveryInfoSaveResult> => saveRecoveryWalletInfo(keys);

/**
 * Removes the entry of a wallet about to be deleted, unless it is the last
 * wallet on the device: that entry is what a later restore reads.
 */
export const forgetRecoveryEntry = async (walletId: string): Promise<void> => {
  const result = await walletsOnDevice();
  if (result.ok && result.value.wallets.some(w => w.id !== walletId)) {
    await removeEntry(serviceFor(walletId));
  }
};

/**
 * Drops an entry a previous install left, once its wallet is imported again
 * under a new id and has its own entry: the bare service for the
 * single-wallet entry, the wallet's own otherwise.
 */
export const retireImportedEntry = async (entry: RecoveryEntry) =>
  removeEntry(entry.walletId ? serviceFor(entry.walletId) : service);
