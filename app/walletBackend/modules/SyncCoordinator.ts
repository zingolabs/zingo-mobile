/**
 * Drives the wallet sync lifecycle.
 *
 * A self-rescheduling single-flight loop (updateTimerID) runs runTaskPromises()
 * every 5 s, re-arming only after the prior tick resolves so two ticks can
 * never overlap. Each tick:
 *   1. Adjusts performance level if it drifted from config.
 *   2. Calls fetchSyncPoll() to check whether a sync task is running.
 *   3. If save_required, also fetches all wallet state and persists to disk.
 *
 * Lock flags on this class (refreshSyncLock, fetchSyncStatusLock,
 * fetchSyncPollLock) and on DataService are checked before scheduling
 * new work so no operation is enqueued twice.
 *
 * The controller epoch bumps on every invalidating boundary. Reset, teardown,
 * foreground resume, and wallet change reach clearTimers(); a server switch
 * bumps it through changeServer() and leaves the loop running. A deferred poll
 * follow-up and an in-flight fetchSyncStatus each capture the epoch and drop
 * once a boundary has passed.
 *
 * To add a new periodic task, push it into taskPromises inside runTaskPromises.
 */
import { Epoch, isCurrent } from '@app/walletBackend/controller/syncController';
import { GlobalConst, ServerType } from '@app/AppState';
import RPCModule from '@app/RPCModule';
import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';
import { RPCSyncPollType } from '@app/walletBackend/types/RPCSyncPollType';
import { scanInProgress } from '@app/walletBackend/utils/syncProgress';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import {
  WalletBackendConfig,
  isOffline,
} from '@app/walletBackend/config/WalletBackendConfig';
import { DataService } from './DataService';
import { doSave } from '@app/walletBackend/utils/walletUtils';

// Consecutive failed sync launches before onPersistentSyncFailure fires.
// Three failures span ~15 s of the 5 s tick: long enough to ride out a
// one-off blip, short enough that a dead server gets replaced before the
// user reaches for Settings.
const PERSISTENT_SYNC_FAILURE_THRESHOLD = 3;

type LaneHolder = 'none' | 'sync' | 'rescan';

// What a deferred task's drop means: a user-issued task reports its drop
// through onError; a poll-scheduled task drops silently, because the next
// tick schedules it again.
type DropReport = 'report' | 'silent';

export class SyncCoordinator {
  config: WalletBackendConfig;
  dataService: DataService;

  updateTimerID?: NodeJS.Timeout;
  timers: NodeJS.Timeout[] = [];

  // The command holding the single-flight launch lane, or none. The lock the
  // tick's gate reads is derived from this record.
  laneHolder: LaneHolder = 'none';
  get refreshSyncLock(): boolean {
    return this.laneHolder !== 'none';
  }
  fetchSyncStatusLock: boolean = false;
  fetchSyncPollLock: boolean = false;

  // A counter bumped at every invalidating boundary; work that captured an older value drops.
  controllerEpoch: Epoch = 0;

  // The epoch of the tick in flight. Ticks of that epoch do not re-enter, so
  // they cannot both read the save-required gate; a boundary releases the lane
  // from a tick that never settles.
  tickInFlight: Epoch | undefined = undefined;

  // A rescan issued while the lane was held, released when the lane clears.
  queuedRescan: { kind: 'none' } | { kind: 'queued'; epoch: Epoch } = {
    kind: 'none',
  };

  syncLaunchFailures: number = 0;

  walletConfigPerformanceLevel: RPCPerformanceLevelEnum | undefined;

  constructor(config: WalletBackendConfig, dataService: DataService) {
    this.config = config;
    this.dataService = dataService;
  }

  async configure(): Promise<void> {
    // The loop is armed in the finally, so a rejected fetch still leaves the
    // coordinator polling.
    try {
      await this.dataService.fetchTandZandOValueTransfers();
      await this.dataService.fetchAddresses();
      await this.dataService.fetchTotalBalance();
      await this.dataService.fetchInfoAndServerHeight();
      await this.dataService.fetchZingolibVersion();
      await this.dataService.fetchTandZandOMessages();
      await this.dataService.fetchWalletHeight();
      await this.dataService.fetchWalletBirthdaySeedUfvk();
    } finally {
      if (this.updateTimerID === undefined) {
        this.armNextTick();
      }
    }

    await this.sanitizeTimers();
  }

  // Arms the next tick as one tracked setTimeout. The loop re-arms itself only
  // after a tick's work resolves, so a slow tick cannot be overlapped by the
  // next. No setInterval.
  armNextTick(): void {
    this.updateTimerID = setTimeout(() => this.loopTick(), 5 * 1000);
    this.timers.push(this.updateTimerID);
  }

