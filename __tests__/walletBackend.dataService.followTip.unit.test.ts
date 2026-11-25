jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { DataService } from '@app/walletBackend/modules/DataService';
import { knownTip } from '@app/walletBackend/utils/knownTip';
import { mockOfflineServer } from '../__mocks__/dataMocks/mockServer';
import { mockWalletBackendConfig } from '../__mocks__/dataMocks/mockWalletBackendConfig';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const confirmed = {
  txid: 'aa',
  datetime: 0,
  kind: 'received',
  status: 'confirmed',
  blockheight: 1000,
  value: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  bridge.getValueTransfersList.mockResolvedValue(
    JSON.stringify({ value_transfers: [confirmed] }),
  );
  bridge.getMessagesInfo.mockResolvedValue(
    JSON.stringify({ value_transfers: [] }),
  );
});

test('Tests that the tip is the server height when it is at or past the wallet height, else the wallet height', () => {
  expect(knownTip(1200, 1100)).toBe(1200);
  expect(knownTip(1100, 1100)).toBe(1100);
  expect(knownTip(1000, 1100)).toBe(1100);
  expect(knownTip(0, 1100)).toBe(1100);
  expect(knownTip(0, 0)).toBe(0);
});

test('Tests that the lists are counted again when the wallet height arrives after them. The confirmations follow the new tip.', async () => {
  const onValueTransfersChanged = jest.fn();
  const service = new DataService(
    mockWalletBackendConfig({
      onValueTransfersChanged,
      server: mockOfflineServer,
    }),
  );
  await service.fetchTandZandOValueTransfers();
  expect(onValueTransfersChanged.mock.calls[0][0][0].confirmations).toBe(1);

  bridge.getLatestBlockWalletInfo.mockResolvedValue(
    JSON.stringify({ height: 1100 }),
  );
  await service.fetchWalletHeight();

  expect(onValueTransfersChanged).toHaveBeenCalledTimes(2);
  expect(onValueTransfersChanged.mock.calls[1][0][0].confirmations).toBe(101);
});

test('Tests that the lists are read once when a height reading leaves the tip where it was', async () => {
  bridge.getLatestBlockWalletInfo.mockResolvedValue(
    JSON.stringify({ height: 1100 }),
  );
  const service = new DataService(
    mockWalletBackendConfig({ server: mockOfflineServer }),
  );
  await service.fetchWalletHeight();
  await service.fetchTandZandOValueTransfers();
  await service.fetchWalletHeight();

  expect(bridge.getValueTransfersList).toHaveBeenCalledTimes(1);
});
