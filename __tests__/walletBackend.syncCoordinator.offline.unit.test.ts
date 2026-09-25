/**
 * Offline means offline on the sync side too (zingo-mobile#1427).
 *
 * A session with no server has no indexer, and zingolib refuses a sync
 * launch with `Offline: no indexer configured`. The 5 s tick asked anyway:
 * field logs from 2026-09-24 carry 120 of those refusals in ten minutes,
 * each one an error handed to the app and counted towards the
 * persistent-failure signal that exists to replace a broken server — for a
 * server the user deliberately did not pick.
 */
jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { SyncCoordinator } from '@app/walletBackend/modules/SyncCoordinator';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import type { WalletBackendConfig } from '@app/walletBackend/config/WalletBackendConfig';
import type { DataService } from '@app/walletBackend/modules/DataService';
import type { ServerType } from '@app/AppState';
import {
  mockOfflineServer as OFFLINE,
  mockServer as ONLINE,
} from '../__mocks__/dataMocks/mockServer';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

function coordinatorFor(server: ServerType) {
  const onError = jest.fn();
  const onPersistentSyncFailure = jest.fn();
  const config = {
    onError,
    onPersistentSyncFailure,
    keepAwake: jest.fn(),
    performanceLevel: RPCPerformanceLevelEnum.High,
    server,
  } as unknown as WalletBackendConfig;
  const coordinator = new SyncCoordinator(config, {} as DataService);
  return { coordinator, onError, onPersistentSyncFailure };
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('the sync follows the session connectivity', () => {
  it('never launches a sync for a session with no indexer', async () => {
    const { coordinator, onError } = coordinatorFor(OFFLINE);

    await coordinator.refreshSync();

    expect(mockedBridge.runSyncProcess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('never launches a rescan either', async () => {
    const { coordinator } = coordinatorFor(OFFLINE);

    await coordinator.refreshSync(true);

    expect(mockedBridge.runRescanProcess).not.toHaveBeenCalled();
  });

  it('never polls for a sync it did not launch', async () => {
    const { coordinator } = coordinatorFor(OFFLINE);

    await coordinator.fetchSyncPoll();

    expect(mockedBridge.pollSyncInfo).not.toHaveBeenCalled();
  });

  // The refusal used to count towards the threshold that replaces a broken
  // server. Offline has no server to replace.
  it('never spends a persistent-failure strike on an absent server', async () => {
    const { coordinator, onPersistentSyncFailure } = coordinatorFor(OFFLINE);

    await coordinator.refreshSync();
    await coordinator.refreshSync();
    await coordinator.refreshSync();
    await coordinator.refreshSync();

    expect(onPersistentSyncFailure).not.toHaveBeenCalled();
  });

  // The control: a connected session still syncs.
  it('launches a sync for a connected session', async () => {
    mockedBridge.runSyncProcess.mockResolvedValue('Launching sync task...');
    const { coordinator } = coordinatorFor(ONLINE);

    await coordinator.refreshSync();

    expect(mockedBridge.runSyncProcess).toHaveBeenCalledTimes(1);
  });
});
