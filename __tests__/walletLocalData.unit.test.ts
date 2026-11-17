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
  releaseWalletOnFile,
} from '@app/services/WalletLocalData';
import { WalletLifecycleService } from '@app/walletBackend/modules/WalletLifecycleService';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;
const storage = AsyncStorage as unknown as Record<string, jest.Mock>;
const disk = new Map<string, string>();

const UFVK_A = 'uview1' + 'a'.repeat(60);
const FP_A = 'a'.repeat(16);
const FP_B = 'b'.repeat(16);

const seed = (fp: string) => {
  disk.set(`swap:records:${fp}`, '[{"recordId":"r"}]');
  disk.set(`receive:pin:${fp}`, 'u1pinned');
  disk.set(`ironwood:hidden:${fp}`, '0.0004');
};
const keysOf = (fp: string) =>
  [...disk.keys()].filter(k => k.endsWith(fp) && k !== 'wallet:fingerprint');

/** The wallets on the device: the first is the active one, each with the fingerprint it recorded ('' for none yet). */
const onDevice = (...fingerprints: string[]) =>
  bridge.walletsInfo.mockResolvedValue(
    JSON.stringify({
      active: 'w0',
      wallets: fingerprints.map((fingerprint, i) => ({
        id: `w${i}`,
        hasFile: true,
        meta: {
          v: 1,
          id: `w${i}`,
          order: i + 1,
          createdAt: 0,
          name: `Wallet ${i + 1}`,
          ...(fingerprint ? { fingerprint } : {}),
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
  bridge.getUfvkInfo.mockRejectedValue(new Error('no wallet open'));
  bridge.walletExists.mockResolvedValue('true');
  bridge.walletBackupExists.mockResolvedValue('false');
  onDevice('');
  bridge.updateWalletMetaProcess.mockResolvedValue('{}');
  bridge.deleteExistingWallet.mockResolvedValue('true');
  bridge.replaceWalletWithBackup.mockResolvedValue('true');
  bridge.restoreExistingWalletBackup.mockResolvedValue('true');
});

test('Tests that forgetting the wallet clears its swaps, pin and hidden notice by the open wallet when one is open', async () => {
  bridge.getUfvkInfo.mockResolvedValue(JSON.stringify({ ufvk: UFVK_A }));
  seed(FP_A);
  seed(FP_B);
  disk.set('wallet:fingerprint', FP_B);

  await forgetWalletOnFile();

  expect(keysOf(FP_A)).toEqual([]);
  expect(keysOf(FP_B)).toHaveLength(3);
  expect(disk.has('wallet:fingerprint')).toBe(false);
});

test('Tests that forgetting the wallet clears its swaps, pin and hidden notice by the pointer when no wallet is open', async () => {
  seed(FP_A);
  disk.set('wallet:fingerprint', FP_A);

  await forgetWalletOnFile();

  expect(keysOf(FP_A)).toEqual([]);
  expect(disk.has('wallet:fingerprint')).toBe(false);
});

test('Tests that opening a wallet clears the previous wallet on file when no wallet on the device owns it', async () => {
  seed(FP_A);
  seed(FP_B);
  disk.set('wallet:fingerprint', FP_A);

  await adoptWalletOnFile(FP_B);

  expect(keysOf(FP_A)).toEqual([]);
  expect(keysOf(FP_B)).toHaveLength(3);
  expect(disk.get('wallet:fingerprint')).toBe(FP_B);
});

test('Tests that opening a wallet records its fingerprint in its meta when the meta has none', async () => {
  await adoptWalletOnFile(FP_B);

  expect(bridge.updateWalletMetaProcess).toHaveBeenCalledWith(
    'w0',
    JSON.stringify({ fingerprint: FP_B }),
  );
});

test('Tests that opening a wallet keeps the data of another wallet when that wallet is on the device', async () => {
  onDevice('', FP_A);
  seed(FP_A);

  await adoptWalletOnFile(FP_B);

  expect(keysOf(FP_A)).toHaveLength(3);
});

test('Tests that opening a wallet keeps other wallets’ data when a wallet’s fingerprint is unknown or the list fails', async () => {
  seed(FP_A);
  onDevice('', '');
  await adoptWalletOnFile(FP_B);
  expect(keysOf(FP_A)).toHaveLength(3);

  bridge.walletsInfo.mockRejectedValue(new Error('bridge'));
  await adoptWalletOnFile(FP_B);
  expect(keysOf(FP_A)).toHaveLength(3);
});

test('Tests that releasing the wallet keeps its data when another wallet takes its place', async () => {
  seed(FP_A);
  disk.set('wallet:fingerprint', FP_A);

  await releaseWalletOnFile();
  onDevice('', FP_A);
  await adoptWalletOnFile(FP_B);

  expect(keysOf(FP_A)).toHaveLength(3);
});

test('Tests that forgetting the wallet keeps its data when another wallet shares its fingerprint', async () => {
  bridge.getUfvkInfo.mockResolvedValue(JSON.stringify({ ufvk: UFVK_A }));
  onDevice(FP_A, FP_A);
  seed(FP_A);

  await forgetWalletOnFile();

  expect(keysOf(FP_A)).toHaveLength(3);
});

test('Tests that forgetting a wallet by id clears the data of its recorded fingerprint when no other wallet has it', async () => {
  onDevice(FP_B, FP_A);
  seed(FP_A);
  seed(FP_B);
  disk.set('wallet:fingerprint', FP_A);

  await forgetWallet('w1');

  expect(keysOf(FP_A)).toEqual([]);
  expect(keysOf(FP_B)).toHaveLength(3);
  expect(disk.has('wallet:fingerprint')).toBe(false);
});

test('Tests that forgetting a wallet by id clears nothing when it never recorded a fingerprint', async () => {
  onDevice(FP_B, '');
  seed(FP_A);

  await forgetWallet('w1');

  expect(keysOf(FP_A)).toHaveLength(3);
});

test('Tests that changing the wallet clears its data before the file goes when no wallet is open', async () => {
  seed(FP_A);
  disk.set('wallet:fingerprint', FP_A);

  const result = await service().changeWallet();

  expect(result.kind).toBe('done');
  expect(keysOf(FP_A)).toEqual([]);
  expect(bridge.deleteExistingWallet).toHaveBeenCalledTimes(1);
});

test('Tests that changing the wallet keeps the file when its data cannot be cleared', async () => {
  disk.set('wallet:fingerprint', FP_A);
  storage.removeItem.mockRejectedValue(new Error('disk'));

  const result = await service().changeWallet();

  expect(result.kind).toBe('error');
  expect(bridge.deleteExistingWallet).not.toHaveBeenCalled();
});

test('Tests that restoring the backup clears the wallet it replaces when replace is set', async () => {
  bridge.walletBackupExists.mockResolvedValue('true');
  bridge.getUfvkInfo.mockResolvedValue(JSON.stringify({ ufvk: UFVK_A }));
  seed(FP_A);

  const result = await service().restoreBackup(true);

  expect(result.kind).toBe('done');
  expect(keysOf(FP_A)).toEqual([]);
});

test('Tests that restoring the backup keeps the wallet it swaps out when replace is not set', async () => {
  bridge.walletBackupExists.mockResolvedValue('true');
  bridge.getUfvkInfo.mockResolvedValue(JSON.stringify({ ufvk: UFVK_A }));
  seed(FP_A);
  disk.set('wallet:fingerprint', FP_A);

  const result = await service().restoreBackup(false);

  expect(result.kind).toBe('done');
  expect(keysOf(FP_A)).toHaveLength(3);
  expect(disk.has('wallet:fingerprint')).toBe(false);
});

test('Tests that forgetting the wallet removes the address book tags of the addresses its swaps made when its swaps go. A purchase made its destination and a sale its refund address.', async () => {
  disk.set(
    `swap:records:${FP_A}`,
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
  disk.set('wallet:fingerprint', FP_A);

  await forgetWalletOnFile();

  expect(mockRemoveAddresses).toHaveBeenCalledWith(['u1bought', 'u1refund']);
  expect(keysOf(FP_A)).toEqual([]);
});
