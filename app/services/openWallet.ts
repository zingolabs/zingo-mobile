import { ChainNameEnum } from '@app/AppState';
import {
  fetchWallet,
  readWalletKind,
  recordActiveOpened,
  recordWalletKind,
} from '@app/walletBackend';
import { FfiError, FfiResult } from '@app/walletBackend/ffi';
import { RPCSeedType } from '@app/walletBackend/types/RPCSeedType';
import { RPCUfvkType } from '@app/walletBackend/types/RPCUfvkType';
import { createUpdateRecoveryWalletInfo } from './recoveryWalletInfo';

export type WalletOpen =
  | {
      kind: 'opened';
      readOnly: boolean;
      orchardPool: boolean;
      saplingPool: boolean;
      transparentPool: boolean;
      walletChainName: ChainNameEnum;
    }
  | { kind: 'failed'; error: FfiError };

const failed = (error: FfiError): WalletOpen => ({ kind: 'failed', error });

/**
 * What follows a native load, on boot and on a switch alike: the wallet's
 * kind, its recovery entry and its meta, or why it did not open. A view-only
 * load may carry an `error` field that is no failure; only the native
 * result's own error counts.
 */
export async function finishWalletOpen(
  result: FfiResult<string>,
  fallbackChain: ChainNameEnum,
): Promise<WalletOpen> {
  if (!result.ok) {
    return failed(result.error);
  }
  if (!result.value) {
    return failed({ code: 'Unknown', message: '' });
  }
  let loaded: RPCSeedType & RPCUfvkType;
  try {
    loaded = JSON.parse(result.value);
  } catch (e) {
    return failed({
      code: 'Unknown',
      message: e instanceof Error ? e.message : String(e),
    });
  }
  if (loaded.error) {
    return failed({ code: 'Unknown', message: String(loaded.error) });
  }
  const kind = await readWalletKind();
  if (!kind.ok) {
    return failed(kind.error);
  }
  const { readOnly, orchardPool, saplingPool, transparentPool } = kind.value;
  await recordWalletKind(readOnly ? 'ufvk' : 'seed');
  await recordActiveOpened();
  // The wallet's recovery info in the Keychain/Keystore; if it can't be
  // read, whatever the entry holds is removed.
  await createUpdateRecoveryWalletInfo(await fetchWallet(readOnly));
  return {
    kind: 'opened',
    readOnly,
    orchardPool,
    saplingPool,
    transparentPool,
    // The wallet's own chain, surfaced by the native result (reliable even
    // Offline). The server's chain is only a pre-rebuild fallback.
    walletChainName: (loaded.chain_name as ChainNameEnum) || fallbackChain,
  };
}
