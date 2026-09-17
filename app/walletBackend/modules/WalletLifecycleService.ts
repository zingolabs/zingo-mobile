/**
 * Wallet file operations: delete, restore from backup, change wallet. Each
 * pauses sync first and answers DONE or an ErrorKeyed failure the display
 * edge translates.
 */
import { Done, DONE, ErrorKeyed, errorKeyed } from '@app/AppState';
import RPCModule from '@app/RPCModule';
import { callFfi } from '@app/walletBackend/ffi';
import { SyncCoordinator } from './SyncCoordinator';
import {
  doSaveBackup,
  restoreExistingWalletBackup,
  walletBackupExists,
  walletExists,
} from '@app/walletBackend/utils/walletUtils';

export type WalletLifecycleErrorKey =
  | 'rpc.backupwallet-error'
  | 'rpc.deletewallet-error'
  | 'rpc.walletnotfound-error'
  | 'rpc.backupnotfound-error';

export type WalletLifecycleResult = Done | ErrorKeyed<WalletLifecycleErrorKey>;

const err = (
  errorKey: WalletLifecycleErrorKey,
): ErrorKeyed<WalletLifecycleErrorKey> => errorKeyed(errorKey);

export class WalletLifecycleService {
  syncCoordinator: SyncCoordinator;

  constructor(syncCoordinator: SyncCoordinator) {
    this.syncCoordinator = syncCoordinator;
  }

  private async deleteWallet(): Promise<WalletLifecycleResult> {
    const deleted = await callFfi(RPCModule.deleteExistingWallet());
    return deleted.ok && deleted.value ? DONE : err('rpc.deletewallet-error');
  }

  async changeWallet(): Promise<WalletLifecycleResult> {
    if (!(await walletExists())) {
      return err('rpc.walletnotfound-error');
    }
    await this.syncCoordinator.pauseSyncProcess();
    if (!(await doSaveBackup())) {
      return err('rpc.backupwallet-error');
    }
    return this.deleteWallet();
  }

  async changeWalletNoBackup(): Promise<WalletLifecycleResult> {
    if (!(await walletExists())) {
      return err('rpc.walletnotfound-error');
    }
    await this.syncCoordinator.pauseSyncProcess();
    return this.deleteWallet();
  }

  async restoreBackup(): Promise<WalletLifecycleResult> {
    if (!(await walletBackupExists())) {
      return err('rpc.backupnotfound-error');
    }
    if (!(await walletExists())) {
      return err('rpc.walletnotfound-error');
    }
    await this.syncCoordinator.pauseSyncProcess();
    const restored = await restoreExistingWalletBackup();
    return restored.ok ? DONE : err('rpc.backupnotfound-error');
  }
}