  async loopTick(): Promise<void> {
    const armedHandle = this.updateTimerID;
    try {
      await this.runTaskPromises();
    } catch (error) {
      // The tick runs from a setTimeout callback. This catch owns a rejected
      // tick, and the finally below re-arms the loop.
      this.config.onError(`Error sync tick: ${error}`);
    } finally {
      // Re-arm only while this loop is still the live one. A boundary landing
      // during the tick (clearTimers) sets updateTimerID undefined and stops it.
      if (this.updateTimerID === armedHandle) {
        this.timers = this.timers.filter(t => t !== armedHandle);
        this.updateTimerID = undefined;
        this.armNextTick();
      }
    }
  }

  // Runs the task on the next macrotask while its epoch is current. A drop
  // reports through onError when the task asks for it, and a throwing task
  // always reports, under the task's name.
  private deferUnder(
    epoch: Epoch,
    name: string,
    onDrop: DropReport,
    task: () => Promise<void>,
  ): void {
    setTimeout(async () => {
      if (!isCurrent(epoch, this.controllerEpoch)) {
        if (onDrop === 'report') {
          this.config.onError(
            `${name} dropped: a boundary passed before it ran`,
          );
        }
        return;
      }
      try {
        await task();
      } catch (error) {
        this.config.onError(`Error ${name}: ${error}`);
      }
    }, 0);
  }

  async runTaskPromises(): Promise<void> {
    // Single-flight lane: a tick arriving while one is in flight does
    // not re-enter. The self-rescheduling loop keeps the scheduled path from
    // overlapping; this guard also covers a direct re-entrant call.
    const epoch = this.controllerEpoch;
    if (
      this.tickInFlight !== undefined &&
      isCurrent(this.tickInFlight, epoch)
    ) {
      return;
    }
    this.tickInFlight = epoch;
    try {
      await this.runTick();
    } finally {
      if (this.tickInFlight === epoch) {
        this.tickInFlight = undefined;
      }
    }
  }

