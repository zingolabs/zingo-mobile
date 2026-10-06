jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { ChainNameEnum } from '@app/AppState';
import { checkUfvk } from '@app/walletBackend';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

test('Tests that a key the native decoder accepts comes back with its network', async () => {
  bridge.parseUfvkInfo.mockResolvedValue(
    JSON.stringify({ status: 'success', chain_name: 'test' }),
  );
  expect(await checkUfvk('uviewtest1abc')).toEqual({
    kind: 'ufvk',
    chainName: ChainNameEnum.testChainName,
  });
});

test('Tests that a key the decoder rejects is invalid, and a failed call is unknown', async () => {
  bridge.parseUfvkInfo.mockResolvedValue(
    JSON.stringify({ status: 'Invalid viewkey', chain_name: null }),
  );
  expect(await checkUfvk('uview1abc')).toEqual({ kind: 'invalid' });

  bridge.parseUfvkInfo.mockRejectedValue(new Error('bridge down'));
  expect(await checkUfvk('uview1abc')).toEqual({ kind: 'unknown' });
});
