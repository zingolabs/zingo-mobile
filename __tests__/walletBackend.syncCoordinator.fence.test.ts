/**
 * Behavior pins for the sync scheduler. They fix the CURRENT behavior of
 * SyncCoordinator before any source change, so a later change can prove it
 * flipped exactly one named assertion and left the rest green. They attach below
 * the component: SyncCoordinator built with a fake config of spies and a stub
 * DataService, driven with fake timers and the rpcModuleProxy mock, extending the
 * __tests__/walletBackend.mixnetCoordinator.unit.test.ts pattern one level up.
 *
 * The render and lifecycle invariants stay out: they need the pure-selector
 * extraction and live in the mounted container pins.
 */

jest.mock('../app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('../app/walletBackend/utils/walletUtils', () => ({
  ...jest.requireActual('../app/walletBackend/utils/walletUtils'),
  doSave: jest.fn().mockResolvedValue(true),
}));

import RPCModule from '../app/RPCModule';
import { SyncCoordinator } from '../app/walletBackend/modules/SyncCoordinator';
import { DataService } from '../app/walletBackend/modules/DataService';
import { WalletBackendConfig } from '../app/walletBackend/config/WalletBackendConfig';
import { RPCPerformanceLevelEnum } from '../app/walletBackend/enums/RPCPerformanceLevelEnum';
import { doSave } from '../app/walletBackend/utils/walletUtils';
import { mockServer } from '../__mocks__/dataMocks/mockServer';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;
const doSaveMock = doSave as jest.Mock;

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

function fakeConfig(): WalletBackendConfig {
  return {
    onBalanceChanged: jest.fn(),
    onValueTransfersChanged: jest.fn(),
    onMessagesChanged: jest.fn(),
    onAddressesChanged: jest.fn(),
    onInfoChanged: jest.fn(),
    onSyncStatusChanged: jest.fn(),
    onZingolibVersionChanged: jest.fn(),
    onBirthdayChanged: jest.fn(),
    onError: jest.fn(),
    onPersistentSyncFailure: jest.fn(),
    onMixnetViewChanged: jest.fn(),
    startMixnetTransport: jest.fn().mockResolvedValue('127.0.0.1:1080'),
    stopMixnetTransport: jest.fn().mockResolvedValue(undefined),
    mixnetSupported: false,
    nymEnabled: false,
    keepAwake: jest.fn(),
    readOnly: false,
    server: mockServer,
    performanceLevel: RPCPerformanceLevelEnum.Low,
  } as unknown as WalletBackendConfig;
}

// The coordinator reaches into DataService only for the eight configure()
// fetches, the save-required gate, and the lock flags. A stub is the honest
// seam for the coordinator's OWN scheduling logic; DataService internals are a
// separate fence.
function fakeDataService(): DataService {
  const resolved = () => jest.fn().mockResolvedValue(undefined);
  return {
    fetchTandZandOValueTransfers: resolved(),
    fetchAddresses: resolved(),
    fetchTotalBalance: resolved(),
    fetchInfoAndServerHeight: resolved(),
    fetchZingolibVersion: resolved(),
    fetchTandZandOMessages: resolved(),
    fetchWalletHeight: resolved(),
    fetchWalletBirthdaySeedUfvk: resolved(),
    getWalletSaveRequired: jest.fn().mockResolvedValue(false),
    getConfigWalletPerformance: jest
      .fn()
      .mockResolvedValue(RPCPerformanceLevelEnum.Low),
    fetchWalletHeightLock: false,
    fetchWalletBirthdaySeedUfvkLock: false,
    fetchInfoAndServerHeightLock: false,
    fetchTandZandOValueTransfersLock: false,
    fetchTandZandOMessagesLock: false,
    fetchTotalBalanceLock: false,
    fetchAddressesLock: false,
    fetchZingolibVersionLock: false,
    getWalletSaveRequiredLock: false,
  } as unknown as DataService;
}

