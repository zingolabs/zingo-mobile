/**
 * The rewritten walletUtils seams (zingo-mobile#1151): the boolean
 * collapses, the price sentinels, and the backup-restore path. The
 * regression pinned hardest here: a rejected restoreExistingWalletBackup
 * must read as failure — before the typed surface, the rejection became
 * "Error: ..." prose that the caller's truthiness check misread as
 * success and opened a wallet that was never restored.
 */
// Every member of the mocked bridge is a lazily created jest.fn, so a future
// import-time touch of some other RPCModule member cannot break this suite.
jest.mock('../app/RPCModule', () => {
  const members: Record<PropertyKey, jest.Mock> = {};
  return {
    __esModule: true,
    default: new Proxy(members, {
      get: (target, prop) => (target[prop] ??= jest.fn()),
    }),
  };
});

import RPCModule from '../app/RPCModule';
import {
  fetchWallet,
  getZecPrice,
  isWalletAddress,
  resolvedTrue,
  restoreExistingWalletBackup,
  walletBackupExists,
  walletExists,
} from '../app/walletBackend/utils/walletUtils';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const typedRejection = (code: string, message: string) =>
  Promise.reject(Object.assign(new Error(message), { code }));

describe('resolvedTrue collapses the native "true"/"false" protocol', () => {
  it('is true only for a successful, truthy, non-"false" resolution', () => {
    expect(resolvedTrue({ ok: true, value: 'true' })).toBe(true);
    expect(resolvedTrue({ ok: true, value: 'false' })).toBe(false);
    expect(resolvedTrue({ ok: true, value: '' })).toBe(false);
    expect(
      resolvedTrue({ ok: false, error: { code: 'Save', message: 'boom' } }),
    ).toBe(false);
  });

  it('never mistakes rejection prose for success', () => {
    // The exact shape of the old bug: the wrapper used to resolve
    // "Error: ..." prose, which is truthy and not "false".
    expect(
      resolvedTrue({
        ok: false,
        error: { code: 'Unknown', message: 'Error: could not read wallet' },
      }),
    ).toBe(false);
  });
});

describe('the backup-restore regression (the latent bug)', () => {
  it('a rejected restore crosses as ok:false, never as resolved prose', async () => {
    bridge.restoreExistingWalletBackup.mockReturnValueOnce(
      typedRejection('Unknown', 'Error: could not read the backup'),
    );
    const result = await restoreExistingWalletBackup();
    expect(result.ok).toBe(false);
    expect(resolvedTrue(result)).toBe(false);
  });

  it('a "false" restore resolution reads as failure', async () => {
    bridge.restoreExistingWalletBackup.mockResolvedValueOnce('false');
    expect(resolvedTrue(await restoreExistingWalletBackup())).toBe(false);
  });

  it('only a "true" restore resolution reads as success', async () => {
    bridge.restoreExistingWalletBackup.mockResolvedValueOnce('true');
    expect(resolvedTrue(await restoreExistingWalletBackup())).toBe(true);
  });
});

describe('the existence probes contain rejections as false', () => {
  it.each([
    ['walletExists', 'walletExists', walletExists],
    ['walletBackupExists', 'walletBackupExists', walletBackupExists],
  ])('%s', async (_name, member, probe) => {
    bridge[member].mockResolvedValueOnce('true');
    await expect(probe()).resolves.toBe(true);
    bridge[member].mockResolvedValueOnce('false');
    await expect(probe()).resolves.toBe(false);
    bridge[member].mockReturnValueOnce(typedRejection('Save', 'boom'));
    await expect(probe()).resolves.toBe(false);
  });
});

describe('getZecPrice discriminates every outcome as a typed variant', () => {
  it('a typed rejection carries its variant code through', async () => {
    bridge.zecPriceInfo.mockReturnValueOnce(
      typedRejection('Indexer', 'oracle down'),
    );
    await expect(getZecPrice()).resolves.toEqual({
      kind: 'ffiRejection',
      code: 'Indexer',
      message: 'oracle down',
    });
  });

  it('an empty resolution is a malformed payload', async () => {
    bridge.zecPriceInfo.mockResolvedValueOnce('');
    await expect(getZecPrice()).resolves.toMatchObject({
      kind: 'malformedPayload',
      payload: '',
    });
  });

  it('an { error } body is the oracle reporting failure', async () => {
    bridge.zecPriceInfo.mockResolvedValueOnce('{"error":"no feed"}');
    await expect(getZecPrice()).resolves.toEqual({
      kind: 'oracleError',
      error: 'no feed',
    });
  });

  it('a body without a price is noData, not an error', async () => {
    bridge.zecPriceInfo.mockResolvedValueOnce('{}');
    await expect(getZecPrice()).resolves.toEqual({ kind: 'noData' });
  });

  it('an unparseable body is a malformed payload carrying the payload', async () => {
    bridge.zecPriceInfo.mockResolvedValueOnce('not json');
    await expect(getZecPrice()).resolves.toMatchObject({
      kind: 'malformedPayload',
      payload: 'not json',
    });
  });

  it('a real price crosses the data channel', async () => {
    bridge.zecPriceInfo.mockResolvedValueOnce('{"current_price": 42.5}');
    await expect(getZecPrice()).resolves.toEqual({
      kind: 'price',
      usd: 42.5,
    });
  });
});

describe('isWalletAddress conservatively answers false on any failure', () => {
  it('true only when the wallet claims the address', async () => {
    bridge.checkMyAddressInfo.mockResolvedValueOnce(
      '{"is_wallet_address": true}',
    );
    await expect(isWalletAddress('u1...')).resolves.toBe(true);
  });

  it.each([
    ['a typed rejection', typedRejection('InvalidInput', 'bad address')],
    ['an empty resolution', Promise.resolve('')],
    ['an unparseable body', Promise.resolve('not json')],
    ['a non-true claim', Promise.resolve('{"is_wallet_address": "yes"}')],
  ])('%s reads as external', async (_case, native) => {
    bridge.checkMyAddressInfo.mockReturnValueOnce(native);
    await expect(isWalletAddress('u1...')).resolves.toBe(false);
  });
});

describe('fetchWallet returns null on any failure', () => {
  it('returns the seed material on success', async () => {
    bridge.getSeedInfo.mockResolvedValueOnce(
      '{"seed_phrase":"a b c","birthday":42}',
    );
    await expect(fetchWallet(false)).resolves.toEqual({
      seed: 'a b c',
      birthday: 42,
    });
  });

  it('returns the viewing key material on success', async () => {
    bridge.getUfvkInfo.mockResolvedValueOnce('{"ufvk":"uview1...","birthday":42}');
    await expect(fetchWallet(true)).resolves.toEqual({
      ufvk: 'uview1...',
      birthday: 42,
    });
  });

  it.each([
    ['a typed rejection', typedRejection('Read', 'boom')],
    ['an unparseable body', Promise.resolve('not json')],
    ['an empty resolution', Promise.resolve('')],
  ])('%s yields null, never prose', async (_case, native) => {
    bridge.getSeedInfo.mockReturnValueOnce(native);
    await expect(fetchWallet(false)).resolves.toBeNull();
  });
});
