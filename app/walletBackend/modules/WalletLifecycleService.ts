/**
 * Handles the wallet change: deletes the wallet file so another one can
 * take its place.
 *
 * Calls syncCoordinator.pauseSyncProcess() first to ensure no sync task is
 * running while the wallet file is being replaced. Returns DONE on success
 * or an ErrorKeyed failure the display edge translates (zingo-adrs
 * zingo-mobile/0009).
 */
import { GlobalConst, Done, DONE, ErrorKeyed, errorKeyed } from '@app/AppState';
import RPCModule from '@app/RPCModule';
import { SyncCoordinator } from './SyncCoordinator';

export type WalletLifecycleErrorKey =
  | 'rpc.deletewallet-error'
  | 'rpc.walletnotfound-error';

export type WalletLifecycleResult = Done | ErrorKeyed<WalletLifecycleErrorKey>;

const err = (
  errorKey: WalletLifecycleErrorKey,
): ErrorKeyed<WalletLifecycleErrorKey> => errorKeyed(errorKey);

export class WalletLifecycleService {
  syncCoordinator: SyncCoordinator;

  constructor(syncCoordinator: SyncCoordinator) {
    this.syncCoordinator = syncCoordinator;
  }

  async changeWallet(): Promise<WalletLifecycleResult> {
    const exists = await RPCModule.walletExists();

    if (!(exists && exists !== GlobalConst.false)) {
      return err('rpc.walletnotfound-error');
    }
    await this.syncCoordinator.pauseSyncProcess();
    const result = await RPCModule.deleteExistingWallet();

    if (!(result && result !== GlobalConst.false)) {
      return err('rpc.deletewallet-error');
    }
    return DONE;
  }
}
