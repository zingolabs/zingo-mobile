jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { TransactionService } from '@app/walletBackend/modules/TransactionService';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const service = () =>
  new TransactionService(
    { keepAwake: jest.fn() } as never,
    {
      clearTimers: jest.fn(async () => {}),
      refreshSync: jest.fn(async () => {}),
      configure: jest.fn(async () => {}),
    } as never,
  );

const send = () =>
  service().sendTransaction([{ address: 'u1recipient', amount: 1000 }]);

beforeEach(() => {
  jest.clearAllMocks();
  bridge.declineProcess.mockResolvedValue('Proposal declined.');
  bridge.confirmProcess.mockResolvedValue(JSON.stringify({ txids: ['tx'] }));
});

test('Tests that a send declines its stored proposal when the proposal answers an error, so sync resumes', async () => {
  bridge.sendProcess.mockResolvedValue(JSON.stringify({ error: 'no funds' }));

  await expect(send()).rejects.toBe('no funds');

  expect(bridge.confirmProcess).not.toHaveBeenCalled();
  expect(bridge.declineProcess).toHaveBeenCalledTimes(1);
});

test('Tests that a send declines nothing when confirm ran, because confirm consumes the proposal', async () => {
  bridge.sendProcess.mockResolvedValue(JSON.stringify({ fee: 10000 }));

  await expect(send()).resolves.toBe('tx');
  bridge.confirmProcess.mockRejectedValueOnce(new Error('broadcast failed'));
  await expect(send()).rejects.toMatch('broadcast failed');

  expect(bridge.declineProcess).not.toHaveBeenCalled();
});

test('Tests that a send declines nothing when the proposal itself was refused', async () => {
  bridge.sendProcess.mockRejectedValue(new Error('refused'));

  await expect(send()).rejects.toMatch('refused');

  expect(bridge.declineProcess).not.toHaveBeenCalled();
});
