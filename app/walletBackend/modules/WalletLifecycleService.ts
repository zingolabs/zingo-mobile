/**
 * Handles wallet file operations: change wallet, restore from backup.
 *
 * Every method calls syncCoordinator.stopSyncProcess() first to ensure no
 * sync task is running while the wallet file is being replaced. All methods
 * return DONE on success or an ErrorKeyed failure the display edge
 * translates (zingo-adrs zingo-mobile/0009).
 */
import { GlobalConst, Done, DONE, ErrorKeyed, errorKeyed } from '@app/AppState';
import RPCModule from '@app/RPCModule';
import {
  forgetWalletOnFile,
  releaseWalletOnFile,
} from '@app/services/WalletLocalData';
import { SyncCoordinator } from './SyncCoordinator';

export type WalletLifecycleErrorKey =
  | 'rpc.deletewallet-error'
  | 'rpc.walletnotfound-error'
  | 'rpc.backupnotfound-error'
  | 'rpc.restorebackup-error';

export type WalletLifecycleResult = Done | ErrorKeyed<WalletLifecycleErrorKey>;

const err = (
  errorKey: WalletLifecycleErrorKey,
): ErrorKeyed<WalletLifecycleErrorKey> => errorKeyed(errorKey);

const STOP_WAIT_MS = 5 * 1000;

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
    await this.syncCoordinator.stopSyncProcess(STOP_WAIT_MS);
    // Its swap records and pin go before the file; if they cannot, the
    // file stays too.
    try {
      await forgetWalletOnFile();
    } catch (e) {
      console.log(`changeWallet: forgetting the wallet failed: ${e}`);
      return err('rpc.deletewallet-error');
    }
    const result = await RPCModule.deleteExistingWallet();

    if (!(result && result !== GlobalConst.false)) {
      return err('rpc.deletewallet-error');
    }
    return DONE;
  }

  // Restores the mainnet backup that older builds took on a wallet change.
  // A mainnet wallet swaps places with it. Any other wallet is never backed
  // up (`replace`): the backup takes its place, it is lost, and the backup
  // file goes.
  async restoreBackup(replace: boolean): Promise<WalletLifecycleResult> {
    const existsBackup = await RPCModule.walletBackupExists();

    if (!(existsBackup && existsBackup !== GlobalConst.false)) {
      return err('rpc.backupnotfound-error');
    }
    const existsWallet = await RPCModule.walletExists();

    if (!(existsWallet && existsWallet !== GlobalConst.false)) {
      return err('rpc.walletnotfound-error');
    }
    await this.syncCoordinator.stopSyncProcess(STOP_WAIT_MS);
    // Android answers a boolean, iOS "true"/"false"; a throw (a bridge
    // without the method) is a failure too.
    let result: string | boolean;
    try {
      // The wallet replaced is lost with its data; the one swapped out
      // lives on as the backup and keeps its own.
      if (replace) {
        await forgetWalletOnFile();
      } else {
        await releaseWalletOnFile();
      }
      result = replace
        ? await RPCModule.replaceWalletWithBackup()
        : await RPCModule.restoreExistingWalletBackup();
    } catch (e) {
      console.log(`restoreBackup failed: ${e}`);
      return err('rpc.restorebackup-error');
    }
    if (!(result === true || result === GlobalConst.true)) {
      return err('rpc.restorebackup-error');
    }
    return DONE;
  }
}
