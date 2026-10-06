/**
 * SyncCoordinator must never await the raw native save bridge. Every wallet
 * save it initiates flows through the classifying walletUtils.doSave seam,
 * which contains a rejected native promise as false (zingo-mobile#1151;
 * audit Issue P). runTaskPromises is fired from a setInterval with no
 * rejection handler, so a save that escapes the seam becomes an unhandled
 * promise rejection on iOS (whose doSave rejects on failure) and aborts the
 * rest of that tick.
 *
 * This test pins the save site inside runTaskPromises: the periodic
 * save-required save.
 */
jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import * as walletUtils from '@app/walletBackend/utils/walletUtils';
import { SyncCoordinator } from '@app/walletBackend/modules/SyncCoordinator';
import type { DataService } from '@app/walletBackend/modules/DataService';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockWalletBackendConfig } from '../__mocks__/dataMocks/mockWalletBackendConfig';

const mockedDoSave = RPCModule.doSave as jest.Mock;

// A coordinator whose poll task is stubbed out: the poll path is out of
// scope here and schedules timers the tests must not leak. (Its lock flag
// would also short-circuit it, but that flag doubles as a long-task guard
// that skips the save branch under test.) The DataService stub supplies
// only what the exercised branch reads.
function coordinatorWith(dataService: Partial<DataService>): SyncCoordinator {
  const config = mockWalletBackendConfig({
    // A connected session: the save path under test is not the offline
    // path, and the coordinator reads this URI to tell them apart.
    server: mockServer,
  });
  const coordinator = new SyncCoordinator(config, dataService as DataService);
  jest.spyOn(coordinator, 'fetchSyncPoll').mockResolvedValue(undefined);
  return coordinator;
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('SyncCoordinator.runTaskPromises', () => {
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
    mockedDoSave.mockRejectedValue(new Error('bridge exploded'));

    await expect(coordinator.runTaskPromises()).resolves.toBeUndefined();

    // The raw bridge rejects; only the seam classifies and contains that.
    expect(doSaveSeam).toHaveBeenCalledTimes(1);
  });
});
