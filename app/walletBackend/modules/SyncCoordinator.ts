/**
 * Drives the sync lifecycle from the wallet's event stream: `configure`
 * subscribes and launches sync, SyncProgress publishes the status,
 * SyncComplete refreshes the wallet state and writes the file when the
 * wallet asks for it, and SyncFailed reports the failure. One timer
 * relaunches sync after a completion or a failure.
 */
import { SyncMode, SyncStatus, WalletEvent, WalletEvent_Tags } from 'zingo-ffi';
import { TotalBalanceClass, GlobalConst } from '@app/AppState';
import { FfiError, toFfiError } from '@app/walletBackend/ffi';
import { callWallet } from '@app/walletBackend/wallet';
import { subscribeWalletEvents } from '@app/walletBackend/events';
import {
  IDLE_SYNC_STATUS,
  clampPercentage,
  scanInProgress,
} from '@app/walletBackend/utils/syncProgress';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { WalletBackendConfig } from '@app/walletBackend/config/WalletBackendConfig';
import { DataService } from './DataService';
import { doSave, setWalletSettings } from '@app/walletBackend/utils/walletUtils';

// Consecutive failed sync launches before onPersistentSyncFailure fires.
const PERSISTENT_SYNC_FAILURE_THRESHOLD = 3;

/** Pause between a sync ending (complete or failed) and its relaunch. */
export const RESYNC_DELAY_MS = 5_000;

/** Minimum spacing between wallet-state refreshes while a sync runs. */
export const REFRESH_INTERVAL_MS = 5_000;

const ZERO_BALANCE: TotalBalanceClass = {
  totalOrchardBalance: 0,
  totalIronwoodBalance: 0,
  totalSaplingBalance: 0,
  totalTransparentBalance: 0,
  confirmedTransparentBalance: 0,
  confirmedOrchardBalance: 0,
  confirmedIronwoodBalance: 0,
  confirmedSaplingBalance: 0,
  totalSpendableBalance: 0,
};

export class SyncCoordinator {
  config: WalletBackendConfig;
  dataService: DataService;

  unsubscribe: (() => void) | undefined;
  relaunchTimerID: ReturnType<typeof setTimeout> | undefined;

  refreshSyncLock: boolean = false;
  refreshDataLock: boolean = false;
  lastRefreshMs: number = 0;

  syncLaunchFailures: number = 0;

  walletConfigPerformanceLevel: RPCPerformanceLevelEnum | undefined;

  constructor(config: WalletBackendConfig, dataService: DataService) {
    this.config = config;
    this.dataService = dataService;
  }

  async configure(): Promise<void> {
    await this.dataService.fetchTandZandOValueTransfers();
    await this.dataService.fetchAddresses();
    await this.dataService.fetchTotalBalance();
    await this.dataService.fetchInfoAndServerHeight();
    await this.dataService.fetchZingolibVersion();
    await this.dataService.fetchTandZandOMessages();
    await this.dataService.fetchWalletHeight();
    await this.dataService.fetchWalletBirthdaySeedUfvk();
    await this.applyPerformanceLevel();
    this.subscribe();
    await this.refreshSync();
  }

  subscribe(): void {
    if (this.unsubscribe === undefined) {
      this.unsubscribe = subscribeWalletEvents(event => this.onEvent(event));
    }
  }

  onEvent(event: WalletEvent): void {
    switch (event.tag) {
      case WalletEvent_Tags.SyncProgress:
        this.onSyncProgress(event.inner.status);
        return;
      case WalletEvent_Tags.SyncComplete:
        this.onSyncComplete();
        return;
      case WalletEvent_Tags.SyncFailed:
        this.onSyncFailed(toFfiError(event.inner.error));
        return;
      default:
        return;
    }
  }

  onSyncProgress(status: SyncStatus): void {
    const ss: SyncStatus = {
      ...status,
      percentageTotalOutputsScanned: clampPercentage(
        status.percentageTotalOutputsScanned,
      ),
      percentageTotalBlocksScanned: clampPercentage(
        status.percentageTotalBlocksScanned,
      ),
    };
    this.config.keepAwake(scanInProgress(ss));
    this.config.onSyncStatusChanged(ss);
    if (Date.now() - this.lastRefreshMs >= REFRESH_INTERVAL_MS) {
      this.refreshData(false);
    }
  }

  async onSyncComplete(): Promise<void> {
    this.config.keepAwake(false);
    this.syncLaunchFailures = 0;
    await this.refreshData(true);
    this.scheduleRelaunch();
  }

