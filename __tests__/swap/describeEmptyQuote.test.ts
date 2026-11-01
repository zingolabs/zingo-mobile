import { describeEmptyQuote as describeEmptyQuoteText } from '@app/swap/describeEmptyQuote';
import { swapRaw } from '@app/swap/swapText';
import { english } from '../../__mocks__/dataMocks/swap/englishText';

/** The sentence as the English app shows it. */
const describeEmptyQuote = (
  ...args: Parameters<typeof describeEmptyQuoteText>
) => english(describeEmptyQuoteText(...args));

import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import type { QuoteResponseType } from '@app/swap/types/QuoteResponseType';

const GENERIC = 'No route is available for this swap right now.';

const withErrors = (
  providerErrors: QuoteResponseType['providerErrors'],
): QuoteResponseType => ({
  routes: [],
  providerErrors,
});

describe('describeEmptyQuote', () => {
  it('falls back to the generic sentence when SwapKit explains nothing', () => {
    expect(describeEmptyQuote({ routes: [] }, 'ZEC')).toBe(GENERIC);
    expect(describeEmptyQuote(withErrors([]), 'ZEC')).toBe(GENERIC);
  });

  // The verbatim body from /v3/quote for ZEC.ZEC -> BTC.BTC at 0.01 ZEC, which
  // is the report that sent us looking for a bug that did not exist.
  it('quotes the minimum when every provider refuses the amount as too small', () => {
    const response = withErrors([
      {
        provider: 'FLASHNET',
        errorCode: 'sellAssetAmountTooSmall',
        message: 'Sell asset amount too small.',
      },
      {
        provider: 'MAYACHAIN_STREAMING',
        errorCode: 'sellAssetAmountTooSmall',
        message: 'Sell asset amount too',
      },
      {
        provider: 'NEAR',
        errorCode: 'sellAssetAmountTooSmall',
        message: 'Min amount is 0.01068069 ZEC.ZEC',
        minAmount: '0.01068069',
      },
    ]);
    expect(describeEmptyQuote(response, 'ZEC')).toBe(
      'That amount is too small. The smallest amount that routes right now is about 0.01068069 ZEC.',
    );
  });

  it('quotes the largest minimum, since a smaller one still leaves that provider refusing', () => {
    const response = withErrors([
      {
        provider: 'NEAR',
        errorCode: 'sellAssetAmountTooSmall',
        minAmount: '0.01068069',
      },
      {
        provider: 'FLASHNET',
        errorCode: 'sellAssetAmountTooSmall',
        minAmount: '0.5',
      },
    ]);
    expect(describeEmptyQuote(response, 'ZEC')).toContain('0.5 ZEC');
  });

  it('says the amount is too small even when no provider states a number', () => {
    const response = withErrors([
      { provider: 'FLASHNET', errorCode: 'sellAssetAmountTooSmall' },
      { provider: 'NEAR', errorCode: 'sellAssetAmountTooSmall' },
    ]);
    expect(describeEmptyQuote(response, 'ZEC')).toBe(
      'That amount is below the minimum every provider accepts for this pair.',
    );
  });

  it('does not blame the amount when the providers disagree on why', () => {
    const response = withErrors([
      {
        provider: 'NEAR',
        errorCode: 'sellAssetAmountTooSmall',
        minAmount: '0.01',
      },
      { provider: 'FLASHNET', errorCode: 'noLiquidity' },
    ]);
    expect(describeEmptyQuote(response, 'ZEC')).toBe(GENERIC);
  });

  it('ignores unusable minimums rather than quoting a nonsense figure', () => {
    const response = withErrors([
      {
        provider: 'NEAR',
        errorCode: 'sellAssetAmountTooSmall',
        minAmount: 'not-a-number',
      },
      {
        provider: 'FLASHNET',
        errorCode: 'sellAssetAmountTooSmall',
        minAmount: '0',
      },
    ]);
    expect(describeEmptyQuote(response, 'ZEC')).toBe(
      'That amount is below the minimum every provider accepts for this pair.',
    );
  });
});

describe('describeEmptyQuote without a ticker', () => {
  // TokenEntryType declares `ticker` as present and the live catalog omits it,
  // so the inbound direction can reach here with nothing to name the unit.
  it("omits the unit rather than printing 'undefined'", () => {
    const response: QuoteResponseType = {
      routes: [],
      providerErrors: [
        {
          provider: 'NEAR',
          errorCode: 'sellAssetAmountTooSmall',
          minAmount: '0.01068069',
        },
      ],
    };
    const message = describeEmptyQuote(response, undefined);
    expect(message).toBe(
      'That amount is too small. The smallest amount that routes right now is about 0.01068069.',
    );
    expect(message).not.toContain('undefined');
  });
});

describe("describeEmptyQuote — with each provider's reason", () => {
  // ZEC -> USDT on BSC at 0.05 ZEC: NEAR's dollar minimum and a Flashnet that
  // could not price it, which used to read as a bare "no route".
  it('follows the sentence with one line per provider', () => {
    const response = withErrors([
      {
        provider: 'FLASHNET',
        errorCode: 'quoteError',
        message: 'estimate_unavailable',
      },
      {
        provider: 'NEAR',
        errorCode: 'quoteError',
        message: 'Temporary swap limits: minimum swap amount is $1,000',
      },
    ]);
    const unavailable = [
      {
        provider: SwapKitProviderEnum.Near,
        reason: swapRaw('Needs at least $1,000 for this swap right now.'),
      },
      {
        provider: SwapKitProviderEnum.Flashnet,
        reason: swapRaw('Could not price this swap right now.'),
      },
    ];
    expect(describeEmptyQuote(response, 'ZEC', unavailable)).toBe(
      [
        GENERIC,
        'NEAR: Needs at least $1,000 for this swap right now.',
        'Flashnet: Could not price this swap right now.',
      ].join('\n'),
    );
  });

  it('keeps the bare sentence when no provider is named', () => {
    expect(
      describeEmptyQuote(
        withErrors([{ provider: 'NEAR', errorCode: 'x' }]),
        'ZEC',
        [],
      ),
    ).toBe(GENERIC);
  });
});
