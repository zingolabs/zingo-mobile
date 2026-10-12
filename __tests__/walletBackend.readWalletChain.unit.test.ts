jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { ChainNameEnum } from '@app/AppState';
import { readWalletChain } from '@app/walletBackend';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

test('Tests that the wallet file chain comes back as a chain name', async () => {
  bridge.walletChainInfo.mockResolvedValue('test');
  expect(await readWalletChain()).toEqual({
    ok: true,
    value: ChainNameEnum.testChainName,
  });
});

test('Tests that an unknown chain and a rejected read are errors', async () => {
  bridge.walletChainInfo.mockResolvedValue('zcash');
  expect((await readWalletChain()).ok).toBe(false);

  bridge.walletChainInfo.mockRejectedValue(
    Object.assign(new Error('not a wallet'), { code: 'Read' }),
  );
  expect(await readWalletChain()).toEqual({
    ok: false,
    error: { code: 'Read', message: 'not a wallet' },
  });
});
