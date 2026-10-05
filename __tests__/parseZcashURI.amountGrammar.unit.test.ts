import { ChainNameEnum, ServerType, remoteServer } from '@app/AppState';

jest.mock('@app/utils', () => ({
  __esModule: true,
  default: {
    isValidAddress: jest.fn(),
  },
}));

import parseZcashURI from '@app/uris/parseZcashURI';
import Utils from '@app/utils';

const mockIsValidAddress = jest.mocked(Utils.isValidAddress);

const mainnetServer: ServerType = remoteServer(
  'https://mainnet.lightwalletd.com:9067',
  ChainNameEnum.mainChainName,
);

const VALID_ADDR = 't1validAddrPlaceholderForUnitTestsOnly';

describe('parseZcashURI amount grammar', () => {
  beforeEach(() => {
    mockIsValidAddress.mockReset();
    mockIsValidAddress.mockResolvedValue({
      isValid: true,
      shieldedOnlyUA: '',
    });
  });

  test.each(['1,5', '12.5ZEC', '1e2', '1 000', '0x10', '.5', '1.', '+1'])(
    'Tests that the parser rejects the URI when the amount is %s.',
    async amount => {
      const r = await parseZcashURI(
        `zcash:${VALID_ADDR}?amount=${encodeURIComponent(amount)}`,
        mainnetServer,
      );
      expect(r).toEqual({
        kind: 'error',
        errorKey: 'uris.amount',
        param: amount,
      });
    },
  );

  test('Tests that the parser rejects the URI when the amount has nine decimals.', async () => {
    const r = await parseZcashURI(
      `zcash:${VALID_ADDR}?amount=0.123456789`,
      mainnetServer,
    );
    expect(r).toMatchObject({ kind: 'error', errorKey: 'uris.amount' });
  });

  test.each([
    ['1', 1],
    ['0.5', 0.5],
    ['0.00000001', 0.00000001],
    ['21000000', 21000000],
  ])(
    'Tests that the parser keeps the amount when it is the decimal %s.',
    async (amount, zec) => {
      const r = await parseZcashURI(
        `zcash:${VALID_ADDR}?amount=${amount}`,
        mainnetServer,
      );
      expect(r).toMatchObject({
        kind: 'paymentTarget',
        target: { amount: zec },
      });
    },
  );
});