describe('SyncCoordinator seam-A fence — scheduling machine, current behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('A.1: construction is inert — no timer, no callback, locks clear', () => {
    const config = fakeConfig();
    const c = new SyncCoordinator(config, fakeDataService());

    expect(c.updateTimerID).toBeUndefined();
    expect(c.timers).toHaveLength(0);
    expect(c.refreshSyncLock).toBe(false);
    expect(c.fetchSyncStatusLock).toBe(false);
    expect(c.fetchSyncPollLock).toBe(false);
    expect(c.syncLaunchFailures).toBe(0);
    expect(c.walletConfigPerformanceLevel).toBeUndefined();
    expect(config.onError).not.toHaveBeenCalled();
    expect(config.keepAwake).not.toHaveBeenCalled();
  });

  it('A.2: configure() awaits the eight fetches in fixed order, then one interval', async () => {
    const ds = fakeDataService();
    const c = new SyncCoordinator(fakeConfig(), ds);

    await c.configure();

    const order = (m: unknown) => (m as jest.Mock).mock.invocationCallOrder[0];
    expect(order(ds.fetchTandZandOValueTransfers)).toBeLessThan(
      order(ds.fetchAddresses),
    );
    expect(order(ds.fetchAddresses)).toBeLessThan(order(ds.fetchTotalBalance));
    expect(order(ds.fetchTotalBalance)).toBeLessThan(
      order(ds.fetchInfoAndServerHeight),
    );
    expect(order(ds.fetchInfoAndServerHeight)).toBeLessThan(
      order(ds.fetchZingolibVersion),
    );
    expect(order(ds.fetchZingolibVersion)).toBeLessThan(
      order(ds.fetchTandZandOMessages),
    );
    expect(order(ds.fetchTandZandOMessages)).toBeLessThan(
      order(ds.fetchWalletHeight),
    );
    expect(order(ds.fetchWalletHeight)).toBeLessThan(
      order(ds.fetchWalletBirthdaySeedUfvk),
    );

    const firstHandle = c.updateTimerID;
    expect(c.timers).toHaveLength(1);

    await c.configure(); // a second configure over a live interval adds no second one
    expect(c.updateTimerID).toBe(firstHandle);
    expect(c.timers).toHaveLength(1);

    await c.clearTimers();
  });

  it('clearTimers() drops the poll-scheduled launch by epoch', async () => {
    bridge.pollSyncInfo.mockResolvedValue('Sync task has not been launched.');
    bridge.runSyncProcess.mockResolvedValue('Launching sync task...');
    const c = new SyncCoordinator(fakeConfig(), fakeDataService());

    await c.fetchSyncPoll();
    await flushPromises();

    // the deferred launch is a setTimeout(…,0) that never entered the tracked set
    expect(c.timers).toHaveLength(0);
    expect(bridge.runSyncProcess).not.toHaveBeenCalled();

    await c.clearTimers();
    await jest.advanceTimersByTimeAsync(0);
    await flushPromises();

    // Fixed (ticket 09): clearTimers() bumped the controller epoch, so the
    // deferred launch reads a stale epoch and drops. It never fires against the
    // post-reset server/wallet.
    expect(bridge.runSyncProcess).not.toHaveBeenCalled();
  });

  describe('A.4: poll protocol — one path, one schedule set', () => {
    it("'not launched' schedules exactly one launch, no status read", async () => {
      bridge.pollSyncInfo.mockResolvedValue('Sync task has not been launched.');
      bridge.runSyncProcess.mockResolvedValue('Launching sync task...');
      const c = new SyncCoordinator(fakeConfig(), fakeDataService());

      await c.fetchSyncPoll();
      await jest.advanceTimersByTimeAsync(0);
      await flushPromises();

      expect(bridge.runSyncProcess).toHaveBeenCalledTimes(1);
      expect(bridge.statusSyncInfo).not.toHaveBeenCalled();
      await c.clearTimers();
    });

    it("'not complete' schedules a status read then a launch", async () => {
      bridge.pollSyncInfo.mockResolvedValue('Sync task is not complete.');
      bridge.statusSyncInfo.mockResolvedValue('{}');
      bridge.runSyncProcess.mockResolvedValue('Sync task already running.');
      const c = new SyncCoordinator(fakeConfig(), fakeDataService());

      await c.fetchSyncPoll();
      await jest.advanceTimersByTimeAsync(0);
      await flushPromises();

      expect(bridge.statusSyncInfo).toHaveBeenCalledTimes(1);
      expect(bridge.runSyncProcess).toHaveBeenCalledTimes(1);
      await c.clearTimers();
    });

    it('a JSON-parse failure calls onError and schedules nothing', async () => {
      bridge.pollSyncInfo.mockResolvedValue('not-json-and-not-a-status-prose');
      const config = fakeConfig();
      const c = new SyncCoordinator(config, fakeDataService());

      await c.fetchSyncPoll();
      await jest.advanceTimersByTimeAsync(0);
      await flushPromises();

      expect(config.onError).toHaveBeenCalledTimes(1);
      expect(bridge.statusSyncInfo).not.toHaveBeenCalled();
      expect(bridge.runSyncProcess).not.toHaveBeenCalled();
    });

    it('a JSON payload schedules exactly one status read', async () => {
      bridge.pollSyncInfo.mockResolvedValue(
        '{"sync_complete":{"percentage_total_outputs_scanned":50}}',
      );
      bridge.statusSyncInfo.mockResolvedValue('{}');
      const c = new SyncCoordinator(fakeConfig(), fakeDataService());

      await c.fetchSyncPoll();
      await jest.advanceTimersByTimeAsync(0);
      await flushPromises();

      expect(bridge.statusSyncInfo).toHaveBeenCalledTimes(1);
      expect(bridge.runSyncProcess).not.toHaveBeenCalled();
      await c.clearTimers();
    });
  });

  it('A.5: clearTimers() empties the tracked set and leaves the locks untouched', async () => {
    const c = new SyncCoordinator(fakeConfig(), fakeDataService());
    await c.configure();

    c.refreshSyncLock = true;
    await c.clearTimers();

    expect(c.updateTimerID).toBeUndefined();
    expect(c.timers).toHaveLength(0);
    expect(c.refreshSyncLock).toBe(true);
  });

  it('the single-flight lane skips a second overlapping tick', async () => {
    const ds = fakeDataService();
    const gate = deferred<boolean>();
    (ds.getWalletSaveRequired as jest.Mock).mockReturnValue(gate.promise);
    const c = new SyncCoordinator(fakeConfig(), ds);
    c.walletConfigPerformanceLevel = RPCPerformanceLevelEnum.Low; // skip the perf block

    const t1 = c.runTaskPromises(); // enters, hangs on getWalletSaveRequired
    await flushPromises();
    const t2 = c.runTaskPromises(); // a fresh 5s tick over a still-suspended one
    await flushPromises();

    // Fixed (ticket 09): the single-flight lane guards runTaskPromises, so the
    // second overlapping tick returns before re-reading the save-required gate.
    expect(ds.getWalletSaveRequired).toHaveBeenCalledTimes(1);

    gate.resolve(false);
    await Promise.all([t1, t2]);
    await c.clearTimers();
  });

  it('a full rescan is serialized behind the in-flight sync', async () => {
    bridge.runRescanProcess.mockResolvedValue('Launching rescan...');
    const c = new SyncCoordinator(fakeConfig(), fakeDataService());

    c.refreshSyncLock = true; // a normal sync is in flight
    await c.refreshSync(true); // rescan now shares the launch's single lane

    // Fixed (ticket 10): the single in-flight command drops the concurrent
    // rescan at issue time, so it never launches beside the sync and its finally
    // never releases the sync's lock.
    expect(bridge.runRescanProcess).not.toHaveBeenCalled();
    expect(c.refreshSyncLock).toBe(true);

    await c.clearTimers();
  });

  describe('A.8: save-required gate — three branches', () => {
    it('save not required pushes only the poll', async () => {
      const ds = fakeDataService();
      (ds.getWalletSaveRequired as jest.Mock).mockResolvedValue(false);
      bridge.pollSyncInfo.mockResolvedValue('{"sync_complete":{}}');
      const c = new SyncCoordinator(fakeConfig(), ds);
      c.walletConfigPerformanceLevel = RPCPerformanceLevelEnum.Low;

      await c.runTaskPromises();
      await flushPromises();

      expect(bridge.pollSyncInfo).toHaveBeenCalledTimes(1);
      expect(ds.fetchWalletHeight).not.toHaveBeenCalled();
      expect(doSaveMock).not.toHaveBeenCalled();
      await c.clearTimers();
    });

    it('save required with any lock set pushes only the poll', async () => {
      const ds = fakeDataService();
      (ds.getWalletSaveRequired as jest.Mock).mockResolvedValue(true);
      ds.fetchInfoAndServerHeightLock = true; // one of the twelve gate locks
      bridge.pollSyncInfo.mockResolvedValue('{"sync_complete":{}}');
      const c = new SyncCoordinator(fakeConfig(), ds);
      c.walletConfigPerformanceLevel = RPCPerformanceLevelEnum.Low;

      await c.runTaskPromises();
      await flushPromises();

      expect(bridge.pollSyncInfo).toHaveBeenCalledTimes(1);
      expect(ds.fetchWalletHeight).not.toHaveBeenCalled();
      expect(doSaveMock).not.toHaveBeenCalled();
      await c.clearTimers();
    });

    it('save required and all locks clear pushes the nine-item batch', async () => {
      const ds = fakeDataService();
      (ds.getWalletSaveRequired as jest.Mock).mockResolvedValue(true);
      bridge.pollSyncInfo.mockResolvedValue('{"sync_complete":{}}');
      const c = new SyncCoordinator(fakeConfig(), ds);
      c.walletConfigPerformanceLevel = RPCPerformanceLevelEnum.Low;

      await c.runTaskPromises();
      await flushPromises();

      expect(bridge.pollSyncInfo).toHaveBeenCalledTimes(1);
      expect(ds.fetchWalletHeight).toHaveBeenCalledTimes(1);
      expect(ds.fetchWalletBirthdaySeedUfvk).toHaveBeenCalledTimes(1);
      expect(ds.fetchInfoAndServerHeight).toHaveBeenCalledTimes(1);
      expect(ds.fetchAddresses).toHaveBeenCalledTimes(1);
      expect(ds.fetchTotalBalance).toHaveBeenCalledTimes(1);
      expect(doSaveMock).toHaveBeenCalledTimes(1);
      expect(ds.fetchTandZandOValueTransfers).toHaveBeenCalledTimes(1);
      expect(ds.fetchTandZandOMessages).toHaveBeenCalledTimes(1);
      await c.clearTimers();
    });

    it('the tick settles rather than rejects when a batch fetch fails', async () => {
      const ds = fakeDataService();
      (ds.getWalletSaveRequired as jest.Mock).mockResolvedValue(true);
      (ds.fetchTotalBalance as jest.Mock).mockRejectedValue(
        new Error('fetch blew up'),
      );
      bridge.pollSyncInfo.mockResolvedValue('{"sync_complete":{}}');
      const c = new SyncCoordinator(fakeConfig(), ds);
      c.walletConfigPerformanceLevel = RPCPerformanceLevelEnum.Low;

      // Promise.allSettled, never Promise.all: one rejecting member does not
      // reject the tick.
      await expect(c.runTaskPromises()).resolves.toBeUndefined();
      await c.clearTimers();
    });
  });

  describe('A.9: callback fan-out per path', () => {
    it('a full rescan resets the four view callbacks and keeps the screen awake', async () => {
      bridge.runRescanProcess.mockResolvedValue('Launching rescan...');
      const config = fakeConfig();
      const c = new SyncCoordinator(config, fakeDataService());

      await c.refreshSync(true);

      expect(config.keepAwake).toHaveBeenCalledWith(true);
      expect(config.onValueTransfersChanged).toHaveBeenCalledWith([], 0);
      expect(config.onMessagesChanged).toHaveBeenCalledWith([], 0);
      expect(config.onBalanceChanged).toHaveBeenCalledTimes(1);
      expect(config.onSyncStatusChanged).toHaveBeenCalledWith({});
      await c.clearTimers();
    });

    it('three non-rescan launch failures fire onError each and onPersistentSyncFailure once', async () => {
      bridge.runSyncProcess.mockRejectedValue(new Error('launch rejected'));
      const config = fakeConfig();
      const c = new SyncCoordinator(config, fakeDataService());

      await c.refreshSync();
      await c.refreshSync();
      await c.refreshSync();

      expect(config.onError).toHaveBeenCalledTimes(3);
      expect(config.onPersistentSyncFailure).toHaveBeenCalledTimes(1);
      expect(c.syncLaunchFailures).toBe(0); // reset when the threshold fires
    });

    it('a status read publishes the parsed status through onSyncStatusChanged', async () => {
      bridge.statusSyncInfo.mockResolvedValue(
        '{"scan_ranges":[],"percentage_total_outputs_scanned":100,"percentage_total_blocks_scanned":100}',
      );
      const config = fakeConfig();
      const c = new SyncCoordinator(config, fakeDataService());

      await c.fetchSyncStatus();
      await flushPromises();

      expect(config.onSyncStatusChanged).toHaveBeenCalledTimes(1);
      expect(config.keepAwake).toHaveBeenCalledWith(false); // 100% → scan not in progress
    });
  });

  // Two failure-path pins: a server switch drops the in-flight read begun under
  // the old server (below), and a batch fetch failure surfaces the error without
  // restarting the loop from inside the tick.

  it('a batch fetch failure surfaces the error without reconfiguring the loop', async () => {
    const ds = fakeDataService();
    (ds.getWalletSaveRequired as jest.Mock).mockResolvedValue(true);
    bridge.pollSyncInfo.mockResolvedValue('Sync task is not complete.');
    bridge.statusSyncInfo.mockResolvedValue('{}');
    bridge.runSyncProcess.mockResolvedValue('Sync task already running.');

    const config = fakeConfig();
    const c = new SyncCoordinator(config, ds);
    c.walletConfigPerformanceLevel = RPCPerformanceLevelEnum.Low;
    // Two batch fetches fail once each. After ticket 12 DataService's catch
    // surfaces the error through onError and returns — no clearTimers()+configure()
    // restart, and WalletBackend wires none. The fake mirrors that new catch.
    (ds.fetchTotalBalance as jest.Mock)
      .mockImplementationOnce(async () => {
        config.onError('Error balance: boom');
      })
      .mockResolvedValue(undefined);
    (ds.fetchAddresses as jest.Mock)
      .mockImplementationOnce(async () => {
        config.onError('Error addresses: boom');
      })
      .mockResolvedValue(undefined);

    await c.runTaskPromises();
    await flushPromises();

    // Fixed (ticket 12): no lifecycle method ran from the data-fetch catch, so the
    // loop was not rebuilt mid-tick. fetchInfoAndServerHeight runs once for the
    // batch, never again from a re-driven configure(); the next tick retries.
    expect((ds.fetchInfoAndServerHeight as jest.Mock).mock.calls.length).toBe(1);
    expect(config.onError).toHaveBeenCalledTimes(2);

    await c.clearTimers();
  });

  it('a server switch drops the in-flight read begun under the old server', async () => {
    const config = fakeConfig();
    const c = new SyncCoordinator(config, fakeDataService());
    const gate = deferred<string>();
    bridge.statusSyncInfo.mockReturnValue(gate.promise);

    const statusRun = c.fetchSyncStatus(); // reads against the current server
    await flushPromises();

    c.changeServer({ ...mockServer, uri: 'https://server-B' }); // switch bumps the epoch
    gate.resolve(
      '{"scan_ranges":[],"percentage_total_outputs_scanned":100,"percentage_total_blocks_scanned":100}',
    );
    await statusRun;
    await flushPromises();

    // Fixed (ticket 11): the switch bumped the controller epoch, so the read
    // begun under the old server reads a stale epoch and drops. The pre-switch
    // snapshot never reaches onSyncStatusChanged.
    expect(config.onSyncStatusChanged).not.toHaveBeenCalled();

    await c.clearTimers();
  });
});
