jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import RPCModule from '@app/RPCModule';
import {
  adoptWalletOnFile,
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
};
const keysOf = (fp: string) =>
  [...disk.keys()].filter(k => k.endsWith(fp) && k !== 'wallet:fingerprint');

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
  bridge.deleteExistingWallet.mockResolvedValue('true');
  bridge.replaceWalletWithBackup.mockResolvedValue('true');
  bridge.restoreExistingWalletBackup.mockResolvedValue('true');
});

test('Tests that forgetting the wallet clears its swaps and pin by the open wallet when one is open', async () => {
  bridge.getUfvkInfo.mockResolvedValue(JSON.stringify({ ufvk: UFVK_A }));
  seed(FP_A);
  seed(FP_B);
  disk.set('wallet:fingerprint', FP_B);

  await forgetWalletOnFile();

  expect(keysOf(FP_A)).toEqual([]);
  expect(keysOf(FP_B)).toHaveLength(2);
  expect(disk.has('wallet:fingerprint')).toBe(false);
});

test('Tests that forgetting the wallet clears its swaps and pin by the pointer when no wallet is open', async () => {
  seed(FP_A);
  disk.set('wallet:fingerprint', FP_A);

  await forgetWalletOnFile();

  expect(keysOf(FP_A)).toEqual([]);
  expect(disk.has('wallet:fingerprint')).toBe(false);
});

test('Tests that opening a wallet clears the previous wallet on file when the file was replaced without a delete', async () => {
  bridge.walletBackupExists.mockResolvedValue('true');
  seed(FP_A);
  seed(FP_B);
  disk.set('wallet:fingerprint', FP_A);

  await adoptWalletOnFile(FP_B);

  expect(keysOf(FP_A)).toEqual([]);
  expect(keysOf(FP_B)).toHaveLength(2);
  expect(disk.get('wallet:fingerprint')).toBe(FP_B);
});

test('Tests that opening a wallet sweeps every other wallet’s data when there is no backup', async () => {
  seed(FP_A);
  seed(FP_B);

  await adoptWalletOnFile(FP_B);

  expect(keysOf(FP_A)).toEqual([]);
  expect(keysOf(FP_B)).toHaveLength(2);
});

test('Tests that opening a wallet keeps other wallets’ data when a backup exists or cannot be ruled out', async () => {
  seed(FP_A);
  bridge.walletBackupExists.mockResolvedValue('true');
  await adoptWalletOnFile(FP_B);
  expect(keysOf(FP_A)).toHaveLength(2);

  disk.delete('wallet:fingerprint');
  bridge.walletBackupExists.mockRejectedValue(new Error('bridge'));
  await adoptWalletOnFile(FP_B);
  expect(keysOf(FP_A)).toHaveLength(2);
});

test('Tests that releasing the wallet keeps its data when the backup swaps places with it', async () => {
  bridge.walletBackupExists.mockResolvedValue('true');
  seed(FP_A);
  disk.set('wallet:fingerprint', FP_A);

  await releaseWalletOnFile();
  await adoptWalletOnFile(FP_B);

  expect(keysOf(FP_A)).toHaveLength(2);
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
  expect(keysOf(FP_A)).toHaveLength(2);
  expect(disk.has('wallet:fingerprint')).toBe(false);
});
