jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { DataService } from '@app/walletBackend/modules/DataService';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockWalletBackendConfig } from '../__mocks__/dataMocks/mockWalletBackendConfig';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
});

test('Tests that a failed fetch runs again on retry and is forgotten once it succeeds', async () => {
  const onBalanceChanged = jest.fn();
  const service = new DataService(
    mockWalletBackendConfig({ onBalanceChanged, server: mockServer }),
  );
  mockedBridge.getSpendableBalanceTotalInfo.mockRejectedValueOnce(
    new Error('indexer timeout'),
  );

  await service.fetchTotalBalance();
  expect(service.failedFetches.has('fetchTotalBalance')).toBe(true);
  expect(onBalanceChanged).not.toHaveBeenCalled();

  mockedBridge.getSpendableBalanceTotalInfo.mockResolvedValue(
    JSON.stringify({ spendable_balance: 100000000 }),
  );
  mockedBridge.getBalanceInfo.mockResolvedValue(
    JSON.stringify({ total_orchard_balance: 100000000 }),
  );
  await Promise.all(service.retryFailedFetches());

  expect(onBalanceChanged).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'polled' }),
  );
  expect(service.failedFetches.size).toBe(0);
  expect(service.retryFailedFetches()).toEqual([]);
});
