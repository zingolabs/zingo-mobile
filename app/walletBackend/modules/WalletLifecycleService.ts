/**
 * Handles wallet file operations: delete, restore from backup, change wallet.
 *
 * Every method calls syncCoordinator.pauseSyncProcess() first to ensure no
 * sync task is running while the wallet file is being replaced. All methods
 * return an empty string on success or a translated error string on failure.
 */
import { GlobalConst } from '../../AppState';
import RPCModule from '../../RPCModule';
import { SwapStore, deriveWalletFingerprint } from '../../swap';
import { WalletBackendConfig } from '../config/WalletBackendConfig';
import { SyncCoordinator } from './SyncCoordinator';
import { doSaveBackup } from '../utils/walletUtils';

/**
 * Fetch the UFVK of the wallet that is about to be deleted and return its
 * derived fingerprint, so the destructive lifecycle paths can wipe the
 * matching `SwapStore` bucket *before* the wallet file disappears. Returns
 * an empty string if the UFVK cannot be read — in that case we silently
 * skip the clear (better than guessing a fingerprint and risking wiping
 * another wallet's bucket).
 */
async function fingerprintOfCurrentWallet(): Promise<string> {
  try {
    const raw = await RPCModule.getUfvkInfo();
    if (raw.startsWith('error')) return '';
    const parsed = JSON.parse(raw) as { ufvk?: string };
    return deriveWalletFingerprint(parsed.ufvk ?? '');
  } catch {
    return '';
  }
}

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

      // doSaveBackup classifies the trimodal native resolution and contains
      // rejections, so failure — including a rejected bridge promise — always
      // lands on this branch instead of escaping changeWallet.
      if (!(await doSaveBackup())) {
        return this.config.translate('rpc.backupwallet-error');
      }

      // Mirror `RPCModule.doSaveBackup` for the wallet file: snapshot the
      // current wallet's swap-record bucket into the single-slot backup
      // key. If the user later restores this same wallet (via the
      // wallet-file backup OR by entering the same seed again), the bind
      // step will detect the marker and restore the records into the live
      // bucket. Failure here is non-fatal — worst case the records are
      // lost on the next bind, matching the legacy behaviour, and the
      // wallet change itself proceeds.
      await SwapStore.backupCurrentToSlot();

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
      // Wipe the leaving wallet's swap-record bucket *before* the wallet
      // file is gone. This is the no-backup path so the records are not
      // recoverable by design — privacy fix for the case where the user
      // hands the device to someone else and they restore a different
      // seed (would otherwise see the old wallet's swap history).
      const fp = await fingerprintOfCurrentWallet();
      if (fp) {
        await SwapStore.clearForWallet(fp);
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
