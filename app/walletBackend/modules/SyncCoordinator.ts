import RPCModule from '../../RPCModule';
import { GlobalConst, TotalBalanceClass } from '../../AppState';
import { WalletBackendConfig } from '../config/WalletBackendConfig';
import { RPCSyncStatusType, RPCSyncPollType } from '../types/rpcSyncTypes';
import { DataService } from './DataService';
import { WalletLifecycleService } from './WalletLifecycleService';

export class SyncCoordinator {
  updateTimerID?: NodeJS.Timeout;
  timers: NodeJS.Timeout[] = [];
  refreshSyncLock = false;
  fetchSyncStatusLock = false;
  fetchSyncPollLock = false;
  walletConfigPerformanceLevel = undefined as
    | import('../types/rpcSyncTypes').RPCPerformanceLevelEnum
    | undefined;

  constructor(
    private cfg: WalletBackendConfig,
    private data: DataService,
    private lifecycle: WalletLifecycleService,
  ) {}

  async configure(): Promise<void> {
    await this.data.fetchTandZandOValueTransfers();
    await this.data.fetchAddresses();
    await this.data.fetchTotalBalance();
    await this.data.fetchInfoAndServerHeight();
    await this.data.fetchZingolibVersion();
    await this.data.fetchTandZandOMessages();
    await this.data.fetchWalletHeight();
    await this.data.fetchWalletBirthdaySeedUfvk();

    if (!this.updateTimerID) {
      this.updateTimerID = setInterval(
        () => this.runTaskPromises(),
        5 * 1000,
      );
      this.timers.push(this.updateTimerID);
    }

    await this.sanitizeTimers();
  }

  async clearTimers(): Promise<void> {
    if (this.updateTimerID) {
      clearInterval(this.updateTimerID);
      this.updateTimerID = undefined;
    }
    while (this.timers.length > 0) {
      clearInterval(this.timers.pop());
    }
  }

  async sanitizeTimers(): Promise<void> {
    const deleted: number[] = [];
    for (var i = 0; i < this.timers.length; i++) {
      if (this.updateTimerID && this.timers[i] === this.updateTimerID) {
        // keep
      } else {
        clearInterval(this.timers[i]);
        deleted.push(i);
      }
    }
    for (var i = 0; i < deleted.length; i++) {
      this.timers.splice(deleted[i], 1);
    }
  }

  async runTaskPromises(): Promise<void> {
    this.sanitizeTimers();

    if (this.walletConfigPerformanceLevel !== this.cfg.performanceLevel) {
      const performance = await this.lifecycle.getConfigWalletPerformance();
      this.walletConfigPerformanceLevel = performance;
      console.log(
        '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ PERFORMANCE LEVEL',
        performance,
      );
      if (performance !== this.cfg.performanceLevel) {
        const setConfigWallet = await RPCModule.setConfigWalletToProdProcess(
          this.cfg.performanceLevel,
          GlobalConst.minConfirmations.toString(),
        );
        console.log(
          '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ SET CONFIG WALLET',
          setConfigWallet,
        );
        if (
          setConfigWallet &&
          setConfigWallet.toLowerCase().startsWith(GlobalConst.error)
        ) {
          this.cfg.setLastError(
            `Set wallet to prod error: ${setConfigWallet}`,
          );
        }
        await RPCModule.doSave();
        const performanceChanged =
          await this.lifecycle.getConfigWalletPerformance();
        this.walletConfigPerformanceLevel = performanceChanged;
        console.log(
          '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ PERFORMANCE LEVEL CHANGED',
          performanceChanged,
        );
      }
    }

    const taskPromises: Promise<void>[] = [];

    if (!(await this.lifecycle.getWalletSaveRequired())) {
      console.log('***************** NOT SAVE REQUIRED: No fetching data');
      taskPromises.push(this.fetchSyncPoll());
    } else {
      if (
        this.lifecycle.getWalletSaveRequiredLock ||
        this.data.fetchWalletHeightLock ||
        this.data.fetchWalletBirthdaySeedUfvkLock ||
        this.data.fetchInfoAndServerHeightLock ||
        this.data.fetchAddressesLock ||
        this.data.fetchTotalBalanceLock ||
        this.data.fetchTandZandOValueTransfersLock ||
        this.data.fetchTandZandOMessagesLock ||
        this.fetchSyncStatusLock ||
        this.fetchSyncPollLock ||
        this.data.fetchZingolibVersionLock ||
        this.refreshSyncLock
      ) {
        console.log('***************** LONG TASKS: No fetching data');
        taskPromises.push(this.fetchSyncPoll());
      } else {
        taskPromises.push(this.fetchSyncPoll());
        taskPromises.push(this.data.fetchWalletHeight());
        taskPromises.push(this.data.fetchWalletBirthdaySeedUfvk());
        taskPromises.push(this.data.fetchInfoAndServerHeight());
        taskPromises.push(this.data.fetchAddresses());
        taskPromises.push(this.data.fetchTotalBalance());
        taskPromises.push(
          (async () => {
            const start = Date.now();
            await RPCModule.doSave();
            if (Date.now() - start > 4000) {
              console.log(
                '=========================================== > save wallet - ',
                Date.now() - start,
              );
            }
          })(),
        );
        taskPromises.push(this.data.fetchTandZandOValueTransfers());
        taskPromises.push(this.data.fetchTandZandOMessages());
      }
    }

    await Promise.allSettled(taskPromises);
  }

