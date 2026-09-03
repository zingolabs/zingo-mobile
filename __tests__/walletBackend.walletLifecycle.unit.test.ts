/**
 * The restore seam of WalletLifecycleService: the native restore resolves
 * false when the backup fails the full wallet parse, and that answer must
 * reach the caller as a typed failure. A DONE for a restore that did not
 * happen sends the app into a reload with `newWallet: true` on the wallet
 * it never replaced.
 */
jest.mock('../app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '../app/RPCModule';
import { WalletLifecycleService } from '../app/walletBackend/modules/WalletLifecycleService';
import type { SyncCoordinator } from '../app/walletBackend/modules/SyncCoordinator';

const mockedBackupExists = RPCModule.walletBackupExists as jest.Mock;
const mockedWalletExists = RPCModule.walletExists as jest.Mock;
const mockedRestore = RPCModule.restoreExistingWalletBackup as jest.Mock;

function service(): WalletLifecycleService {
  const coordinator = {
    pauseSyncProcess: jest.fn().mockResolvedValue(undefined),
  } as unknown as SyncCoordinator;
  return new WalletLifecycleService(coordinator);
}

describe('WalletLifecycleService.restoreBackup', () => {
  beforeEach(() => {
    mockedBackupExists.mockResolvedValue(true);
    mockedWalletExists.mockResolvedValue(true);
  });

  it.each([
    ['the Android failure shape', false],
    ['the iOS failure shape', 'false'],
  ])('reports a refused restore as a failure (%s)', async (_, refused) => {
    mockedRestore.mockResolvedValue(refused);

    const outcome = await service().restoreBackup();

    expect(outcome).toEqual({
      kind: 'error',
      errorKey: 'rpc.restorebackup-error',
    });
  });

  it.each([
    ['the Android success shape', true],
    ['the iOS success shape', 'true'],
  ])('reports a completed restore as done (%s)', async (_, restored) => {
    mockedRestore.mockResolvedValue(restored);

    const outcome = await service().restoreBackup();

    expect(outcome).toEqual({ kind: 'done' });
  });
});
