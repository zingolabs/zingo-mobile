/**
 * SyncCoordinator must never await the raw native save bridge. Every wallet
 * save it initiates flows through the classifying walletUtils.doSave seam,
 * which contains a rejected native promise as false (zingo-mobile#1151;
 * audit Issue P). runTaskPromises is fired from a setInterval with no
 * rejection handler, so a save that escapes the seam becomes an unhandled
 * promise rejection on iOS (whose doSave rejects on failure) and aborts the
 * rest of that tick.
 *
 * These tests pin both save sites inside runTaskPromises: the save after a
 * performance-level reconfiguration, and the periodic save-required save.
 */
jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import * as walletUtils from '@app/walletBackend/utils/walletUtils';
import { SyncCoordinator } from '@app/walletBackend/modules/SyncCoordinator';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import type { WalletBackendConfig } from '@app/walletBackend/config/WalletBackendConfig';
import type { DataService } from '@app/walletBackend/modules/DataService';

const mockedDoSave = RPCModule.doSave as jest.Mock;
const mockedSetConfigWalletToProd =
  RPCModule.setConfigWalletToProdProcess as jest.Mock;

// A coordinator whose poll task is stubbed out: the poll path is out of
// scope here and schedules timers the tests must not leak. (Its lock flag
// would also short-circuit it, but that flag doubles as a long-task guard
// that skips the save branch under test.) The DataService stub supplies
// only what the exercised branch reads.
function coordinatorWith(dataService: Partial<DataService>): SyncCoordinator {
  const config = {
    onError: jest.fn(),
    keepAwake: jest.fn(),
    performanceLevel: RPCPerformanceLevelEnum.High,
  } as unknown as WalletBackendConfig;
  const coordinator = new SyncCoordinator(config, dataService as DataService);
  jest.spyOn(coordinator, 'fetchSyncPoll').mockResolvedValue(undefined);
  return coordinator;
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('SyncCoordinator.runTaskPromises', () => {
  it('contains a failing save after reconfiguration and still re-reads the performance level', async () => {
    const getConfigWalletPerformance = jest
      .fn()
      .mockResolvedValueOnce(RPCPerformanceLevelEnum.Low)
      .mockResolvedValueOnce(RPCPerformanceLevelEnum.High);
    const coordinator = coordinatorWith({
      getConfigWalletPerformance,
      getWalletSaveRequired: jest.fn().mockResolvedValue(false),
    });
    mockedSetConfigWalletToProd.mockResolvedValue('wallet set to prod');
    mockedDoSave.mockRejectedValue(new Error('bridge exploded'));

    // The tick's promise must never reject — its caller is a setInterval
    // with no rejection handler.
    await expect(coordinator.runTaskPromises()).resolves.toBeUndefined();

    // The tick must finish its work after the failed save; the follow-up
    // performance re-read is the observable remainder.
    expect(getConfigWalletPerformance).toHaveBeenCalledTimes(2);
  });

  it('routes the periodic save-required save through the classifying seam', async () => {
    const doSaveSeam = jest.spyOn(walletUtils, 'doSave');
    const coordinator = coordinatorWith({
      getWalletSaveRequired: jest.fn().mockResolvedValue(true),
      fetchWalletHeight: jest.fn().mockResolvedValue(undefined),
      fetchWalletBirthdaySeedUfvk: jest.fn().mockResolvedValue(undefined),
      fetchInfoAndServerHeight: jest.fn().mockResolvedValue(undefined),
      fetchAddresses: jest.fn().mockResolvedValue(undefined),
      fetchTotalBalance: jest.fn().mockResolvedValue(undefined),
      fetchTandZandOValueTransfers: jest.fn().mockResolvedValue(undefined),
      fetchTandZandOMessages: jest.fn().mockResolvedValue(undefined),
    });
    // The performance level already matches config: only the periodic
    // save-required branch runs.
    coordinator.walletConfigPerformanceLevel = RPCPerformanceLevelEnum.High;
    mockedDoSave.mockRejectedValue(new Error('bridge exploded'));

    await expect(coordinator.runTaskPromises()).resolves.toBeUndefined();

    // The raw bridge rejects; only the seam classifies and contains that.
    expect(doSaveSeam).toHaveBeenCalledTimes(1);
  });
});
