import { Base64 } from 'js-base64';
import { ChainNameEnum, GlobalConst, ServerType } from '../app/AppState';

// Mock Utils so the parser's `Utils.isValidAddress` resolves to a
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

const keyEcho = (key: string) => key as never;

const mainnetServer: ServerType = {
  uri: 'https://mainnet.lightwalletd.com:9067',
  chainName: ChainNameEnum.mainChainName,
};

const VALID_ADDR = 't1validAddrPlaceholderForUnitTestsOnly';

// Audit Issue O — memo size limits must be applied to QR / deep-link
// inputs BEFORE the base64 is decoded into memory, and oversized memos
// must be rejected as a parser error rather than silently truncated.
describe('parseZcashURI — Issue O: memo bounds', () => {
  beforeEach(() => {
    mockIsValidAddress.mockReset();
    mockIsValidAddress.mockResolvedValue({
      isValid: true,
      onlyOrchardUA: '',
    });
  });

  test('valid small memo → populated, no error', async () => {
    const memo = 'hello';
    const memoB64 = Base64.encode(memo);
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?memo=${memoB64}`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).toBe('');
    expect(r.target.memoString).toBe(memo);
  });

  test('memo at the memoMaxLength boundary → populated, no error', async () => {
    // memoMaxLength bytes encode to `4 * ceil(memoMaxLength / 3)` base64 chars
    // (with padding) — this is the strict maximum a parseable memo can have.
    const exactMemo = 'A'.repeat(GlobalConst.memoMaxLength);
    const memoB64 = Base64.encode(exactMemo);
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?memo=${memoB64}`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).toBe('');
    expect(r.target.memoString).toBe(exactMemo);
    expect(r.target.memoString?.length).toBe(GlobalConst.memoMaxLength);
  });

  test('memo whose encoded length exceeds the bound → rejected before decode', async () => {
    // Any string longer than `4 * ceil(memoMaxLength / 3)` cannot decode to
    // a valid-length memo and must be rejected before allocating the
    // decoded buffer (the DoS surface the audit flagged).
    const maxBase64Length = 4 * Math.ceil(GlobalConst.memoMaxLength / 3);
    const oversized = 'A'.repeat(maxBase64Length + 100);
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?memo=${oversized}`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).not.toBe('');
    expect(r.error).toContain('uris.memo-too-long');
    expect(r.target.memoString).toBeUndefined();
  });

  test('oversized memo never silently truncates — empty memoString on reject', async () => {
    // Pre-fix behaviour: the parser would set target.memoString to the
    // first `memoMaxLength` bytes of the decoded buffer. Post-fix: nothing
    // gets assigned, so a malformed URI cannot smuggle a partial memo
    // into the Send screen state.
    const farTooLong = 'B'.repeat(10_000);
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?memo=${farTooLong}`,
      keyEcho,
      mainnetServer,
    );
    expect(r.error).not.toBe('');
    expect(r.target.memoString).toBeUndefined();
    expect(r.target.memoBase64).toBeUndefined();
  });
});
