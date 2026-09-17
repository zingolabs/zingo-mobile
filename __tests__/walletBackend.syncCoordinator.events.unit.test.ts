/**
 * SyncCoordinator drives sync from the wallet's events: SyncProgress
 * publishes a clamped status, SyncComplete refreshes the wallet state and
 * writes the file when the wallet asks for it, SyncFailed reports and counts
 * towards the persistent-failure callback, and configure launches sync
 * through startSync or resumeSync according to the current mode.
 */
jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import {
  SyncMode,
  SyncStatus,
  WalletEvent,
  ZingoError,
} from 'zingo-ffi';
import RPCModule from '@app/RPCModule';
import { SyncCoordinator } from '@app/walletBackend/modules/SyncCoordinator';
import { IDLE_SYNC_STATUS } from '@app/walletBackend/utils/syncProgress';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import type { WalletBackendConfig } from '@app/walletBackend/config/WalletBackendConfig';
import type { DataService } from '@app/walletBackend/modules/DataService';
import { installMockWallet, MockWallet } from '../__mocks__/mockWallet';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const syncResult = {
  syncStartHeight: 1,
  syncEndHeight: 2,
  blocksScanned: 1,
  saplingOutputsScanned: 0,
  orchardOutputsScanned: 0,
  ironwoodOutputsScanned: 0,
  percentageTotalOutputsScanned: 100,
};

function progressStatus(percentage: number): SyncStatus {
  return {
    ...IDLE_SYNC_STATUS,
    scanRanges: [{ priority: 1, startBlock: 1, endBlock: 2 }],
    percentageTotalOutputsScanned: percentage,
    percentageTotalBlocksScanned: percentage,
  };
}

function coordinatorWith(dataService: Partial<DataService>) {
  const config = {
    onError: jest.fn(),
    keepAwake: jest.fn(),
    onSyncStatusChanged: jest.fn(),
    onPersistentSyncFailure: jest.fn(),
    onValueTransfersChanged: jest.fn(),
    onMessagesChanged: jest.fn(),
    onBalanceChanged: jest.fn(),
    performanceLevel: RPCPerformanceLevelEnum.High,
  } as unknown as WalletBackendConfig & Record<string, jest.Mock>;
  const service = {
    busy: jest.fn(() => false),
    getWalletSaveRequired: jest.fn().mockResolvedValue(false),
    fetchWalletHeight: jest.fn().mockResolvedValue(undefined),
    fetchWalletBirthdaySeedUfvk: jest.fn().mockResolvedValue(undefined),
    fetchInfoAndServerHeight: jest.fn().mockResolvedValue(undefined),
    fetchAddresses: jest.fn().mockResolvedValue(undefined),
    fetchTotalBalance: jest.fn().mockResolvedValue(undefined),
    fetchTandZandOValueTransfers: jest.fn().mockResolvedValue(undefined),
    fetchTandZandOMessages: jest.fn().mockResolvedValue(undefined),
    fetchZingolibVersion: jest.fn().mockResolvedValue(undefined),
    getConfigWalletPerformance: jest
      .fn()
      .mockResolvedValue(RPCPerformanceLevelEnum.High),
    ...dataService,
  } as unknown as DataService & Record<string, jest.Mock>;
  const coordinator = new SyncCoordinator(config, service);
  return { coordinator, config, service };
}

let wallet: MockWallet;

