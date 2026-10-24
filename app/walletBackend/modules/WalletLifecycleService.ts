/**
 * Handles wallet file operations: change wallet, restore from backup.
 *
 * Every method calls syncCoordinator.pauseSyncProcess() first to ensure no
 * sync task is running while the wallet file is being replaced. All methods
 * return DONE on success or an ErrorKeyed failure the display edge
 * translates (zingo-adrs zingo-mobile/0009).
 */
import { GlobalConst, Done, DONE, ErrorKeyed, errorKeyed } from '@app/AppState';
import RPCModule from '@app/RPCModule';
import { SwapStore, readCurrentWalletFingerprint } from '@app/swap';
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
    // The swap records go before the wallet file: whoever restores another
    // seed on this device must not find the previous wallet's swaps. An
    // unreadable fingerprint skips the wipe, since a guessed one could name
    // another wallet's bucket.
    const fingerprint = await readCurrentWalletFingerprint();
    if (fingerprint) {
      await SwapStore.clearForWallet(fingerprint);
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
    await this.syncCoordinator.pauseSyncProcess();
    // Android answers a boolean, iOS "true"/"false"; a throw (a bridge
    // without the method) is a failure too.
    let result: string | boolean;
    try {
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
