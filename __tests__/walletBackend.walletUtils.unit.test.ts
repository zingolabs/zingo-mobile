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
  classifyPriceFetch,
  fetchWallet,
  getZecPrice,
  isWalletAddress,
  PRICE_FETCH_TIMEOUT_MS,
  resolvedTrue,
  restoreExistingWalletBackup,
  walletBackupExists,
  walletExists,
} from '../app/walletBackend/utils/walletUtils';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const typedRejection = (code: string, message: string) => {
  const rejection = Promise.reject(Object.assign(new Error(message), { code }));
  // Mark handled immediately so a fake-timer flush in an unrelated test
  // never reports it as an unhandled rejection; consumers still observe
  // the rejection when they await.
  rejection.catch(() => {});
  return rejection;
};

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

describe('classifyPriceFetch is pure and total over every failure mode', () => {
  const settled = (decoded: object) =>
    ({ kind: 'settled', decoded, elapsedMs: 7 }) as Parameters<
      typeof classifyPriceFetch
    >[0];

  it('the watchdog arm classifies as timedOut', () => {
    expect(
      classifyPriceFetch({ kind: 'watchdogTimedOut', afterMs: 25_000 }),
    ).toEqual({ kind: 'timedOut', afterMs: 25_000 });
  });

  it('a typed rejection carries its variant code and timing through', () => {
    expect(
      classifyPriceFetch(
        settled({ kind: 'ffiRejection', code: 'Indexer', message: 'down' }),
      ),
    ).toEqual({
      kind: 'ffiRejection',
      code: 'Indexer',
      message: 'down',
      elapsedMs: 7,
    });
  });

  it('empty and unparseable payloads are malformed, payload preserved', () => {
    expect(classifyPriceFetch(settled({ kind: 'emptyPayload' }))).toEqual({
      kind: 'malformedPayload',
      payload: '',
      detail: 'empty payload',
      elapsedMs: 7,
    });
    expect(
      classifyPriceFetch(
        settled({ kind: 'malformedPayload', payload: 'x', detail: 'bad' }),
      ),
    ).toEqual({
      kind: 'malformedPayload',
      payload: 'x',
      detail: 'bad',
      elapsedMs: 7,
    });
  });

  it('an { error } body is the oracle reporting failure', () => {
    expect(
      classifyPriceFetch(
        settled({ kind: 'json', value: { error: 'no feed' }, raw: '{}' }),
      ),
    ).toEqual({ kind: 'oracleError', error: 'no feed', elapsedMs: 7 });
  });

  it('a body without a price is noData, not an error', () => {
    expect(
      classifyPriceFetch(settled({ kind: 'json', value: {}, raw: '{}' })),
    ).toEqual({ kind: 'noData', elapsedMs: 7 });
  });

  it('a non-object json payload is malformed', () => {
    expect(
      classifyPriceFetch(settled({ kind: 'json', value: 3, raw: '3' })),
    ).toEqual({
      kind: 'malformedPayload',
      payload: '3',
      detail: 'non-object payload',
      elapsedMs: 7,
    });
  });

  it('a real price carries its route attestation and timing', () => {
    expect(
      classifyPriceFetch(
        settled({
          kind: 'json',
          value: { current_price: 42.5, via_socks5: '127.0.0.1:1080' },
          raw: '',
        }),
      ),
    ).toEqual({
      kind: 'price',
      usd: 42.5,
      route: { kind: 'attested', viaSocks5: '127.0.0.1:1080' },
      elapsedMs: 7,
    });
  });

  it('a pre-attestation native layer is its own named case, never a bare null', () => {
    expect(
      classifyPriceFetch(
        settled({ kind: 'json', value: { current_price: 42.5 }, raw: '' }),
      ),
    ).toEqual({
      kind: 'price',
      usd: 42.5,
      route: { kind: 'preAttestationNativeLayer' },
      elapsedMs: 7,
    });
  });
});

describe('getZecPrice, the effect shell', () => {
  it('threads a real fetch through the classifier', async () => {
    bridge.zecPriceInfo.mockResolvedValueOnce(
      '{"current_price": 42.5, "via_socks5": "127.0.0.1:1080"}',
    );
    await expect(getZecPrice()).resolves.toMatchObject({
      kind: 'price',
      usd: 42.5,
      route: { kind: 'attested', viaSocks5: '127.0.0.1:1080' },
    });
  });

  it('the watchdog releases a hung native call as timedOut', async () => {
    jest.useFakeTimers();
    // The on-device hang this bounds: a native call that never settles.
    bridge.zecPriceInfo.mockReturnValueOnce(new Promise(() => {}));
    const pending = getZecPrice();
    await jest.advanceTimersByTimeAsync(PRICE_FETCH_TIMEOUT_MS);
    await expect(pending).resolves.toEqual({
      kind: 'timedOut',
      afterMs: PRICE_FETCH_TIMEOUT_MS,
    });
    jest.useRealTimers();
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
