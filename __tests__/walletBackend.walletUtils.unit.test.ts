/**
 * The rewritten walletUtils seams (zingo-mobile#1151): the boolean
 * collapses and the price sentinels. A rejection must read as failure —
 * before the typed surface, it became "Error: ..." prose that a caller's
 * truthiness check misread as success.
 */
// Every member of the mocked bridge is a lazily created jest.fn, so a future
// import-time touch of some other RPCModule member cannot break this suite.
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
  fetchWallet,
  getZecPrice,
  isWalletAddress,
  parseZecQuote,
  resolvedTrue,
  walletExists,
} from '@app/walletBackend/utils/walletUtils';

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

describe('the existence probe contains rejections as false', () => {
  it('walletExists', async () => {
    bridge.walletExists.mockResolvedValueOnce('true');
    await expect(walletExists()).resolves.toBe(true);
    bridge.walletExists.mockResolvedValueOnce('false');
    await expect(walletExists()).resolves.toBe(false);
    bridge.walletExists.mockReturnValueOnce(typedRejection('Save', 'boom'));
    await expect(walletExists()).resolves.toBe(false);
  });
});

describe('parseZecQuote reads only a positive, finite price as a quote', () => {
  it('reads a real price as a quote', () => {
    expect(parseZecQuote('{"current_price": 42.5}')).toEqual({
      kind: 'zecPrice',
      usd: 42.5,
    });
  });

  it.each([
    ['an empty body', ''],
    ['an unparseable body', 'not json'],
    ['a null body', 'null'],
    ['a body without a price', '{}'],
    ['a null price', '{"current_price": null}'],
    ['a zero price', '{"current_price": 0}'],
    ['a negative price', '{"current_price": -1}'],
    ['a price written as a string', '{"current_price": "42.5"}'],
  ])('reads %s as a malformed payload', (_case, body) => {
    expect(parseZecQuote(body)).toMatchObject({
      kind: 'error',
      errorKey: 'info.error-price-payload',
    });
  });
});

describe('getZecPrice answers on one typed outcome channel', () => {
  it('a typed rejection fails under the fetch key', async () => {
    bridge.zecPriceInfo.mockReturnValueOnce(
      typedRejection('Indexer', 'oracle down'),
    );
    await expect(getZecPrice()).resolves.toEqual({
      kind: 'error',
      errorKey: 'info.error-price-fetch',
      param: 'oracle down',
    });
  });

  it('a resolved body is read by parseZecQuote', async () => {
    bridge.zecPriceInfo.mockResolvedValueOnce('{"current_price": 42.5}');
    await expect(getZecPrice()).resolves.toEqual(
      parseZecQuote('{"current_price": 42.5}'),
    );
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
    bridge.getUfvkInfo.mockResolvedValueOnce(
      '{"ufvk":"uview1...","birthday":42}',
    );
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