  async refreshSync(fullRescan?: boolean): Promise<void> {
    if (this.refreshSyncLock && !fullRescan) {
      return;
    }
    this.refreshSyncLock = true;
    try {
      this.cfg.keepAwake(true);

      if (fullRescan) {
        await this.clearTimers();
        this.cfg.setValueTransfersList([], 0);
        this.cfg.setMessagesList([], 0);
        this.cfg.setTotalBalance({
          totalOrchardBalance: 0,
          totalSaplingBalance: 0,
          totalTransparentBalance: 0,
          confirmedTransparentBalance: 0,
          confirmedOrchardBalance: 0,
          confirmedSaplingBalance: 0,
          totalSpendableBalance: 0,
        } as TotalBalanceClass);
        this.cfg.setSyncingStatus({} as RPCSyncStatusType);

        const start = Date.now();
        const rescanStr: string = await RPCModule.runRescanProcess();
        if (Date.now() - start > 4000) {
          console.log(
            '=========================================== > rescan run command - ',
            Date.now() - start,
          );
        }
        if (rescanStr && rescanStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error rescan: ${rescanStr}`);
          this.cfg.setLastError(`Error rescan: ${rescanStr}`);
        }
        await this.configure();
      } else {
        const start = Date.now();
        const syncStr: string = await RPCModule.runSyncProcess();
        if (Date.now() - start > 4000) {
          console.log(
            '=========================================== > sync run command - ',
            Date.now() - start,
          );
        }
        console.log('sync RUN', syncStr);
        if (syncStr && syncStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error sync: ${syncStr}`);
          this.cfg.setLastError(`Error sync: ${syncStr}`);
        }
      }
    } catch (error) {
      console.log(`Critical Error sync/rescan run ${error}`);
    } finally {
      this.refreshSyncLock = false;
    }
  }

  async fetchSyncStatus(): Promise<void> {
    if (this.fetchSyncStatusLock) {
      return;
    }
    this.fetchSyncStatusLock = true;
    try {
      const start = Date.now();
      const returnStatus: string = await RPCModule.statusSyncInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > sync status command - ',
          Date.now() - start,
        );
      }
      if (
        returnStatus &&
        returnStatus.toLowerCase().startsWith(GlobalConst.error)
      ) {
        console.log('SYNC STATUS ERROR', returnStatus);
        this.cfg.setLastError(`Error sync status: ${returnStatus}`);
        return;
      }
      let ss = {} as RPCSyncStatusType;
      try {
        ss = await JSON.parse(returnStatus);
      } catch (error) {
        console.log('SYNC STATUS ERROR - PARSE JSON', returnStatus, error);
        this.cfg.setLastError(
          `Error sync status parse: ${error} value: ${returnStatus}`,
        );
        return;
      }

      console.log(
        'SYNC STATUS',
        ss.scan_ranges?.length,
        ss.percentage_total_outputs_scanned,
        ss.percentage_total_blocks_scanned,
      );

      ss.percentage_total_outputs_scanned =
        ss.percentage_total_outputs_scanned &&
        ss.percentage_total_outputs_scanned < 0.01
          ? 0.01
          : ss.percentage_total_outputs_scanned &&
              ss.percentage_total_outputs_scanned > 99.99 &&
              ss.percentage_total_outputs_scanned < 100
            ? 99.99
            : Number(ss.percentage_total_outputs_scanned?.toFixed(2));

      ss.percentage_total_blocks_scanned =
        ss.percentage_total_blocks_scanned &&
        ss.percentage_total_blocks_scanned < 0.01
          ? 0.01
          : ss.percentage_total_blocks_scanned &&
              ss.percentage_total_blocks_scanned > 99.99 &&
              ss.percentage_total_blocks_scanned < 100
            ? 99.99
            : Number(ss.percentage_total_blocks_scanned?.toFixed(2));

      const inR: boolean =
        !!ss.scan_ranges &&
        ss.scan_ranges.length > 0 &&
        (ss.percentage_total_outputs_scanned ??
          ss.percentage_total_blocks_scanned ??
          0) < 100;

      if (!inR) {
        this.cfg.keepAwake(false);
      } else {
        this.cfg.keepAwake(true);
      }

      this.cfg.setSyncingStatus(ss as RPCSyncStatusType);
    } catch (error) {
      console.log(`Critical Error sync status ${error}`);
    } finally {
      this.fetchSyncStatusLock = false;
    }
  }

  async fetchSyncPoll(): Promise<void> {
    if (this.fetchSyncPollLock) {
      console.log('***************** SYNC POLL - locked');
      return;
    }
    this.fetchSyncPollLock = true;
    try {
      const start = Date.now();
      const returnPoll: string = await RPCModule.pollSyncInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > sync poll command - ',
          Date.now() - start,
        );
      }
      if (
        returnPoll &&
        returnPoll.toLowerCase().startsWith(GlobalConst.error)
      ) {
        console.log('SYNC POLL ERROR', returnPoll);
        this.cfg.setLastError(`Error sync poll: ${returnPoll}`);
        return;
      }

      if (
        returnPoll.toLowerCase().startsWith('sync task has not been launched')
      ) {
        console.log('SYNC POLL -> RUN SYNC', returnPoll);
        setTimeout(async () => {
          await this.refreshSync();
        }, 0);
        return;
      }

      if (returnPoll.toLowerCase().startsWith('sync task is not complete')) {
        console.log('SYNC POLL -> FETCH STATUS', returnPoll);
        setTimeout(async () => {
          await this.fetchSyncStatus();
        }, 0);
        console.log('SYNC POLL -> RUN SYNC', returnPoll);
        setTimeout(async () => {
          await this.refreshSync();
        }, 0);
        return;
      }

      let sp = {} as RPCSyncPollType;
      try {
        sp = await JSON.parse(returnPoll);
      } catch (error) {
        console.log('SYNC POLL ERROR - PARSE JSON', returnPoll, error);
        this.cfg.setLastError(
          `Error sync poll parse: ${error} value: ${returnPoll}`,
        );
        return;
      }

      sp.sync_complete.percentage_total_outputs_scanned =
        sp.sync_complete.percentage_total_outputs_scanned &&
        sp.sync_complete.percentage_total_outputs_scanned < 0.01
          ? 0.01
          : sp.sync_complete.percentage_total_outputs_scanned &&
              sp.sync_complete.percentage_total_outputs_scanned > 99.99 &&
              sp.sync_complete.percentage_total_outputs_scanned < 100
            ? 99.99
            : Number(
                sp.sync_complete.percentage_total_outputs_scanned?.toFixed(2),
              );

      const inR: boolean =
        (sp.sync_complete.percentage_total_outputs_scanned ?? 0) < 100;
      if (!inR) {
        this.cfg.keepAwake(false);
      } else {
        this.cfg.keepAwake(true);
      }

      console.log('SYNC POLL', sp);
      console.log('SYNC POLL -> FETCH STATUS');
      setTimeout(async () => {
        await this.fetchSyncStatus();
      }, 0);
    } catch (error) {
      console.log(`Critical Error sync poll ${error}`);
    } finally {
      this.fetchSyncPollLock = false;
    }
  }
}
