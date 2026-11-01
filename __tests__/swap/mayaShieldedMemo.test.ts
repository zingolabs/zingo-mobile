import { swapHttpRequest } from '@app/swap/swapHttp';
import {
  fetchMayaShieldedMemoTarget,
  memoWithRefundAddress,
  shieldedMemoAddressFromSwap,
} from '@app/swap/mayaShieldedMemo';

jest.mock('@app/swap/swapHttp', () => ({ swapHttpRequest: jest.fn() }));

const http = swapHttpRequest as jest.MockedFunction<typeof swapHttpRequest>;

const VAULT = 't1bRYLAuvtUspdxYJmYSHtoHVYbzDNHpy6r';
const UA =
  'u1fcwchlpy2u0t9hdl8wcku8dmvrhwz6lk0jwj2z56ylxhacpn9jnx5sgftx8kv7s97ay37gc';

const zecEntry = (
  overrides: Record<string, unknown> = {},
  config: Record<string, unknown> = {},
) => ({
  chain: 'ZEC',
  address: VAULT,
  halted: false,
  shielded_memo_config: {
    unified_address: UA,
    uivk: 'uivk1',
    enabled: true,
    trial_decryption_enabled: true,
    ...config,
  },
  ...overrides,
});

const answer = (body: unknown, ok = true) =>
  http.mockResolvedValue({
    ok,
    status: ok ? 200 : 503,
    text: JSON.stringify(body),
  });

beforeEach(() => http.mockReset());

// The shape mayanode answered with on 2026-10-16.
describe('fetchMayaShieldedMemoTarget', () => {
  it('takes the vault and the memo address when Maya decrypts memos', async () => {
    answer([{ chain: 'BTC', address: 'bc1qvault' }, zecEntry()]);

    expect(await fetchMayaShieldedMemoTarget()).toEqual({
      vaultAddress: VAULT,
      unifiedAddress: UA,
    });
  });

  it.each([
    ['ZEC is halted', zecEntry({ halted: true })],
    ['the shielded memo is off', zecEntry({}, { enabled: false })],
    [
      'Maya is not decrypting memos',
      zecEntry({}, { trial_decryption_enabled: false }),
    ],
    ['there is no memo address', zecEntry({}, { unified_address: '' })],
    ['there is no config', zecEntry({ shielded_memo_config: undefined })],
  ])('says no when %s', async (_label, entry) => {
    answer([entry]);

    expect(await fetchMayaShieldedMemoTarget()).toBeNull();
  });

  it('says no when mayanode cannot be asked', async () => {
    answer({}, false);
    expect(await fetchMayaShieldedMemoTarget()).toBeNull();

    http.mockRejectedValue(new Error('offline'));
    expect(await fetchMayaShieldedMemoTarget()).toBeNull();
  });
});

describe('memoWithRefundAddress', () => {
  it('puts the refund address after the destination', () => {
    expect(memoWithRefundAddress('=:e:0xAA:0/1/0', 't1refund')).toBe(
      '=:e:0xAA/t1refund:0/1/0',
    );
    expect(
      memoWithRefundAddress('=:b:bc1qdest:12876:_/ts:5/0', 't1refund'),
    ).toBe('=:b:bc1qdest/t1refund:12876:_/ts:5/0');
  });

  it('keeps a refund address already there', () => {
    expect(memoWithRefundAddress('=:e:0xAA/t1other:0/1/0', 't1refund')).toBe(
      '=:e:0xAA/t1other:0/1/0',
    );
  });

  it('leaves alone a memo that is not a swap', () => {
    expect(memoWithRefundAddress('+:ZEC.ZEC:maya1', 't1refund')).toBeNull();
    expect(memoWithRefundAddress('=:e', 't1refund')).toBeNull();
  });
});

describe('shieldedMemoAddressFromSwap', () => {
  it("reads SwapKit's shieldedMemo.unifiedAddress", () => {
    expect(
      shieldedMemoAddressFromSwap({
        shieldedMemo: { unifiedAddress: UA, uivk: 'uivk1' },
      }),
    ).toBe(UA);
    expect(shieldedMemoAddressFromSwap({})).toBeUndefined();
  });
});
