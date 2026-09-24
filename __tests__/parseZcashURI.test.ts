import { Base64 } from 'js-base64';
import { ChainNameEnum, ServerType } from '@app/AppState';

// Mock Utils so the parser's `Utils.isValidAddress` call resolves to a
// controllable result without dragging the native RPC bridge into Jest.
jest.mock('@app/utils', () => ({
  __esModule: true,
  default: {
    isValidAddress: jest.fn(),
  },
}));

import parseZcashURI from '@app/uris/parseZcashURI';
import Utils from '@app/utils';

const mockIsValidAddress = Utils.isValidAddress as jest.Mock;

const mainnetServer: ServerType = {
  uri: 'https://mainnet.lightwalletd.com:9067',
  chainName: ChainNameEnum.mainChainName,
};

const VALID_ADDR = 't1validAddrPlaceholderForUnitTestsOnly';
const INVALID_ADDR = 'not-an-address';

// Audit Issue H — a failure result carries no target at all, so callers
// cannot prefill Send state with attacker-controlled values from a
// malformed URI. Audit Issue R — the parser fails fast and reports an
// ErrorKey, never locale prose.
describe('parseZcashURI — Issue H: failures carry no target', () => {
  beforeEach(() => {
    mockIsValidAddress.mockReset();
    mockIsValidAddress.mockResolvedValue({
      isValid: true,
      shieldedOnlyUA: '',
    });
  });

  test('valid path-as-address → paymentTarget populated', async () => {
    const r = await parseZcashURI(`zcash:${VALID_ADDR}`, mainnetServer);
    expect(r).toMatchObject({
      kind: 'paymentTarget',
      target: { address: VALID_ADDR },
    });
  });

  test('valid address + amount + memo → all populated', async () => {
    const memoB64 = Base64.encode('hello');
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?amount=0.1&memo=${memoB64}`,
      mainnetServer,
    );
    expect(r).toMatchObject({
      kind: 'paymentTarget',
      target: { address: VALID_ADDR, amount: 0.1, memoString: 'hello' },
    });
  });

  test('invalid path-as-address → error, and no target key at all', async () => {
    mockIsValidAddress.mockResolvedValue({
      isValid: false,
      shieldedOnlyUA: '',
    });
    const r = await parseZcashURI(`zcash:${INVALID_ADDR}`, mainnetServer);
    expect(r).toEqual({ kind: 'error', errorKey: 'uris.notvalid' });
    expect(Object.keys(r)).not.toContain('target');
  });

  test('invalid query-string address → error', async () => {
    mockIsValidAddress.mockResolvedValue({
      isValid: false,
      shieldedOnlyUA: '',
    });
    const r = await parseZcashURI(
      `zcash:?address=${INVALID_ADDR}`,
      mainnetServer,
    );
    expect(r).toEqual({ kind: 'error', errorKey: 'uris.notvalid' });
  });

  test('negative amount → amount error with the offending value', async () => {
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?amount=-1`,
      mainnetServer,
    );
    expect(r).toEqual({
      kind: 'error',
      errorKey: 'uris.amount',
      param: '-1',
    });
  });

  test('amount above 21,000,000 cap → amount error', async () => {
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?amount=21000001`,
      mainnetServer,
    );
    expect(r).toMatchObject({ kind: 'error', errorKey: 'uris.amount' });
  });

  test('unknown parameter → noparameter error naming it', async () => {
    const r = await parseZcashURI(`zcash:${VALID_ADDR}?foo=bar`, mainnetServer);
    expect(r).toEqual({
      kind: 'error',
      errorKey: 'uris.noparameter',
      param: 'foo',
    });
  });

  test('duplicate address (path + query both set address) → error', async () => {
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?address=${VALID_ADDR}`,
      mainnetServer,
    );
    expect(r).toEqual({
      kind: 'error',
      errorKey: 'uris.duplicateparameter',
      param: 'address',
    });
  });

  test('extra-dotted parameter (address.1.2) → error', async () => {
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?address.1.2=${VALID_ADDR}`,
      mainnetServer,
    );
    expect(r).toEqual({
      kind: 'error',
      errorKey: 'uris.notvalidparameter',
      param: 'address.1.2',
    });
  });

  test('empty URI → baduri error', async () => {
    const r = await parseZcashURI('', mainnetServer);
    expect(r).toEqual({ kind: 'error', errorKey: 'uris.baduri' });
  });

  test('non-zcash protocol → baduri error', async () => {
    const r = await parseZcashURI(`bitcoin:${VALID_ADDR}`, mainnetServer);
    expect(r).toEqual({ kind: 'error', errorKey: 'uris.baduri' });
  });

  test('zcash: without address but with amount → noaddress error', async () => {
    const r = await parseZcashURI('zcash:?amount=1', mainnetServer);
    expect(r).toEqual({ kind: 'error', errorKey: 'uris.noaddress' });
  });
});
