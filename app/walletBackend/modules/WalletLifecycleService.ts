import RPCModule from '../../RPCModule';
import { GlobalConst } from '../../AppState';
import { WalletBackendConfig } from '../config/WalletBackendConfig';
import { RPCPerformanceLevelEnum } from '../types/rpcSyncTypes';

export class WalletLifecycleService {
  getWalletSaveRequiredLock = false;

  constructor(private cfg: WalletBackendConfig) {}

  async pauseSyncProcess(): Promise<void> {
    try {
      let returnPause: string = await RPCModule.pauseSyncProcess();
      if (
        returnPause &&
        returnPause.toLowerCase().startsWith(GlobalConst.error)
      ) {
        console.log('SYNC PAUSE ERROR', returnPause);
        this.cfg.setLastError(`Error sync pause: ${returnPause}`);
      } else {
        console.log('pause sync process. PAUSED', returnPause);
      }
    } catch (error) {
      console.log(`Critical Error pause sync ${error}`);
    }
  }

  async getWalletSaveRequired(): Promise<boolean> {
    if (this.getWalletSaveRequiredLock) {
      return false;
    }
    this.getWalletSaveRequiredLock = true;
    try {
      const start = Date.now();
      const info = await RPCModule.getWalletSaveRequiredInfo();
      if (Date.now() - start > 4000) {
        console.log('=========================================== > wallet save required - ', Date.now() - start);
      }
      return info.save_required;
    } catch (error) {
      console.log(`Critical Error wallet save required ${error}`);
      this.cfg.setLastError(`Error wallet save required: ${error}`);
      return false;
    } finally {
      this.getWalletSaveRequiredLock = false;
    }
  }

  async getConfigWalletPerformance(): Promise<RPCPerformanceLevelEnum | undefined> {
    try {
      const start = Date.now();
      const info = await RPCModule.getConfigWalletPerformanceInfo();
      if (Date.now() - start > 4000) {
        console.log('=========================================== > wallet config performance - ', Date.now() - start);
      }
      return info.performance_level as RPCPerformanceLevelEnum;
    } catch (error) {
      console.log(`Critical Error wallet config performance ${error}`);
      this.cfg.setLastError(`Error wallet config performance: ${error}`);
      return;
    }
  }

  async getWalletVersion(): Promise<number | undefined> {
    try {
      const start = Date.now();
      const info = await RPCModule.getWalletVersionInfo();
      if (Date.now() - start > 4000) {
        console.log('=========================================== > wallet version - ', Date.now() - start);
      }
      return info.read_version;
    } catch (error) {
      console.log(`Critical Error wallet version ${error}`);
      this.cfg.setLastError(`Error wallet version: ${error}`);
      return;
    }
  }

  async changeWallet() {
    const exists = await RPCModule.walletExists();
    if (exists && exists !== GlobalConst.false) {
      await this.pauseSyncProcess();
      const backupResult = await RPCModule.doSaveBackup();
      if (!backupResult || backupResult === GlobalConst.false) {
        return this.cfg.translate('rpc.backupwallet-error');
      }
      const result = await RPCModule.deleteExistingWallet();
      if (!(result && result !== GlobalConst.false)) {
        return this.cfg.translate('rpc.deletewallet-error');
      }
    } else {
      return this.cfg.translate('rpc.walletnotfound-error');
    }
    return '';
  }

  async changeWalletNoBackup() {
    const exists = await RPCModule.walletExists();
    if (exists && exists !== GlobalConst.false) {
      await this.pauseSyncProcess();
      const result = await RPCModule.deleteExistingWallet();
      if (!(result && result !== GlobalConst.false)) {
        return this.cfg.translate('rpc.deletewallet-error');
      }
    } else {
      return this.cfg.translate('rpc.walletnotfound-error');
    }
    return '';
  }

  async restoreBackup() {
    const existsBackup = await RPCModule.walletBackupExists();
    if (existsBackup && existsBackup !== GlobalConst.false) {
      const existsWallet = await RPCModule.walletExists();
      if (existsWallet && existsWallet !== GlobalConst.false) {
        await this.pauseSyncProcess();
        await RPCModule.restoreExistingWalletBackup();
      } else {
        return this.cfg.translate('rpc.walletnotfound-error');
      }
    } else {
      return this.cfg.translate('rpc.backupnotfound-error');
    }
    return '';
  }
}
