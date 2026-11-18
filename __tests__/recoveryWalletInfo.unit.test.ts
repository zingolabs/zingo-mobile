/**
 * One Keychain entry per wallet: the screens read the open wallet's entry
 * and never another's, the start menu lists them all, and the entry of
 * single-wallet builds retires once the migrated wallet has its own.
 */
jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import 'react-native';
import * as Keychain from 'react-native-keychain';
import RPCModule from '@app/RPCModule';
import { GlobalConst } from '@app/AppState';
import {
  forgetRecoveryEntry,
  getRecoveryWalletInfo,
  recoveryEntriesOnDevice,
  saveRecoveryWalletInfo,
} from '@app/services/recoveryWalletInfo';

const keychain = Keychain as jest.Mocked<typeof Keychain>;
const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const LEGACY = GlobalConst.serviceKeyChain;
const serviceOf = (id: string) => `${LEGACY}:wallet:${id}`;
const store = new Map<string, string>();

type Wallet = { id: string; migratedFrom?: string; chain?: string };

/** The wallets on the device; the first is the open one. */
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

beforeEach(() => {
  jest.clearAllMocks();
  store.clear();
  onDevice({ id: 'w1' });
  keychain.setGenericPassword.mockImplementation(
    async (_username, password, options) => {
      store.set(String(options?.service), password);
      return false;
    },
  );
  keychain.getGenericPassword.mockImplementation(async options => {
    const service = String(options?.service);
    const password = store.get(service);
    return (
      password === undefined
        ? false
        : { username: GlobalConst.keyKeyChain, password, service }
    ) as never;
  });
  keychain.resetGenericPassword.mockImplementation(async options => {
    store.delete(String(options?.service));
    return true;
  });
  keychain.getAllGenericPasswordServices.mockImplementation(async () => [
    ...store.keys(),
  ]);
});

test('Tests that a saved phrase reads as birthday 0 when the entry has no birthday', async () => {
  store.set(serviceOf('w1'), JSON.stringify({ seed: 'abandon ability able' }));

  await expect(getRecoveryWalletInfo()).resolves.toEqual({
    seed: 'abandon ability able',
    birthday: 0,
  });
});

test('Tests that the open wallet never reads another wallet’s entry when it has none', async () => {
  store.set(serviceOf('w2'), JSON.stringify({ seed: 'other', birthday: 1 }));
  store.set(LEGACY, JSON.stringify({ seed: 'legacy', birthday: 1 }));

  await expect(getRecoveryWalletInfo()).resolves.toEqual({});
});

test('Tests that a save lands under the open wallet’s own entry with its name, chain and order', async () => {
  onDevice({ id: 'w2', chain: 'test' }, { id: 'w1' });

  const result = await saveRecoveryWalletInfo({ seed: 'abc', birthday: 5 });

  expect(result).toEqual({ kind: 'saved' });
  expect(JSON.parse(store.get(serviceOf('w2')) as string)).toEqual({
    seed: 'abc',
    birthday: 5,
    chain: 'test',
    name: 'Wallet 1',
    category: 0,
    order: 1,
  });
});

test('Tests that a save writes nothing when no wallet is open', async () => {
  onDevice();

  const result = await saveRecoveryWalletInfo({ seed: 'abc', birthday: 5 });

  expect(result.kind).toBe('write-failed');
  expect(store.size).toBe(0);
});

test('Tests that the single-wallet entry retires when the migrated wallet saves the same keys', async () => {
  onDevice({ id: 'w1', migratedFrom: 'digest' });
  store.set(LEGACY, JSON.stringify({ seed: 'abc', birthday: 5 }));

  await saveRecoveryWalletInfo({ seed: 'abc', birthday: 5 });

  expect(store.has(LEGACY)).toBe(false);
  expect(store.has(serviceOf('w1'))).toBe(true);
});

test('Tests that the single-wallet entry stays when its keys are another wallet’s', async () => {
  onDevice({ id: 'w1', migratedFrom: 'digest' });
  store.set(LEGACY, JSON.stringify({ seed: 'other', birthday: 5 }));

  await saveRecoveryWalletInfo({ seed: 'abc', birthday: 5 });

  expect(store.has(LEGACY)).toBe(true);
});

test('Tests that the entries list every wallet in order with the single-wallet entry first and skips the rest', async () => {
  store.set(serviceOf('b'), JSON.stringify({ seed: 'b', order: 2, name: 'B' }));
  store.set(serviceOf('a'), JSON.stringify({ seed: 'a', order: 1, name: 'A' }));
  store.set(LEGACY, JSON.stringify({ ufvk: 'uview1legacy' }));
  store.set(serviceOf('empty'), JSON.stringify({ order: 3 }));
  store.set('SOMETHING_ELSE', JSON.stringify({ seed: 'x' }));

  const entries = await recoveryEntriesOnDevice();

  expect(entries.map(e => [e.walletId, e.name])).toEqual([
    ['', ''],
    ['a', 'A'],
    ['b', 'B'],
  ]);
});

test('Tests that the entries leave out the wallets on the device when a previous install left others', async () => {
  onDevice({ id: 'here' });
  store.set(serviceOf('here'), JSON.stringify({ seed: 'h', order: 1 }));
  store.set(serviceOf('gone'), JSON.stringify({ seed: 'g', order: 1 }));

  const entries = await recoveryEntriesOnDevice();

  expect(entries.map(e => e.walletId)).toEqual(['gone']);
});

test('Tests that the single-wallet entry is left out when a migrated wallet holds it', async () => {
  onDevice({ id: 'w1', migratedFrom: 'fp' });
  store.set(LEGACY, JSON.stringify({ seed: 'legacy' }));

  expect(await recoveryEntriesOnDevice()).toEqual([]);
});

test('Tests that a deleted wallet’s entry goes when other wallets remain', async () => {
  onDevice({ id: 'w1' }, { id: 'w2' });
  store.set(serviceOf('w2'), JSON.stringify({ seed: 'b' }));

  await forgetRecoveryEntry('w2');

  expect(store.has(serviceOf('w2'))).toBe(false);
});

test('Tests that the last wallet’s entry stays when it is deleted', async () => {
  store.set(serviceOf('w1'), JSON.stringify({ seed: 'a' }));

  await forgetRecoveryEntry('w1');

  expect(store.has(serviceOf('w1'))).toBe(true);
});
