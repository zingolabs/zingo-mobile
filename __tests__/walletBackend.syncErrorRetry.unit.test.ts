jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import WalletBackend from '@app/walletBackend/WalletBackend';
import type { DataService } from '@app/walletBackend/modules/DataService';
import { mockOfflineServer } from '../__mocks__/dataMocks/mockServer';
import { mockWalletBackendConfig } from '../__mocks__/dataMocks/mockWalletBackendConfig';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

afterEach(() => {
  jest.clearAllMocks();
});

test('Tests that a transfers fetch reads the list once when the read keeps failing', async () => {
  const onError = jest.fn();
  const backend = new WalletBackend(
    mockWalletBackendConfig({ onError, server: mockOfflineServer }),
  );
  const { dataService } = backend as unknown as { dataService: DataService };
  bridge.getValueTransfersList.mockRejectedValue(
    new Error('LightclientNotInitialized'),
  );

  await dataService.fetchTandZandOValueTransfers();

  expect(bridge.getValueTransfersList).toHaveBeenCalledTimes(1);
  expect(onError).toHaveBeenCalledWith(
    expect.stringContaining('LightclientNotInitialized'),
  );
  await backend.clearTimers();
});
