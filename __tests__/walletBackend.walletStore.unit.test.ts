/**
 * The typed wrappers of the wallet id methods: the bridge's JSON becomes
 * unions, Android's boolean and iOS's "true" read alike, and the free-space
 * rule is twice the largest wallet, never under 200 MB.
 */
jest.mock('@app/RPCModule', () => {
  const members: Record<PropertyKey, jest.Mock> = {};
  return {
    __esModule: true,
    default: new Proxy(members, {
      get: (target, prop) => (target[prop] ??= jest.fn()),
    }),
  };
});

import RPCModule from '@app/RPCModule';
import {
  deleteWallet,
  hasRoomForWallet,
  MIN_FREE_BYTES,
  walletsOnDevice,
} from '@app/walletBackend/utils/walletStore';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const meta = (id: string) => ({
  v: 1,
  id,
  order: 1,
  createdAt: 0,
  name: 'Wallet 1',
});

test('Tests that the active wallet reads as a wallet when the bridge names one.', async () => {
  bridge.walletsInfo.mockResolvedValueOnce(
    JSON.stringify({
      active: 'a',
      wallets: [{ id: 'a', hasFile: true, meta: meta('a') }],
    }),
  );

  const result = await walletsOnDevice();

  expect(result).toEqual({
    ok: true,
    value: {
      active: { kind: 'wallet', id: 'a' },
      wallets: [{ id: 'a', hasFile: true, meta: meta('a') }],
    },
  });
});

test('Tests that no active wallet reads as none when the bridge sends null.', async () => {
  bridge.walletsInfo.mockResolvedValueOnce('{"active":null,"wallets":[]}');

  const result = await walletsOnDevice();

  expect(result.ok && result.value.active).toEqual({ kind: 'none' });
});

test('Tests that a reply that does not parse is an error when the bridge sends garbage.', async () => {
  bridge.walletsInfo.mockResolvedValueOnce('{');

  expect((await walletsOnDevice()).ok).toBe(false);
});

test('Tests that a delete reads true when either bridge confirms it.', async () => {
  bridge.deleteWalletProcess.mockResolvedValueOnce(true);
  expect(await deleteWallet('a')).toEqual({ ok: true, value: true });

  bridge.deleteWalletProcess.mockResolvedValueOnce('true');
  expect(await deleteWallet('a')).toEqual({ ok: true, value: true });

  bridge.deleteWalletProcess.mockResolvedValueOnce('false');
  expect(await deleteWallet('a')).toEqual({ ok: true, value: false });
});

test('Tests that the free space needs twice the largest wallet when that is above the floor.', () => {
  const largest = 300 * 1024 * 1024;

  expect(hasRoomForWallet({ free: 2 * largest, largest })).toBe(true);
  expect(hasRoomForWallet({ free: 2 * largest - 1, largest })).toBe(false);
});

test('Tests that the free space never goes under the floor when the wallets are small.', () => {
  expect(hasRoomForWallet({ free: MIN_FREE_BYTES, largest: 1 })).toBe(true);
  expect(hasRoomForWallet({ free: MIN_FREE_BYTES - 1, largest: 1 })).toBe(
    false,
  );
});
