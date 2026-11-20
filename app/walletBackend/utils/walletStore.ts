/**
 * The wallets on the device by id (zingo-mobile multi-wallet): one folder per
 * wallet, its meta.json the record the native store keeps beside the file.
 */
import { ChainNameEnum } from '@app/AppState';
import RPCModule from '@app/RPCModule';
import { callFfi, FfiResult } from '@app/walletBackend/ffi';

export type WalletKind = 'seed' | 'ufvk';

/** A meta's stored server, in the settings.json wire form the background sync reads. */
export type WalletServerWire = { uri: string; chainName?: ChainNameEnum };

export type WalletMeta = {
  v: number;
  id: string;
  order: number;
  createdAt: number;
  name: string;
  chain?: ChainNameEnum;
  kind?: WalletKind;
  category?: number;
  migratedFrom?: string;
  /** A migrated wallet's local data, once moved from its fingerprint keys to its id. */
  localDataMoved?: boolean;
  server?: WalletServerWire;
  selectServer?: string;
  seedBackedUp?: boolean;
  seedBackedUpAt?: number;
  viewOnlyNoticeDismissed?: boolean;
  /** The last attempt to open the wallet failed. */
  openFailed?: boolean;
  /** Imported from what a previous install left in the Keychain. */
  fromPrevious?: boolean;
};

/** The meta fields a patch may set; the store owns the rest. */
export type WalletMetaPatch = Partial<
  Omit<WalletMeta, 'v' | 'id' | 'createdAt' | 'migratedFrom'>
>;

export type WalletEntry = { id: string; hasFile: boolean; meta: WalletMeta };

export type ActiveWallet = { kind: 'none' } | { kind: 'wallet'; id: string };

export type WalletsOnDevice = { active: ActiveWallet; wallets: WalletEntry[] };

export type DiskSpace = { free: number; largest: number };

/** The least free storage a new wallet, a restore or a migration starts with. */
export const MIN_FREE_BYTES = 200 * 1024 * 1024;

type WireWallets = { active: string | null; wallets: WalletEntry[] };

function parsed<T>(
  result: FfiResult<string>,
  decode: (json: unknown) => T,
): FfiResult<T> {
  if (!result.ok) {
    return result;
  }
  try {
    return { ok: true, value: decode(JSON.parse(result.value)) };
  } catch (e) {
    return {
      ok: false,
      error: { code: 'Unknown', message: `unexpected reply: ${e}` },
    };
  }
}

/** The wallets in the order they were added, and the one the app opens. */
export async function walletsOnDevice(): Promise<FfiResult<WalletsOnDevice>> {
  return parsed(await callFfi(RPCModule.walletsInfo()), json => {
    const wire = json as WireWallets;
    const active: ActiveWallet =
      typeof wire.active === 'string'
        ? { kind: 'wallet', id: wire.active }
        : { kind: 'none' };
    return { active, wallets: wire.wallets };
  });
}

/** The active wallet's entry, or none when no wallet is active or the native call failed. */
export async function activeWalletEntry(): Promise<
  { kind: 'none' } | { kind: 'wallet'; wallet: WalletEntry }
> {
  const result = await walletsOnDevice();
  if (!result.ok || result.value.active.kind === 'none') {
    return { kind: 'none' };
  }
  const id = result.value.active.id;
  const wallet = result.value.wallets.find(w => w.id === id);
  return wallet ? { kind: 'wallet', wallet } : { kind: 'none' };
}

/** The id of the wallet the app has open, '' when none is. */
export async function readOpenWalletId(): Promise<string> {
  const result = await walletsOnDevice();
  return result.ok && result.value.active.kind === 'wallet'
    ? result.value.active.id
    : '';
}

/** Sets the patch's fields on the wallet's meta; resolves the meta written. */
export async function updateWalletMeta(
  walletId: string,
  patch: WalletMetaPatch,
): Promise<FfiResult<WalletMeta>> {
  return parsed(
    await callFfi(
      RPCModule.updateWalletMetaProcess(walletId, JSON.stringify(patch)),
    ),
    json => json as WalletMeta,
  );
}

/** Opens the wallet and makes it the active one; the active wallet stays when it fails. */
export async function loadWallet(
  walletId: string,
  serverUri: string,
  chainHint: string,
  performanceLevel: string,
  minConfirmations: string,
): Promise<FfiResult<string>> {
  return callFfi(
    RPCModule.loadWalletProcess(
      walletId,
      serverUri,
      chainHint,
      performanceLevel,
      minConfirmations,
    ),
  );
}

/** The id of the wallet the native client holds, empty when it holds none. */
export async function clientWalletId(): Promise<FfiResult<string>> {
  return callFfi(RPCModule.openWalletId());
}

/** Deletes the wallet's folder, closing it first when it is the open one. */
export async function deleteWallet(
  walletId: string,
): Promise<FfiResult<boolean>> {
  return parsed(
    await callFfi(
      Promise.resolve(RPCModule.deleteWalletProcess(walletId)).then(String),
    ),
    json => json === true,
  );
}

export async function diskSpace(): Promise<FfiResult<DiskSpace>> {
  return parsed(
    await callFfi(RPCModule.diskSpaceInfo()),
    json => json as DiskSpace,
  );
}

/** Whether the storage holds twice the largest wallet, and never less than MIN_FREE_BYTES. */
export function hasRoomForWallet(space: DiskSpace): boolean {
  return space.free >= Math.max(2 * space.largest, MIN_FREE_BYTES);
}

/** Records whether a wallet's last open failed, writing only when that changes. */
export async function recordOpenFailed(
  wallet: WalletEntry,
  failed: boolean,
): Promise<void> {
  if (!!wallet.meta.openFailed === failed) {
    return;
  }
  const written = await updateWalletMeta(wallet.id, { openFailed: failed });
  if (!written.ok) {
    console.log(`recordOpenFailed: ${written.error.message}`);
  }
}

/** Clears the failed-open mark of the wallet that just opened. */
export async function recordActiveOpened(): Promise<void> {
  const entry = await activeWalletEntry();
  if (entry.kind === 'wallet') {
    await recordOpenFailed(entry.wallet, false);
  }
}

/** Records the kind on the active wallet's meta when it has none, as a wallet migrated from the single-wallet layout. */
export async function recordWalletKind(kind: WalletKind): Promise<void> {
  const entry = await activeWalletEntry();
  if (entry.kind === 'wallet' && !entry.wallet.meta.kind) {
    const written = await updateWalletMeta(entry.wallet.id, { kind });
    if (!written.ok) {
      console.log(`recordWalletKind: ${written.error.message}`);
    }
  }
}
