jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { DataService } from '@app/walletBackend/modules/DataService';
import { mockOfflineServer } from '../__mocks__/dataMocks/mockServer';
import { mockWalletBackendConfig } from '../__mocks__/dataMocks/mockWalletBackendConfig';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

test('Tests that a transfers fetch asked for while one runs reads the list again when that one ends', async () => {
  const onValueTransfersChanged = jest.fn();
  const service = new DataService(
    mockWalletBackendConfig({
      onValueTransfersChanged,
      server: mockOfflineServer,
    }),
  );
  service.onSyncError = jest.fn();

  // The running fetch reads the list before the send lands; the one after it sees the send.
  let releaseFirst: (value: string) => void = () => {};
  bridge.getValueTransfersList
    .mockImplementationOnce(
      () =>
        new Promise<string>(resolve => {
          releaseFirst = resolve;
        }),
    )
    .mockResolvedValueOnce(JSON.stringify({ value_transfers: [] }));

  const running = service.fetchTandZandOValueTransfers();
  await Promise.resolve();
  await service.fetchTandZandOValueTransfers();
  releaseFirst(JSON.stringify({ value_transfers: [] }));
  await running;

  expect(bridge.getValueTransfersList).toHaveBeenCalledTimes(2);
  expect(onValueTransfersChanged).toHaveBeenCalledTimes(2);
});