beforeEach(() => {
  jest.useFakeTimers();
  wallet = installMockWallet().wallet;
  wallet.syncMode.mockResolvedValue(SyncMode.NotRunning);
  wallet.startSync.mockResolvedValue(undefined);
  wallet.resumeSync.mockResolvedValue(undefined);
  bridge.saveWallet.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('SyncProgress', () => {
  test('Tests that the status publishes clamped and the device stays awake when a scan is short of the tip', () => {
    const { coordinator, config } = coordinatorWith({});
    coordinator.onEvent(
      new WalletEvent.SyncProgress({ status: progressStatus(99.995) }),
    );
    expect(config.onSyncStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({ percentageTotalOutputsScanned: 99.99 }),
    );
    expect(config.keepAwake).toHaveBeenCalledWith(true);
  });

  test('Tests that the device may sleep when the scan reaches the tip', () => {
    const { coordinator, config } = coordinatorWith({});
    coordinator.onEvent(
      new WalletEvent.SyncProgress({ status: progressStatus(100) }),
    );
    expect(config.keepAwake).toHaveBeenCalledWith(false);
  });
});

describe('SyncComplete', () => {
  test('Tests that the file is written and the balance refreshed when the wallet requires a save', async () => {
    const { coordinator, service, config } = coordinatorWith({
      getWalletSaveRequired: jest.fn().mockResolvedValue(true),
    });
    await coordinator.onSyncComplete();
    expect(bridge.saveWallet).toHaveBeenCalledTimes(1);
    expect(service.fetchTotalBalance).toHaveBeenCalledTimes(1);
    expect(service.fetchTandZandOValueTransfers).toHaveBeenCalledTimes(1);
    expect(config.keepAwake).toHaveBeenCalledWith(false);
  });

  test('Tests that the balance refreshes without a write when the wallet requires no save', async () => {
    const { coordinator, service } = coordinatorWith({});
    await coordinator.onSyncComplete();
    expect(bridge.saveWallet).not.toHaveBeenCalled();
    expect(service.fetchTotalBalance).toHaveBeenCalledTimes(1);
  });

  test('Tests that a failed write is contained when the file module rejects', async () => {
    bridge.saveWallet.mockRejectedValue(
      Object.assign(new Error('disk full'), { code: 'Save' }),
    );
    const { coordinator, service } = coordinatorWith({
      getWalletSaveRequired: jest.fn().mockResolvedValue(true),
    });
    await expect(coordinator.onSyncComplete()).resolves.toBeUndefined();
    expect(service.fetchTandZandOMessages).toHaveBeenCalledTimes(1);
  });

  test('Tests that sync relaunches after the pause when a sync completes', async () => {
    const { coordinator } = coordinatorWith({});
    await coordinator.onSyncComplete();
    expect(wallet.startSync).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(5_000);
    expect(wallet.startSync).toHaveBeenCalledTimes(1);
  });
});

describe('SyncFailed', () => {
  test('Tests that the failure reaches onError with its tag when a sync fails', () => {
    const { coordinator, config } = coordinatorWith({});
    coordinator.onEvent(
      new WalletEvent.SyncFailed({
        error: new ZingoError.IndexerUnreachable({ detail: 'dial failed' }),
      }),
    );
    expect(config.onError).toHaveBeenCalledWith(
      expect.stringContaining('IndexerUnreachable: dial failed'),
    );
    expect(config.keepAwake).toHaveBeenCalledWith(false);
  });

  test('Tests that the persistent-failure callback fires when three syncs fail in a row', () => {
    const { coordinator, config } = coordinatorWith({});
    const failed = () =>
      coordinator.onEvent(
        new WalletEvent.SyncFailed({
          error: new ZingoError.Sync({ detail: 'boom' }),
        }),
      );
    failed();
    failed();
    expect(config.onPersistentSyncFailure).not.toHaveBeenCalled();
    failed();
    expect(config.onPersistentSyncFailure).toHaveBeenCalledTimes(1);
  });
});

describe('refreshSync', () => {
  test('Tests that sync starts when the wallet is not running', async () => {
    const { coordinator } = coordinatorWith({});
    await coordinator.refreshSync();
    expect(wallet.startSync).toHaveBeenCalledTimes(1);
    expect(wallet.resumeSync).not.toHaveBeenCalled();
  });

  test('Tests that sync resumes when the wallet is paused', async () => {
    wallet.syncMode.mockResolvedValue(SyncMode.Paused);
    const { coordinator } = coordinatorWith({});
    await coordinator.refreshSync();
    expect(wallet.resumeSync).toHaveBeenCalledTimes(1);
    expect(wallet.startSync).not.toHaveBeenCalled();
  });

  test('Tests that nothing launches when the wallet is already running', async () => {
    wallet.syncMode.mockResolvedValue(SyncMode.Running);
    const { coordinator } = coordinatorWith({});
    await coordinator.refreshSync();
    expect(wallet.startSync).not.toHaveBeenCalled();
    expect(wallet.resumeSync).not.toHaveBeenCalled();
  });

  test('Tests that a launch rejection reaches onError and counts when startSync refuses', async () => {
    wallet.startSync.mockRejectedValue(new ZingoError.Offline());
    const { coordinator, config } = coordinatorWith({});
    await coordinator.refreshSync();
    await coordinator.refreshSync();
    await coordinator.refreshSync();
    expect(config.onError).toHaveBeenCalledWith(
      expect.stringContaining('Error sync/rescan run'),
    );
    expect(config.onPersistentSyncFailure).toHaveBeenCalledTimes(1);
  });

  test('Tests that a rescan clears the published state and starts the rescan when requested', async () => {
    wallet.startRescan.mockResolvedValue(undefined);
    const { coordinator, config } = coordinatorWith({});
    await coordinator.refreshSync(true);
    expect(wallet.startRescan).toHaveBeenCalledTimes(1);
    expect(config.onSyncStatusChanged).toHaveBeenCalledWith(IDLE_SYNC_STATUS);
    expect(config.onValueTransfersChanged).toHaveBeenCalledWith([], 0);
  });

  test('Tests that the sync result shape stays untouched when completion is reported', () => {
    expect(new WalletEvent.SyncComplete({ result: syncResult }).inner.result).toBe(
      syncResult,
    );
  });
});

describe('configure and clearTimers', () => {
  test('Tests that configure subscribes to events and launches sync when the wallet is idle', async () => {
    const { coordinator, service } = coordinatorWith({});
    await coordinator.configure();
    expect(service.fetchTotalBalance).toHaveBeenCalledTimes(1);
    expect(coordinator.unsubscribe).toBeDefined();
    expect(wallet.events).toHaveBeenCalledTimes(1);
    expect(wallet.startSync).toHaveBeenCalledTimes(1);
    await coordinator.clearTimers();
    expect(coordinator.unsubscribe).toBeUndefined();
  });

  test('Tests that the wallet settings are aligned and saved when the stored level differs', async () => {
    wallet.setSettings.mockResolvedValue(undefined);
    const { coordinator } = coordinatorWith({
      getConfigWalletPerformance: jest
        .fn()
        .mockResolvedValueOnce(RPCPerformanceLevelEnum.Low)
        .mockResolvedValueOnce(RPCPerformanceLevelEnum.High),
    });
    await coordinator.applyPerformanceLevel();
    expect(wallet.setSettings).toHaveBeenCalledWith(
      expect.objectContaining({ minConfirmations: 3 }),
    );
    expect(bridge.saveWallet).toHaveBeenCalledTimes(1);
    expect(coordinator.walletConfigPerformanceLevel).toBe(
      RPCPerformanceLevelEnum.High,
    );
  });

  test('Tests that pauseSync reports through onError when the wallet refuses', async () => {
    wallet.pauseSync.mockRejectedValue(new ZingoError.Closed());
    const { coordinator, config } = coordinatorWith({});
    await coordinator.pauseSyncProcess();
    expect(config.onError).toHaveBeenCalledWith(
      expect.stringContaining('Error sync pause'),
    );
  });
});
