jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { probeServer } from '@app/walletBackend';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

test('Tests that a verified probe comes back typed, with the chain and latency', async () => {
  bridge.probeServerInfo.mockResolvedValue(
    JSON.stringify({
      outcome: 'verified',
      host: 'zec.rocks',
      port: 443,
      resolved: ['1.2.3.4'],
      literal: false,
      latency_ms: 87,
      chain_name: 'main',
      block_height: 3100000,
      details: 'LightdInfo { .. }',
    }),
  );
  expect(await probeServer('https://zec.rocks:443')).toEqual({
    ok: true,
    value: {
      outcome: 'verified',
      host: 'zec.rocks',
      port: 443,
      resolved: ['1.2.3.4'],
      literal: false,
      latencyMs: 87,
      chainName: 'main',
      blockHeight: 3100000,
      details: 'LightdInfo { .. }',
    },
  });
});

test('Tests that a probe that stopped early keeps its outcome and cause', async () => {
  bridge.probeServerInfo.mockResolvedValue(
    JSON.stringify({
      outcome: 'unresolved',
      host: 'nope.invalid',
      port: 9067,
      cause: 'failed to lookup address information',
    }),
  );
  expect(await probeServer('https://nope.invalid:9067')).toEqual({
    ok: true,
    value: {
      outcome: 'unresolved',
      host: 'nope.invalid',
      port: 9067,
      cause: 'failed to lookup address information',
    },
  });
});

test('Tests that a rejected probe and an unknown report are errors', async () => {
  bridge.probeServerInfo.mockRejectedValue(
    Object.assign(new Error('the server address has no host'), {
      code: 'InvalidInput',
    }),
  );
  expect(await probeServer('')).toEqual({
    ok: false,
    error: { code: 'InvalidInput', message: 'the server address has no host' },
  });

  bridge.probeServerInfo.mockResolvedValue('{"outcome":"later"}');
  const unknown = await probeServer('https://zec.rocks:443');
  expect(unknown.ok).toBe(false);
});
