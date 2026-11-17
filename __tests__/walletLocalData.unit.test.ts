jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

const mockRemoveAddresses = jest.fn(async (_addresses: string[]) => []);
jest.mock('@app/services/AddressBookFileImpl', () => ({
  __esModule: true,
  default: { removeAddresses: (a: string[]) => mockRemoveAddresses(a) },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import RPCModule from '@app/RPCModule';
import {
  adoptWalletOnFile,
  forgetWallet,
  forgetWalletOnFile,
} from '@app/services/WalletLocalData';
import { WalletLifecycleService } from '@app/walletBackend/modules/WalletLifecycleService';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;
const storage = AsyncStorage as unknown as Record<string, jest.Mock>;
const disk = new Map<string, string>();

const UFVK_A = 'uview1' + 'a'.repeat(60);
const FP_A = 'a'.repeat(16);
const ID_1 = '11111111-1111-4111-8111-111111111111';
const ID_2 = '22222222-2222-4222-8222-222222222222';
const ID_GONE = '99999999-9999-4999-8999-999999999999';

const seed = (owner: string) => {
  disk.set(`swap:records:${owner}`, '[{"recordId":"r"}]');
  disk.set(`receive:pin:${owner}`, `u1pinned-${owner}`);
  disk.set(`ironwood:hidden:${owner}`, '0.0004');
};
const keysOf = (owner: string) =>
  [...disk.keys()].filter(k => k.endsWith(`:${owner}`));

type Wallet = { id: string; migratedFrom?: string; localDataMoved?: boolean };

/** The wallets on the device; the first is the active one. */
const onDevice = (...wallets: Wallet[]) =>
  bridge.walletsInfo.mockResolvedValue(
    JSON.stringify({
      active: wallets.length ? wallets[0].id : null,
      wallets: wallets.map((w, i) => ({
        id: w.id,
        hasFile: true,
        meta: {
          v: 1,
          order: i + 1,
          createdAt: 0,
          name: `Wallet ${i + 1}`,
          ...w,
        },
      })),
    }),
  );

const service = () =>
  new WalletLifecycleService({
    stopSyncProcess: jest.fn(async () => {}),
  } as never);

beforeEach(() => {
  jest.clearAllMocks();
  disk.clear();
  storage.getItem.mockImplementation(async (k: string) => disk.get(k) ?? null);
  storage.setItem.mockImplementation(async (k: string, v: string) => {
    disk.set(k, v);
  });
  storage.removeItem.mockImplementation(async (k: string) => {
    disk.delete(k);
  });
  storage.getAllKeys.mockImplementation(async () => [...disk.keys()]);
  bridge.getUfvkInfo.mockResolvedValue(JSON.stringify({ ufvk: UFVK_A }));
  onDevice({ id: ID_1 });
  bridge.updateWalletMetaProcess.mockResolvedValue('{}');
  bridge.walletExists.mockResolvedValue('true');
  bridge.walletBackupExists.mockResolvedValue('true');
  bridge.deleteExistingWallet.mockResolvedValue('true');
  bridge.replaceWalletWithBackup.mockResolvedValue('true');
  bridge.restoreExistingWalletBackup.mockResolvedValue('true');
});

test('Tests that forgetting a wallet clears its swaps, pin and hidden notice and nothing else when another wallet has data', async () => {
  seed(ID_1);
  seed(ID_2);

  await forgetWallet(ID_2);

  expect(keysOf(ID_2)).toEqual([]);
  expect(keysOf(ID_1)).toHaveLength(3);
});

test('Tests that forgetting the wallet on file clears the active wallet’s data when one is active', async () => {
  onDevice({ id: ID_2 }, { id: ID_1 });
  seed(ID_1);
  seed(ID_2);

  await forgetWalletOnFile();

  expect(keysOf(ID_2)).toEqual([]);
  expect(keysOf(ID_1)).toHaveLength(3);
});

test('Tests that a migrated wallet takes its fingerprint’s data on its first open', async () => {
  onDevice({ id: ID_1, migratedFrom: 'digest' });
  seed(FP_A);
  disk.set('wallet:fingerprint', FP_A);

  await adoptWalletOnFile(ID_1);

  expect(keysOf(FP_A)).toEqual([]);
  expect(disk.get(`receive:pin:${ID_1}`)).toBe(`u1pinned-${FP_A}`);
  expect(keysOf(ID_1)).toHaveLength(3);
  expect(bridge.updateWalletMetaProcess).toHaveBeenCalledWith(
    ID_1,
    JSON.stringify({ localDataMoved: true }),
  );
  expect(disk.has('wallet:fingerprint')).toBe(false);
});

test('Tests that a migrated wallet keeps the data its id already has when its fingerprint has some too', async () => {
  onDevice({ id: ID_1, migratedFrom: 'digest' });
  seed(FP_A);
  disk.set(`receive:pin:${ID_1}`, 'u1mine');

  await adoptWalletOnFile(ID_1);

  expect(disk.get(`receive:pin:${ID_1}`)).toBe('u1mine');
  expect(keysOf(FP_A)).toEqual([]);
});

test('Tests that a wallet created on this device never takes a fingerprint’s data when it shares the fingerprint', async () => {
  onDevice({ id: ID_2 }, { id: ID_1, migratedFrom: 'digest' });
  seed(FP_A);

  await adoptWalletOnFile(ID_2);

  expect(keysOf(ID_2)).toEqual([]);
  expect(keysOf(FP_A)).toHaveLength(3);
  expect(bridge.updateWalletMetaProcess).not.toHaveBeenCalled();
});

test('Tests that fingerprint data goes when no migrated wallet still waits to take it', async () => {
  onDevice({ id: ID_1, migratedFrom: 'digest', localDataMoved: true });
  seed('b'.repeat(16));

  await adoptWalletOnFile(ID_1);

  expect(keysOf('b'.repeat(16))).toEqual([]);
});

test('Tests that a migrated wallet whose fingerprint cannot be read waits for its next open', async () => {
  bridge.getUfvkInfo.mockRejectedValue(new Error('no wallet open'));
  onDevice({ id: ID_1, migratedFrom: 'digest' });
  seed(FP_A);

  await adoptWalletOnFile(ID_1);

  expect(keysOf(FP_A)).toHaveLength(3);
  expect(bridge.updateWalletMetaProcess).not.toHaveBeenCalled();
});

test('Tests that the data of a wallet no longer on the device goes and the others stay when a wallet opens', async () => {
  onDevice({ id: ID_1 }, { id: ID_2 });
  seed(ID_1);
  seed(ID_2);
  seed(ID_GONE);

  await adoptWalletOnFile(ID_1);

  expect(keysOf(ID_GONE)).toEqual([]);
  expect(keysOf(ID_1)).toHaveLength(3);
  expect(keysOf(ID_2)).toHaveLength(3);
});

test('Tests that nothing is swept when the wallets on the device cannot be listed', async () => {
  bridge.walletsInfo.mockRejectedValue(new Error('bridge'));
  seed(ID_GONE);
  seed(FP_A);

  await adoptWalletOnFile(ID_1);

  expect(keysOf(ID_GONE)).toHaveLength(3);
  expect(keysOf(FP_A)).toHaveLength(3);
});

test('Tests that changing the wallet clears its data before the file goes', async () => {
  seed(ID_1);

  const result = await service().changeWallet();

  expect(result.kind).toBe('done');
  expect(keysOf(ID_1)).toEqual([]);
  expect(bridge.deleteExistingWallet).toHaveBeenCalledTimes(1);
});

test('Tests that changing the wallet keeps the file when its data cannot be cleared', async () => {
  seed(ID_1);
  storage.removeItem.mockRejectedValue(new Error('disk'));

  const result = await service().changeWallet();

  expect(result.kind).toBe('error');
  expect(bridge.deleteExistingWallet).not.toHaveBeenCalled();
});

test('Tests that restoring the backup clears the wallet it replaces when replace is set', async () => {
  seed(ID_1);

  const result = await service().restoreBackup(true);

  expect(result.kind).toBe('done');
  expect(keysOf(ID_1)).toEqual([]);
});

test('Tests that restoring the backup keeps the wallet it swaps out when replace is not set', async () => {
  seed(ID_1);

  const result = await service().restoreBackup(false);

  expect(result.kind).toBe('done');
  expect(keysOf(ID_1)).toHaveLength(3);
});

test('Tests that forgetting a wallet removes the address book tags of the addresses its swaps made when its swaps go. A purchase made its destination and a sale its refund address.', async () => {
  disk.set(
    `swap:records:${ID_1}`,
    JSON.stringify([
      { recordId: 'buy', direction: 'inbound', destinationAddress: 'u1bought' },
      {
        recordId: 'sell',
        direction: 'outbound',
        destinationAddress: '0xeth',
        refundAddress: 'u1refund',
      },
      {
        recordId: 'plain',
        direction: 'inbound',
        destinationAddress: 't1plain',
      },
    ]),
  );

  await forgetWallet(ID_1);

  expect(mockRemoveAddresses).toHaveBeenCalledWith(['u1bought', 'u1refund']);
  expect(keysOf(ID_1)).toEqual([]);
});