  onSyncFailed(error: FfiError): void {
    this.config.keepAwake(false);
    this.config.onError(`Error sync: ${error.tag}: ${error.detail}`);
    this.countLaunchFailure();
    this.scheduleRelaunch();
  }

  // Re-reads the wallet state and writes the file when the wallet asks for
  // it; `always` refreshes even when nothing needs saving.
  async refreshData(always: boolean): Promise<void> {
    if (
      this.refreshDataLock ||
      this.refreshSyncLock ||
      this.dataService.busy()
    ) {
      return;
    }
    this.refreshDataLock = true;
    this.lastRefreshMs = Date.now();
    try {
      const saveRequired = await this.dataService.getWalletSaveRequired();
      if (!saveRequired && !always) {
        return;
      }
      await Promise.allSettled([
        this.dataService.fetchWalletHeight(),
        this.dataService.fetchWalletBirthdaySeedUfvk(),
        this.dataService.fetchInfoAndServerHeight(),
        this.dataService.fetchAddresses(),
        this.dataService.fetchTotalBalance(),
        saveRequired ? doSave() : Promise.resolve(true),
        this.dataService.fetchTandZandOValueTransfers(),
        this.dataService.fetchTandZandOMessages(),
      ]);
    } finally {
      this.refreshDataLock = false;
    }
  }

  scheduleRelaunch(): void {
    this.clearRelaunch();
    this.relaunchTimerID = setTimeout(() => {
      this.relaunchTimerID = undefined;
      this.refreshSync();
    }, RESYNC_DELAY_MS);
  }

  private clearRelaunch(): void {
    if (this.relaunchTimerID !== undefined) {
      clearTimeout(this.relaunchTimerID);
      this.relaunchTimerID = undefined;
    }
  }

  // Aligns the wallet's stored performance level with the app setting once
  // per level change.
  async applyPerformanceLevel(): Promise<void> {
    if (this.walletConfigPerformanceLevel === this.config.performanceLevel) {
      return;
    }
    const current = await this.dataService.getConfigWalletPerformance();
    if (current !== undefined && current !== this.config.performanceLevel) {
      const applied = await setWalletSettings(
        this.config.performanceLevel,
        GlobalConst.minConfirmations,
      );
      if (!applied.ok) {
        this.config.onError(
          `Set wallet to prod error: ${applied.error.detail}`,
        );
      }
      await doSave();
    }
    this.walletConfigPerformanceLevel =
      await this.dataService.getConfigWalletPerformance();
  }

  async pauseSyncProcess(): Promise<void> {
    const paused = await callWallet(wallet => wallet.pauseSync());
    if (!paused.ok) {
      this.config.onError(`Error sync pause: ${paused.error.detail}`);
    }
  }

  async clearTimers(): Promise<void> {
    this.clearRelaunch();
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  async refreshSync(fullRescan?: boolean): Promise<void> {
    if (this.refreshSyncLock && !fullRescan) {
      return;
    }
    this.refreshSyncLock = true;
    try {
      this.config.keepAwake(true);
      if (fullRescan) {
        await this.clearTimers();
        this.config.onValueTransfersChanged([], 0);
        this.config.onMessagesChanged([], 0);
        this.config.onBalanceChanged({ ...ZERO_BALANCE });
        this.config.onSyncStatusChanged(IDLE_SYNC_STATUS);
        const rescan = await callWallet(wallet => wallet.startRescan());
        if (!rescan.ok) {
          this.reportLaunchFailure(rescan.error, true);
        }
        await this.configure();
        return;
      }
      const mode = await callWallet(wallet => wallet.syncMode());
      if (!mode.ok) {
        this.reportLaunchFailure(mode.error, false);
        return;
      }
      if (mode.value === SyncMode.Running) {
        return;
      }
      const launched = await callWallet(wallet =>
        mode.value === SyncMode.Paused
          ? wallet.resumeSync()
          : wallet.startSync(),
      );
      if (!launched.ok) {
        this.reportLaunchFailure(launched.error, false);
        return;
      }
      this.syncLaunchFailures = 0;
    } finally {
      this.refreshSyncLock = false;
    }
  }

  private reportLaunchFailure(error: FfiError, fullRescan: boolean): void {
    this.config.onError(
      `Error sync/rescan run: ${error.tag}: ${error.detail}`,
    );
    if (!fullRescan) {
      this.countLaunchFailure();
    }
  }

  private countLaunchFailure(): void {
    this.syncLaunchFailures += 1;
    if (this.syncLaunchFailures >= PERSISTENT_SYNC_FAILURE_THRESHOLD) {
      this.syncLaunchFailures = 0;
      this.config.onPersistentSyncFailure?.();
    }
  }
}
