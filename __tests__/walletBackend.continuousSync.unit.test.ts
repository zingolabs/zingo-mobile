/**
 * Continuous sync: the engine stays at the chain tip and ends only when it is
 * stopped or fails, as zingo-pc runs it. The tick polls a running engine
 * instead of relaunching it, and every spend runs with the engine stopped.
 */
jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { SyncCoordinator } from '@app/walletBackend/modules/SyncCoordinator';
import type { DataService } from '@app/walletBackend/modules/DataService';
import {
  spendInFlight,
  withSyncStopped,
} from '@app/walletBackend/utils/syncBracket';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockWalletBackendConfig } from '../__mocks__/dataMocks/mockWalletBackendConfig';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

const RUNNING = 'Sync task is not complete.';
const NOT_LAUNCHED = 'Sync task has not been launched.';

function coordinator() {
  const config = mockWalletBackendConfig({ server: mockServer });
  return new SyncCoordinator(config, {} as DataService);
}

async function flushTimeouts() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('the tick polls a running engine', () => {
  it('does not relaunch when the engine answers it is running', async () => {
    mockedBridge.pollSyncInfo.mockResolvedValueOnce(RUNNING);
    mockedBridge.statusSyncInfo.mockResolvedValueOnce('{}');

    await coordinator().fetchSyncPoll();
    await flushTimeouts();

    expect(mockedBridge.runSyncProcess).not.toHaveBeenCalled();
    expect(mockedBridge.statusSyncInfo).toHaveBeenCalled();
  });

  it('launches a session when none is running', async () => {
    mockedBridge.pollSyncInfo.mockResolvedValueOnce(NOT_LAUNCHED);
    mockedBridge.runSyncProcess.mockResolvedValueOnce('Launching sync task...');

    await coordinator().fetchSyncPoll();
    await flushTimeouts();

    expect(mockedBridge.runSyncProcess).toHaveBeenCalledTimes(1);
  });
});

describe('a spend runs with the engine stopped', () => {
  it('stops the engine and waits for it to end before spending', async () => {
    const calls: string[] = [];
    mockedBridge.stopSyncProcess.mockImplementationOnce(async () => {
      calls.push('stop');
      return 'Stopping sync task...';
    });
    mockedBridge.pollSyncInfo
      .mockImplementationOnce(async () => {
        calls.push('poll');
        return RUNNING;
      })
      .mockImplementationOnce(async () => {
        calls.push('poll');
        return NOT_LAUNCHED;
      });

    const result = await withSyncStopped(async () => {
      calls.push('spend');
      return 'txid';
    });

    expect(result).toBe('txid');
    expect(calls).toEqual(['stop', 'poll', 'poll', 'spend']);
  });

  it('keeps the tick from launching a session while the spend runs', async () => {
    mockedBridge.stopSyncProcess.mockResolvedValueOnce('Sync already stopped.');
    mockedBridge.pollSyncInfo.mockResolvedValueOnce(NOT_LAUNCHED);

    await withSyncStopped(async () => {
      expect(spendInFlight()).toBe(true);
      await coordinator().refreshSync();
    });

    expect(mockedBridge.runSyncProcess).not.toHaveBeenCalled();
    expect(spendInFlight()).toBe(false);
  });

  it('still spends when the stop is refused', async () => {
    mockedBridge.stopSyncProcess.mockRejectedValueOnce(new Error('refused'));
    mockedBridge.pollSyncInfo.mockResolvedValueOnce(NOT_LAUNCHED);

    await expect(withSyncStopped(async () => 'txid')).resolves.toBe('txid');
  });

  it('lets the tick launch again once a failed spend is over', async () => {
    mockedBridge.stopSyncProcess.mockResolvedValueOnce('Sync already stopped.');
    mockedBridge.pollSyncInfo.mockResolvedValueOnce(NOT_LAUNCHED);

    await expect(
      withSyncStopped(async () => {
        throw new Error('spend failed');
      }),
    ).rejects.toThrow('spend failed');

    expect(spendInFlight()).toBe(false);
  });
});
