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
import type { DataService } from '@app/walletBackend/modules/DataService';
import type { ServerType } from '@app/AppState';
import {
  mockOfflineServer as OFFLINE,
  mockServer as ONLINE,
} from '../__mocks__/dataMocks/mockServer';
import { mockWalletBackendConfig } from '../__mocks__/dataMocks/mockWalletBackendConfig';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

function coordinatorFor(server: ServerType) {
  const onError = jest.fn();
  const onSyncLaunch = jest.fn();
  const config = mockWalletBackendConfig({
    onError,
    onSyncLaunch,
    server,
  });
  const coordinator = new SyncCoordinator(config, {} as DataService);
  return { coordinator, onError, onSyncLaunch };
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

  // Offline has no server whose health a refusal could speak for.
  it('never reports a sync launch for an absent server', async () => {
    const { coordinator, onSyncLaunch } = coordinatorFor(OFFLINE);

    await coordinator.refreshSync();
    await coordinator.refreshSync();
    await coordinator.refreshSync();
    await coordinator.refreshSync();

    expect(onSyncLaunch).not.toHaveBeenCalled();
  });

  // The control: a connected session still syncs.
  it('launches a sync for a connected session', async () => {
    mockedBridge.runSyncProcess.mockResolvedValue('Launching sync task...');
    const { coordinator } = coordinatorFor(ONLINE);

    await coordinator.refreshSync();

    expect(mockedBridge.runSyncProcess).toHaveBeenCalledTimes(1);
  });

  it('reports each launch to the server health, launched or failed', async () => {
    const { coordinator, onSyncLaunch } = coordinatorFor(ONLINE);
    mockedBridge.runSyncProcess.mockResolvedValueOnce('Launching sync task...');
    await coordinator.refreshSync();
    mockedBridge.runSyncProcess.mockRejectedValueOnce(new Error('boom'));
    await coordinator.refreshSync();

    expect(onSyncLaunch.mock.calls).toEqual([
      [{ kind: 'launched' }],
      [{ kind: 'failed', error: 'Error: boom' }],
    ]);
  });
});

// Leaving Offline on a network still coming up can open the wallet with no
// indexer while the session is already online.
describe('an online session whose wallet opened with no indexer', () => {
  const refusal = Object.assign(
    new Error(
      'Error: sync: Offline: no indexer configured. Call set_indexer_uri() to connect.',
    ),
    { code: 'Sync' },
  );

  it('attaches its server again instead of recording an error', async () => {
    mockedBridge.runSyncProcess.mockRejectedValue(refusal);
    mockedBridge.changeServerProcess.mockResolvedValue('server set');
    const { coordinator, onError } = coordinatorFor(ONLINE);

    await coordinator.refreshSync();

    expect(onError).not.toHaveBeenCalled();
    expect(mockedBridge.changeServerProcess).toHaveBeenCalledWith(
      ONLINE.kind === 'remote' ? ONLINE.uri : '',
    );
  });

  it('still records any other sync failure', async () => {
    mockedBridge.runSyncProcess.mockRejectedValue(
      new Error('Error: indexer: boom'),
    );
    const { coordinator, onError } = coordinatorFor(ONLINE);

    await coordinator.refreshSync();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(mockedBridge.changeServerProcess).not.toHaveBeenCalled();
  });
});

describe('the screen stays awake only for a running sync', () => {
  const ranges = [{ priority: 'Historic', start_block: 0, end_block: 100 }];

  it('leaves the screen as it is for a status read with no session running', async () => {
    mockedBridge.statusSyncInfo.mockResolvedValue(
      JSON.stringify({
        scan_ranges: ranges,
        percentage_total_outputs_scanned: 0,
      }),
    );
    const { coordinator } = coordinatorFor(ONLINE);

    await coordinator.fetchSyncStatus();

    expect(coordinator.config.keepAwake).not.toHaveBeenCalled();
  });

  it('keeps the screen awake while a session scans', async () => {
    mockedBridge.statusSyncInfo.mockResolvedValue(
      JSON.stringify({
        scan_ranges: ranges,
        total_blocks: 100,
        percentage_total_outputs_scanned: 40,
      }),
    );
    const { coordinator } = coordinatorFor(ONLINE);

    await coordinator.fetchSyncStatus();

    expect(coordinator.config.keepAwake).toHaveBeenCalledWith(true);
  });
});