  private async runTick(): Promise<void> {
    this.sanitizeTimers();

    if (this.walletConfigPerformanceLevel !== this.config.performanceLevel) {
      const performance = await this.dataService.getConfigWalletPerformance();
      this.walletConfigPerformanceLevel = performance;
      console.log(
        '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ PERFORMANCE LEVEL',
        performance,
      );
      if (performance !== this.config.performanceLevel) {
        // setConfigWalletToProdProcess rejects on failure (typed FFI errors);
        // the catch owns the error path, and this tick's caller is a
        // setInterval with no rejection handler, so the rejection must be
        // contained here.
        try {
          const setConfigWallet = await RPCModule.setConfigWalletToProdProcess(
            this.config.performanceLevel,
            GlobalConst.minConfirmations.toString(),
          );
          console.log(
            '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ SET CONFIG WALLET',
            setConfigWallet,
          );
        } catch (error) {
          this.config.onError(`Set wallet to prod error: ${error}`);
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
      taskPromises.push(...this.dataService.retryFailedFetches());
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

  // Bumps the epoch so a status read or deferred poll begun under the old server drops, and keeps the loop running.
  changeServer(server: ServerType): void {
    this.controllerEpoch += 1;
    this.config.server = server;
  }

  async clearTimers(): Promise<void> {
    // A boundary passed (reset, teardown, foreground resume, wallet change):
    // invalidate any deferred poll follow-up issued under the old epoch.
    this.controllerEpoch += 1;

    if (this.updateTimerID !== undefined) {
      clearTimeout(this.updateTimerID);
      this.updateTimerID = undefined;
    }

    while (this.timers.length > 0) {
      const inter = this.timers.pop();
      clearTimeout(inter);
    }
  }

  async sanitizeTimers(): Promise<void> {
    const deleted: number[] = [];
    for (let i = 0; i < this.timers.length; i++) {
      if (this.updateTimerID && this.timers[i] === this.updateTimerID) {
        // keep
      } else {
        clearTimeout(this.timers[i]);
        deleted.push(i);
      }
    }
    for (let i = 0; i < deleted.length; i++) {
      this.timers.splice(deleted[i], 1);
    }
  }

  async refreshSync(fullRescan?: boolean) {
    // Launching a sync without an indexer is not a blip to retry: zingolib
    // refuses it with `Offline: no indexer configured`, and the 5 s tick
    // turned that refusal into a standing error — 120 of them in ten minutes
    // of field logs (2026-09-24) — plus a persistent-failure signal for a
    // server the user deliberately did not pick.
    if (isOffline(this.config)) {
      return;
    }
    // A launch and a rescan share one lane. A rescan issued while a sync holds
    // it waits in queuedRescan until the holder's finally releases it; one
    // issued while a rescan holds it is served by that rescan.
    if (this.refreshSyncLock) {
      if (fullRescan && this.laneHolder === 'sync') {
        this.queuedRescan = { kind: 'queued', epoch: this.controllerEpoch };
      }
      return;
    }
    this.laneHolder = fullRescan ? 'rescan' : 'sync';
    // A rescan tears the loop down before the native call. The epoch after
    // that teardown marks the rescan's own boundary; the finally reconfigures
    // while that boundary is still the current one, on success and on
    // rejection alike.
    let rescanEpoch: Epoch | undefined;
    try {
      this.config.keepAwake(true);

      if (fullRescan) {
        await this.clearTimers();
        rescanEpoch = this.controllerEpoch;
        this.config.onValueTransfersChanged([], 0);
        this.config.onMessagesChanged([], 0);
        this.config.onBalanceChanged({ kind: 'awaiting' });
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
        this.syncLaunchFailures = 0;
      }
    } catch (error) {
      // runSyncProcess and runRescanProcess reject on failure (typed FFI
      // errors); this catch owns the error path for both.
      console.log(`Critical Error sync/rescan run ${error}`);
      this.config.onError(`Error sync/rescan run: ${error}`);
      if (!fullRescan) {
        this.syncLaunchFailures += 1;
        if (this.syncLaunchFailures >= PERSISTENT_SYNC_FAILURE_THRESHOLD) {
          this.syncLaunchFailures = 0;
          this.config.onPersistentSyncFailure?.();
        }
      }
    } finally {
      this.laneHolder = 'none';
      const queued = this.queuedRescan;
      this.queuedRescan = { kind: 'none' };
      if (queued.kind === 'queued') {
        this.deferUnder(queued.epoch, 'queued rescan', 'report', () =>
          this.refreshSync(true),
        );
      }
      if (
        rescanEpoch !== undefined &&
        isCurrent(rescanEpoch, this.controllerEpoch)
      ) {
        // This catch owns a rejected reconfigure, so refreshSync resolves for
        // its caller either way.
        try {
          await this.configure();
        } catch (error) {
          this.config.onError(`Error rescan reconfigure: ${error}`);
        }
      }
    }
  }

  async fetchSyncStatus(): Promise<void> {
    if (this.fetchSyncStatusLock) {
      return;
    }
    this.fetchSyncStatusLock = true;
    // Capture the epoch before the read: a server switch during the await bumps
    // it, and a snapshot begun under the old server must drop, not apply.
    const issuedEpoch = this.controllerEpoch;
    try {
      const start = Date.now();
      const returnStatus: string = await RPCModule.statusSyncInfo();
      // A boundary during the read (a server switch) bumped the epoch: this
      // snapshot was begun under the old server, drop it unread.
      if (!isCurrent(issuedEpoch, this.controllerEpoch)) {
        return;
      }
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
      const inR = scanInProgress(ss);
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
    // Nothing to poll: an Offline session never launched a sync, and the
    // poll's own answer is what asks for one.
    if (isOffline(this.config)) {
      return;
    }
    if (this.fetchSyncPollLock) {
      console.log('***************** SYNC POLL - locked');
      return;
    }
    this.fetchSyncPollLock = true;
    // Capture the epoch before the poll: a boundary during the await, or before
    // a deferred follow-up fires, invalidates this poll's scheduled work.
    const issuedEpoch = this.controllerEpoch;
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
        this.deferUnder(issuedEpoch, 'poll-scheduled launch', 'silent', () =>
          this.refreshSync(),
        );
        return;
      }

      if (returnPoll.toLowerCase().startsWith('sync task is not complete')) {
        console.log('SYNC POLL -> FETCH STATUS', returnPoll);
        this.deferUnder(
          issuedEpoch,
          'poll-scheduled status read',
          'silent',
          () => this.fetchSyncStatus(),
        );
        console.log('SYNC POLL -> RUN SYNC', returnPoll);
        this.deferUnder(issuedEpoch, 'poll-scheduled launch', 'silent', () =>
          this.refreshSync(),
        );
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
      this.deferUnder(issuedEpoch, 'poll-scheduled status read', 'silent', () =>
        this.fetchSyncStatus(),
      );
    } catch (error) {
      console.log(`Critical Error sync poll ${error}`);
      this.config.onError(`Error sync poll: ${error}`);
    } finally {
      this.fetchSyncPollLock = false;
    }
  }
}
