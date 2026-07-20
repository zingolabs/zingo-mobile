/**
 * Drives the wallet sync lifecycle.
 *
 * A single 5 s setInterval (updateTimerID) calls runTaskPromises() which:
 *   1. Adjusts performance level if it drifted from config.
 *   2. Calls fetchSyncPoll() to check whether a sync task is running.
 *   3. If save_required, also fetches all wallet state and persists to disk.
 *
 * Lock flags on this class (refreshSyncLock, fetchSyncStatusLock,
 * fetchSyncPollLock) and on DataService are checked before scheduling
 * new work so no operation is enqueued twice.
 *
 * To add a new periodic task, push it into taskPromises inside runTaskPromises.
 */
import { TotalBalanceClass, GlobalConst } from '../../AppState';
import RPCModule from '../../RPCModule';
import { RPCSyncStatusType } from '../types/RPCSyncStatusType';
import { RPCSyncPollType } from '../types/RPCSyncPollType';
import { RPCPerformanceLevelEnum } from '../enums/RPCPerformanceLevelEnum';
import { WalletBackendConfig } from '../config/WalletBackendConfig';
import { DataService } from './DataService';
import { doSave } from '../utils/walletUtils';

export class SyncCoordinator {
  config: WalletBackendConfig;
  dataService: DataService;

  updateTimerID?: NodeJS.Timeout;
  timers: NodeJS.Timeout[] = [];

  refreshSyncLock: boolean = false;
  fetchSyncStatusLock: boolean = false;
  fetchSyncPollLock: boolean = false;

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

    if (!this.updateTimerID) {
      this.updateTimerID = setInterval(() => this.runTaskPromises(), 5 * 1000);
      this.timers.push(this.updateTimerID);
    }

