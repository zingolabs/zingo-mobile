/**
 * Handles wallet file operations: delete, restore from backup, change wallet.
 *
 * Every method calls syncCoordinator.pauseSyncProcess() first to ensure no
 * sync task is running while the wallet file is being replaced. All methods
 * return DONE on success or an ErrorKeyed failure the display edge
 * translates (docs/adr/0002-error-keys-not-prose.md).
 */
import {
  GlobalConst,
  Done,
  DONE,
  ErrorKeyed,
  errorKeyed,
} from '../../AppState';
import RPCModule from '../../RPCModule';
import { SyncCoordinator } from './SyncCoordinator';
import { doSaveBackup } from '../utils/walletUtils';

export type WalletLifecycleErrorKey =
  | 'rpc.backupwallet-error'
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

    // doSaveBackup classifies the trimodal native resolution and contains
    // rejections, so failure — including a rejected bridge promise — always
    // lands on this branch instead of escaping changeWallet.
    if (!(await doSaveBackup())) {
      return err('rpc.backupwallet-error');
    }

    const result = await RPCModule.deleteExistingWallet();
    if (!(result && result !== GlobalConst.false)) {
      return err('rpc.deletewallet-error');
    }
    return DONE;
  }

  async changeWalletNoBackup(): Promise<WalletLifecycleResult> {
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

  async restoreBackup(): Promise<WalletLifecycleResult> {
    const existsBackup = await RPCModule.walletBackupExists();

    if (!(existsBackup && existsBackup !== GlobalConst.false)) {
      return err('rpc.backupnotfound-error');
    }
    const existsWallet = await RPCModule.walletExists();

    if (!(existsWallet && existsWallet !== GlobalConst.false)) {
      return err('rpc.walletnotfound-error');
    }
    await this.syncCoordinator.pauseSyncProcess();
    const restored = await RPCModule.restoreExistingWalletBackup();

    if (!(restored && restored !== GlobalConst.false)) {
      return err('rpc.restorebackup-error');
    }
    return DONE;
  }
}
