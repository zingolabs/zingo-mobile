import { Base64 } from 'js-base64';
import { ChainNameEnum, ServerType } from '../app/AppState';

// Mock Utils so the parser's `Utils.isValidAddress` call resolves to a
// controllable result without dragging the native RPC bridge into Jest.
jest.mock('../app/utils', () => ({
  __esModule: true,
  default: {
    isValidAddress: jest.fn(),
  },
}));

import parseZcashURI from '../app/uris/parseZcashURI';
import Utils from '../app/utils';

const mockIsValidAddress = Utils.isValidAddress as jest.Mock;

// Returns the translation key verbatim so each test can check which
// branch the parser took without depending on the actual locale string.
const keyEcho = (key: string) => key as never;

const mainnetServer: ServerType = {
  uri: 'https://mainnet.lightwalletd.com:9067',
  chainName: ChainNameEnum.mainChainName,
};

const VALID_ADDR = 't1validAddrPlaceholderForUnitTestsOnly';
const INVALID_ADDR = 'not-an-address';

// Audit Issue H — parseZcashURI must guarantee that when `error` is
// non-empty the returned `target` is empty, so callers cannot prefill
// Send state with attacker-controlled values from a malformed URI.
describe('parseZcashURI — Issue H: errors must yield empty target', () => {
  beforeEach(() => {
    mockIsValidAddress.mockReset();
    mockIsValidAddress.mockResolvedValue({
      isValid: true,
      shieldedOnlyUA: '',
    });
  });

  test('valid path-as-address → target populated, no error', async () => {
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).toBe('');
    expect(r.target.address).toBe(VALID_ADDR);
  });

  test('valid address + amount + memo → all populated, no error', async () => {
    const memoB64 = Base64.encode('hello');
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?amount=0.1&memo=${memoB64}`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).toBe('');
    expect(r.target.address).toBe(VALID_ADDR);
    expect(r.target.amount).toBe(0.1);
    expect(r.target.memoString).toBe('hello');
  });

  test('invalid path-as-address → empty target, error present', async () => {
    mockIsValidAddress.mockResolvedValue({
      isValid: false,
      shieldedOnlyUA: '',
    });
    const r = await parseZcashURI(
      `zcash:${INVALID_ADDR}`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).not.toBe('');
    expect(r.target.address).toBeUndefined();
    expect(r.target.amount).toBeUndefined();
    expect(r.target.memoString).toBeUndefined();
  });

  test('invalid query-string address → empty target', async () => {
    mockIsValidAddress.mockResolvedValue({
      isValid: false,
      shieldedOnlyUA: '',
    });
    const r = await parseZcashURI(
      `zcash:?address=${INVALID_ADDR}`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).not.toBe('');
    expect(r.target.address).toBeUndefined();
  });

  test('negative amount → empty target (address never leaks)', async () => {
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?amount=-1`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).not.toBe('');
    expect(r.target.address).toBeUndefined();
    expect(r.target.amount).toBeUndefined();
  });

  test('amount above 21,000,000 cap → empty target', async () => {
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?amount=21000001`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).not.toBe('');
    expect(r.target.address).toBeUndefined();
  });

  test('unknown parameter → empty target', async () => {
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?foo=bar`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).not.toBe('');
    expect(r.target.address).toBeUndefined();
  });

  test('duplicate address (path + query both set address) → empty target', async () => {
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?address=${VALID_ADDR}`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).not.toBe('');
    expect(r.target.address).toBeUndefined();
  });

  test('extra-dotted parameter (address.1.2) → empty target', async () => {
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?address.1.2=${VALID_ADDR}`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).not.toBe('');
    expect(r.target.address).toBeUndefined();
  });

  test('empty URI → baduri error, empty target', async () => {
    const r = await parseZcashURI('', keyEcho, mainnetServer);
    expect(r.error).toBe('uris.baduri');
    expect(r.target.address).toBeUndefined();
  });

  test('non-zcash protocol → baduri error, empty target', async () => {
    const r = await parseZcashURI(
      `bitcoin:${VALID_ADDR}`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).toBe('uris.baduri');
    expect(r.target.address).toBeUndefined();
  });

  test('zcash: without address but with amount → empty target', async () => {
    const r = await parseZcashURI('zcash:?amount=1', keyEcho, mainnetServer);
    expect(r.error).not.toBe('');
    expect(r.target.address).toBeUndefined();
  });
});
