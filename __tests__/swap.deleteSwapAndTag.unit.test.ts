jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);
const mockRemoveAddresses = jest.fn(async (_addresses: string[]) => []);
const mockReadAddressBook = jest.fn(async () => []);
jest.mock('@app/services/AddressBookFileImpl', () => ({
  __esModule: true,
  default: {
    removeAddresses: (a: string[]) => mockRemoveAddresses(a),
    readAddressBook: () => mockReadAddressBook(),
  },
}));

import { SwapStore } from '@app/swap';
import type { SwapRecordType } from '@app/swap';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { deleteSwapAndTag } from '@screens/Swap/useRemoveSwap';

const record = (overrides: Partial<SwapRecordType>) =>
  ({
    recordId: 'rec-1',
    direction: SwapDirectionEnum.Inbound,
    destinationAddress: 't1plain',
    ...overrides,
  }) as SwapRecordType;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(SwapStore, 'deleteByRecordId').mockResolvedValue();
});

test('Tests that the tag of the address a swap made goes when the swap is deleted', async () => {
  await deleteSwapAndTag(record({ destinationAddress: 'u1bought' }));

  expect(SwapStore.deleteByRecordId).toHaveBeenCalledWith('rec-1');
  expect(mockRemoveAddresses).toHaveBeenCalledWith(['u1bought']);
});

test('Tests that the address book is left alone when the deleted swap made no address', async () => {
  await deleteSwapAndTag(record({}));

  expect(mockRemoveAddresses).not.toHaveBeenCalled();
  expect(mockReadAddressBook).toHaveBeenCalled();
});
