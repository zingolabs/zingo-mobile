jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { WalletLifecycleService } from '@app/walletBackend/modules/WalletLifecycleService';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const service = () =>
  new WalletLifecycleService({
    pauseSyncProcess: jest.fn(async () => {}),
  } as never);

beforeEach(() => {
  jest.clearAllMocks();
  bridge.walletBackupExists.mockResolvedValue('true');
  bridge.walletExists.mockResolvedValue('true');
});

test('Tests that a mainnet wallet swaps places with the backup', async () => {
  await service().restoreBackup(false);
  expect(bridge.restoreExistingWalletBackup).toHaveBeenCalledTimes(1);
  expect(bridge.replaceWalletWithBackup).not.toHaveBeenCalled();
});

test('Tests that a wallet of another network is replaced by the backup instead of swapped', async () => {
  await service().restoreBackup(true);
  expect(bridge.replaceWalletWithBackup).toHaveBeenCalledTimes(1);
  expect(bridge.restoreExistingWalletBackup).not.toHaveBeenCalled();
});