    await this.sanitizeTimers();
  }

  async runTaskPromises(): Promise<void> {
    this.sanitizeTimers();

    if (this.walletConfigPerformanceLevel !== this.config.performanceLevel) {
      const performance = await this.dataService.getConfigWalletPerformance();
      this.walletConfigPerformanceLevel = performance;
      console.log(
        '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ PERFORMANCE LEVEL',
        performance,
      );
      if (performance !== this.config.performanceLevel) {
        const setConfigWallet = await RPCModule.setConfigWalletToProdProcess(
          this.config.performanceLevel,
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
          this.config.onError(`Set wallet to prod error: ${setConfigWallet}`);
        }
        // The seam classifies the trimodal native resolution and contains
        // a rejection as false; this tick has no rejection handler of its
        // own (audit Issue P).
        await doSave();
        const performanceChanged =
          await this.dataService.getConfigWalletPerformance();
        this.walletConfigPerformanceLevel = performanceChanged;
        console.log(
          '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ PERFORMANCE LEVEL CHANGED',
          performanceChanged,
        );
      }
    }

    const taskPromises: Promise<void>[] = [];

    if (!(await this.dataService.getWalletSaveRequired())) {
      console.log('***************** NOT SAVE REQUIRED: No fetching data');
      taskPromises.push(this.fetchSyncPoll());
    } else {
      if (
        this.dataService.getWalletSaveRequiredLock ||
        this.dataService.fetchWalletHeightLock ||
        this.dataService.fetchWalletBirthdaySeedUfvkLock ||
        this.dataService.fetchInfoAndServerHeightLock ||
        this.dataService.fetchAddressesLock ||
        this.dataService.fetchTotalBalanceLock ||
        this.dataService.fetchTandZandOValueTransfersLock ||
        this.dataService.fetchTandZandOMessagesLock ||
        this.fetchSyncStatusLock ||
        this.fetchSyncPollLock ||
        this.dataService.fetchZingolibVersionLock ||
        this.refreshSyncLock
      ) {
        console.log('***************** LONG TASKS: No fetching data');
        taskPromises.push(this.fetchSyncPoll());
      } else {
        taskPromises.push(this.fetchSyncPoll());
        taskPromises.push(this.dataService.fetchWalletHeight());
        taskPromises.push(this.dataService.fetchWalletBirthdaySeedUfvk());
        taskPromises.push(this.dataService.fetchInfoAndServerHeight());
        taskPromises.push(this.dataService.fetchAddresses());
        taskPromises.push(this.dataService.fetchTotalBalance());
        taskPromises.push(
          (async () => {
            const start = Date.now();
            await doSave();
            if (Date.now() - start > 4000) {
              console.log(
                '=========================================== > save wallet - ',
                Date.now() - start,
              );
            }
          })(),
        );
        taskPromises.push(this.dataService.fetchTandZandOValueTransfers());
        taskPromises.push(this.dataService.fetchTandZandOMessages());
      }
    }

    await Promise.allSettled(taskPromises);
  }

  async pauseSyncProcess(): Promise<void> {
    try {
      const returnPause: string = await RPCModule.pauseSyncProcess();
      // pauseSyncProcess rejects on failure (typed FFI errors); the catch
      // owns the error path, so the result is never inspected for a sentinel.
      console.log('pause sync process. PAUSED', returnPause);
    } catch (error) {
      console.log(`Critical Error pause sync ${error}`);
      this.config.onError(`Error sync pause: ${error}`);
    }
  }

  async clearTimers(): Promise<void> {
    if (this.updateTimerID) {
      clearInterval(this.updateTimerID);
      this.updateTimerID = undefined;
    }

    while (this.timers.length > 0) {
      const inter = this.timers.pop();
      clearInterval(inter);
    }
  }

  async sanitizeTimers(): Promise<void> {
    const deleted: number[] = [];
    for (let i = 0; i < this.timers.length; i++) {
      if (this.updateTimerID && this.timers[i] === this.updateTimerID) {
        // keep
      } else {
        clearInterval(this.timers[i]);
        deleted.push(i);
      }
    }
    for (let i = 0; i < deleted.length; i++) {
      this.timers.splice(deleted[i], 1);
    }
  }

  async refreshSync(fullRescan?: boolean) {
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
        this.config.onBalanceChanged({
          totalOrchardBalance: 0,
          totalIronwoodBalance: 0,
          totalSaplingBalance: 0,
          totalTransparentBalance: 0,
          confirmedTransparentBalance: 0,
          confirmedOrchardBalance: 0,
          confirmedIronwoodBalance: 0,
          confirmedSaplingBalance: 0,
          totalSpendableBalance: 0,
        } as TotalBalanceClass);
        this.config.onSyncStatusChanged({} as RPCSyncStatusType);

        const start = Date.now();
        const rescanStr: string = await RPCModule.runRescanProcess();
        if (Date.now() - start > 4000) {
          console.log(
            '=========================================== > rescan run command - ',
            Date.now() - start,
          );
        }
        console.log('rescan RUN', rescanStr);
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
      }
    } catch (error) {
      // runSyncProcess and runRescanProcess reject on failure (typed FFI
      // errors); this catch owns the error path for both.
      console.log(`Critical Error sync/rescan run ${error}`);
      this.config.onError(`Error sync/rescan run: ${error}`);
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
      // statusSyncInfo rejects on failure (typed FFI errors); the catch owns
      // the error path, and the JSON parse below is the structural check.
      let ss = {} as RPCSyncStatusType;
      try {
        ss = await JSON.parse(returnStatus);
      } catch (error) {
        console.log('SYNC STATUS ERROR - PARSE JSON', returnStatus, error);
        this.config.onError(
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

      // avoiding 0.00, minimum 0.01, maximun 100
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

      // Close the poll timer if the sync finished(checked via promise above)
      const inR: boolean =
        !!ss.scan_ranges &&
        ss.scan_ranges.length > 0 &&
        (ss.percentage_total_outputs_scanned ??
          ss.percentage_total_blocks_scanned ??
          0) < 100;
      if (!inR) {
        this.config.keepAwake(false);
      } else {
        this.config.keepAwake(true);
      }

      // store SyncStatus object for a new screen
      this.config.onSyncStatusChanged(ss as RPCSyncStatusType);
    } catch (error) {
      console.log(`Critical Error sync status ${error}`);
      this.config.onError(`Error sync status: ${error}`);
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
      // pollSyncInfo rejects on failure (typed FFI errors); the catch owns
      // the error path. The remaining checks distinguish the data channel's
      // status prose from its JSON payload, not success from failure.
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
        this.config.onError(
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
        this.config.keepAwake(false);
      } else {
        this.config.keepAwake(true);
      }

      console.log('SYNC POLL', sp);

      console.log('SYNC POLL -> FETCH STATUS');
      setTimeout(async () => {
        await this.fetchSyncStatus();
      }, 0);
    } catch (error) {
      console.log(`Critical Error sync poll ${error}`);
      this.config.onError(`Error sync poll: ${error}`);
    } finally {
      this.fetchSyncPollLock = false;
    }
  }
}
