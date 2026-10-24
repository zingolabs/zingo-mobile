jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { SwapStore } from '@app/swap';
import { WalletLifecycleService } from '@app/walletBackend/modules/WalletLifecycleService';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const service = () =>
  new WalletLifecycleService({
    pauseSyncProcess: jest.fn(async () => {}),
  } as never);

beforeEach(() => {
  jest.clearAllMocks();
  bridge.walletExists.mockResolvedValue('true');
  bridge.deleteExistingWallet.mockResolvedValue('true');
});

test('Tests that changing the wallet clears its swap bucket before the file goes when the fingerprint is readable', async () => {
  bridge.getUfvkInfo.mockResolvedValue(
    JSON.stringify({ ufvk: 'uview1' + 'q'.repeat(60) }),
  );
  const cleared = jest
    .spyOn(SwapStore, 'clearForWallet')
    .mockResolvedValue(undefined);

  const result = await service().changeWallet();

  expect(result.kind).toBe('done');
  expect(cleared).toHaveBeenCalledTimes(1);
  expect(cleared.mock.invocationCallOrder[0]).toBeLessThan(
    bridge.deleteExistingWallet.mock.invocationCallOrder[0],
  );
});

test('Tests that changing the wallet skips the wipe when the fingerprint cannot be read', async () => {
  bridge.getUfvkInfo.mockRejectedValue(new Error('no wallet'));
  const cleared = jest
    .spyOn(SwapStore, 'clearForWallet')
    .mockResolvedValue(undefined);

  const result = await service().changeWallet();

  expect(result.kind).toBe('done');
  expect(cleared).not.toHaveBeenCalled();
  expect(bridge.deleteExistingWallet).toHaveBeenCalledTimes(1);
});
