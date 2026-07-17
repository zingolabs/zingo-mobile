/**
 * Handles wallet file operations: delete, restore from backup, change wallet.
 *
 * Every method calls syncCoordinator.pauseSyncProcess() first to ensure no
 * sync task is running while the wallet file is being replaced. All methods
 * return an empty string on success or a translated error string on failure.
 */
import { GlobalConst } from '../../AppState';
import RPCModule from '../../RPCModule';
import { WalletBackendConfig } from '../config/WalletBackendConfig';
import { SyncCoordinator } from './SyncCoordinator';
import { nativeSaveSucceeded } from '../utils/walletUtils';

export class WalletLifecycleService {
  config: WalletBackendConfig;
  syncCoordinator: SyncCoordinator;

  constructor(config: WalletBackendConfig, syncCoordinator: SyncCoordinator) {
    this.config = config;
    this.syncCoordinator = syncCoordinator;
  }

  async changeWallet() {
    const exists = await RPCModule.walletExists();

    if (exists && exists !== GlobalConst.false) {
      await this.syncCoordinator.pauseSyncProcess();

      const backupResult = await RPCModule.doSaveBackup();
      if (!nativeSaveSucceeded(backupResult)) {
        return this.config.translate('rpc.backupwallet-error');
      }

      const result = await RPCModule.deleteExistingWallet();
      if (!(result && result !== GlobalConst.false)) {
        return this.config.translate('rpc.deletewallet-error');
      }
    } else {
      return this.config.translate('rpc.walletnotfound-error');
    }
    return '';
  }

  async changeWalletNoBackup() {
    const exists = await RPCModule.walletExists();

    if (exists && exists !== GlobalConst.false) {
      await this.syncCoordinator.pauseSyncProcess();
      const result = await RPCModule.deleteExistingWallet();

      if (!(result && result !== GlobalConst.false)) {
        return this.config.translate('rpc.deletewallet-error');
      }
    } else {
      return this.config.translate('rpc.walletnotfound-error');
    }
    return '';
  }

  async restoreBackup() {
    const existsBackup = await RPCModule.walletBackupExists();

    if (existsBackup && existsBackup !== GlobalConst.false) {
      const existsWallet = await RPCModule.walletExists();

      if (existsWallet && existsWallet !== GlobalConst.false) {
        await this.syncCoordinator.pauseSyncProcess();
        await RPCModule.restoreExistingWalletBackup();
      } else {
        return this.config.translate('rpc.walletnotfound-error');
      }
    } else {
      return this.config.translate('rpc.backupnotfound-error');
    }
    return '';
  }
}
