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
  bridge.restoreExistingWalletBackup.mockResolvedValue(true);
  bridge.replaceWalletWithBackup.mockResolvedValue('true');
});

test('Tests that a mainnet wallet swaps places with the backup', async () => {
  const result = await service().restoreBackup(false);
  expect(result.kind).toBe('done');
  expect(bridge.restoreExistingWalletBackup).toHaveBeenCalledTimes(1);
  expect(bridge.replaceWalletWithBackup).not.toHaveBeenCalled();
});

test('Tests that a wallet of another network is replaced by the backup instead of swapped', async () => {
  const result = await service().restoreBackup(true);
  expect(result.kind).toBe('done');
  expect(bridge.replaceWalletWithBackup).toHaveBeenCalledTimes(1);
  expect(bridge.restoreExistingWalletBackup).not.toHaveBeenCalled();
});

test('Tests that a restore the native side refuses or cannot run reads as an error', async () => {
  bridge.replaceWalletWithBackup.mockResolvedValueOnce(false);
  expect(await service().restoreBackup(true)).toMatchObject({
    kind: 'error',
    errorKey: 'rpc.restorebackup-error',
  });
  bridge.replaceWalletWithBackup.mockRejectedValueOnce(
    new TypeError('replaceWalletWithBackup is not a function'),
  );
  expect(await service().restoreBackup(true)).toMatchObject({
    kind: 'error',
    errorKey: 'rpc.restorebackup-error',
  });
});
