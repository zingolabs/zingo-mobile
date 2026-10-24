import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { unavailableProviders as unavailableProvidersText } from '@app/swap/unavailableProviders';
import { english } from '../../__mocks__/dataMocks/swap/englishText';

/** The rows with their reasons as the English app shows them. */
const unavailableProviders = (
  ...args: Parameters<typeof unavailableProvidersText>
) =>
  unavailableProvidersText(...args).map(row => ({
    ...row,
    reason: english(row.reason),
  }));

import type { QuoteResponseType } from '@app/swap/types/QuoteResponseType';
import type { RouteOptionType } from '@app/swap/types/RouteOptionType';

const SUPPORTED = [
  SwapKitProviderEnum.MayachainStreaming,
  SwapKitProviderEnum.Near,
  SwapKitProviderEnum.Flashnet,
] as const;

const response = (
  providerErrors?: QuoteResponseType['providerErrors'],
): QuoteResponseType => ({
  routes: [],
  providerErrors,
});

const route = (provider: SwapKitProviderEnum): RouteOptionType =>
  ({ routeId: `route-${provider}`, provider }) as RouteOptionType;

describe('unavailableProviders', () => {
  // The case that prompted this: NEAR answers, the other two do not, and the
  // screen offered no way to tell an unsupported pair from an amount that is
  // merely too small.
  it('names the supported providers that returned no route', () => {
    const result = unavailableProviders({
      response: response([
        {
          provider: 'MAYACHAIN_STREAMING',
          errorCode: 'sellAssetAmountTooSmall',
          minAmount: '0.42',
        },
      ]),
      supported: SUPPORTED,
      routes: [route(SwapKitProviderEnum.Near)],
      sellAssetTicker: 'ZEC',
    });

    expect(result).toEqual([
      {
        provider: SwapKitProviderEnum.MayachainStreaming,
        reason: 'Needs at least 0.42 ZEC.',
      },
      {
        provider: SwapKitProviderEnum.Flashnet,
        reason: 'Does not trade this pair.',
      },
    ]);
  });

  // A provider that answered is not missing, whatever else the response says
  // about it.
  it('leaves out a provider that returned a route', () => {
    const result = unavailableProviders({
      response: response(),
      supported: SUPPORTED,
      routes: [
        route(SwapKitProviderEnum.Near),
        route(SwapKitProviderEnum.Flashnet),
      ],
    });

    expect(result.map(entry => entry.provider)).toEqual([
      SwapKitProviderEnum.MayachainStreaming,
    ]);
  });

  // SwapKit refuses on behalf of a dozen providers this wallet has no executor
  // for. Listing routes that could never have been taken teaches nothing.
  it('ignores refusals from providers this app cannot execute', () => {
    const result = unavailableProviders({
      response: response([
        {
          provider: 'THORCHAIN_STREAMING',
          errorCode: 'sellAssetAmountTooSmall',
          minAmount: '5',
        },
        { provider: 'UNISWAP_V3', message: 'unsupported chain' },
      ]),
      supported: [SwapKitProviderEnum.Near],
      routes: [route(SwapKitProviderEnum.Near)],
    });

    expect(result).toEqual([]);
  });

  // The minimum is the actionable half of the answer: this swap is available,
  // for a larger number.
  it('quotes the minimum without a unit when the asset has no ticker', () => {
    const result = unavailableProviders({
      response: response([
        {
          provider: 'NEAR',
          errorCode: 'sellAssetAmountTooSmall',
          minAmount: '0.01068069',
        },
      ]),
      supported: [SwapKitProviderEnum.Near],
      routes: [],
    });

    expect(result[0].reason).toBe('Needs at least 0.01068069.');
  });

  // An unreadable minimum formats as zero, which would otherwise claim the
  // provider accepts nothing at all.
  it('does not report a minimum it could not read', () => {
    const result = unavailableProviders({
      response: response([
        { provider: 'NEAR', errorCode: 'sellAssetAmountTooSmall' },
      ]),
      supported: [SwapKitProviderEnum.Near],
      routes: [],
      sellAssetTicker: 'ZEC',
    });

    expect(result[0].reason).toBe(
      "The amount is below this provider's minimum.",
    );
  });

  // Written for a developer rather than a user, but a specific sentence beats
  // a vague one and paraphrasing an unseen error code would be a guess.
  it("passes through the provider's own message for anything else", () => {
    const result = unavailableProviders({
      response: response([
        {
          provider: 'FLASHNET',
          errorCode: 'somethingNew',
          message: '  pool is paused  ',
        },
      ]),
      supported: [SwapKitProviderEnum.Flashnet],
      routes: [],
    });

    expect(result[0].reason).toBe('pool is paused');
  });

  // What Flashnet actually returned. A bare identifier is not prose, and
  // `rate_limited` on screen tells the user nothing they can read — least of
  // all that it is not about their swap and will likely pass.
  it('says what a rate-limited provider means', () => {
    const result = unavailableProviders({
      response: response([
        {
          provider: 'FLASHNET',
          errorCode: 'rate_limited',
          message: 'rate_limited',
        },
      ]),
      supported: [SwapKitProviderEnum.Flashnet],
      routes: [],
    });

    expect(result[0].reason).toBe(
      'The provider is refusing requests for the moment. The next quote may reach it.',
    );
  });

  // SwapKit writes its codes snake_case in one place and camelCase in another.
  it('reads a refusal code in either spelling', () => {
    const camel = unavailableProviders({
      response: response([{ provider: 'FLASHNET', errorCode: 'rateLimited' }]),
      supported: [SwapKitProviderEnum.Flashnet],
      routes: [],
    });
    const minimum = unavailableProviders({
      response: response([
        {
          provider: 'NEAR',
          errorCode: 'sell_asset_amount_too_small',
          minAmount: '2',
        },
      ]),
      supported: [SwapKitProviderEnum.Near],
      routes: [],
      sellAssetTicker: 'ZEC',
    });

    expect(camel[0].reason).toMatch(/refusing requests/);
    expect(minimum[0].reason).toBe('Needs at least 2.0 ZEC.');
  });

  // An identifier reaching the screen is the bug this closes. Anything not
  // recognised falls back to a sentence rather than printing the token.
  it('does not print a bare code it does not recognise', () => {
    const result = unavailableProviders({
      response: response([
        {
          provider: 'FLASHNET',
          errorCode: 'somethingNew',
          message: 'somethingNew',
        },
      ]),
      supported: [SwapKitProviderEnum.Flashnet],
      routes: [],
    });

    expect(result[0].reason).toBe('Not available for this swap right now.');
  });

  it('falls back to a plain sentence when the refusal says nothing useful', () => {
    const result = unavailableProviders({
      response: response([{ provider: 'FLASHNET', errorCode: 'somethingNew' }]),
      supported: [SwapKitProviderEnum.Flashnet],
      routes: [],
    });

    expect(result[0].reason).toBe('Not available for this swap right now.');
  });

  // The refusal has to reach the provider it belongs to even when SwapKit
  // shouts or whispers the name.
  it('matches a refusal to its provider whatever the casing', () => {
    const result = unavailableProviders({
      response: response([
        {
          provider: 'flashnet',
          errorCode: 'sellAssetAmountTooSmall',
          minAmount: '1',
        },
      ]),
      supported: [SwapKitProviderEnum.Flashnet],
      routes: [],
      sellAssetTicker: 'ZEC',
    });

    expect(result[0].reason).toBe('Needs at least 1.0 ZEC.');
  });
});

describe('unavailableProviders and routes this app cannot take', () => {
  // The failure mode this exists to end: SwapKit offers a route, no executor
  // handles it, and it vanishes. On screen that is identical to the provider
  // never having answered, so the gap goes unnoticed indefinitely.
  it('reports a route dropped for want of an executor', () => {
    const result = unavailableProviders({
      response: response(),
      supported: [SwapKitProviderEnum.Near],
      routes: [route(SwapKitProviderEnum.Near)],
      unsupportedRoutes: [route(SwapKitProviderEnum.Chainflip)],
    });

    expect(result).toEqual([
      {
        provider: SwapKitProviderEnum.Chainflip,
        reason: 'This wallet cannot swap through this provider yet.',
      },
    ]);
  });

  // The refusal is the more specific fact, and two rows for one provider would
  // contradict each other.
  it('prefers a stated refusal over the dropped-route note', () => {
    const result = unavailableProviders({
      response: response([
        {
          provider: 'FLASHNET',
          errorCode: 'sellAssetAmountTooSmall',
          minAmount: '1',
        },
      ]),
      supported: [SwapKitProviderEnum.Flashnet],
      routes: [],
      unsupportedRoutes: [route(SwapKitProviderEnum.Flashnet)],
      sellAssetTicker: 'ZEC',
    });

    expect(result).toEqual([
      {
        provider: SwapKitProviderEnum.Flashnet,
        reason: 'Needs at least 1.0 ZEC.',
      },
    ]);
  });
});

// The refusals a probe of ZEC -> USDT/USDC across 34 network/token pairs
// brought back (2026-09-18), as SwapKit wrote them.
describe('unavailableProviders — observed refusals', () => {
  const reasonFor = (
    error: NonNullable<QuoteResponseType['providerErrors']>[number],
  ) =>
    unavailableProviders({
      response: response([error]),
      supported: [SwapKitProviderEnum.Near, SwapKitProviderEnum.Flashnet],
      routes: [],
    }).find(
      row =>
        row.provider.toUpperCase() === (error.provider ?? '').toUpperCase(),
    )?.reason;

  // Under a generic code, in prose, with the endpoint in front: read as
  // anything else it became "no route", and nobody learnt a larger amount works.
  it("reads NEAR's dollar minimum", () => {
    expect(
      reasonFor({
        provider: 'NEAR',
        errorCode: 'quoteError',
        message:
          '1click.chaindefuser.com/v0/quote: Temporary swap limits: minimum swap amount is $1,000',
      }),
    ).toBe('Needs at least $1,000 for this swap right now.');
  });

  it('says Flashnet could not price the pair, and that it may come back', () => {
    expect(
      reasonFor({
        provider: 'FLASHNET',
        errorCode: 'quoteError',
        message: 'estimate_unavailable',
      }),
    ).toMatch(/Could not price this swap right now/);
  });

  it('names a lack of liquidity and an asset the provider rejects', () => {
    expect(
      reasonFor({
        provider: 'NEAR',
        errorCode: 'insufficientLiquidity',
        message: 'Insufficient liquidity for trade',
      }),
    ).toBe('Not enough liquidity for this swap right now.');
    expect(
      reasonFor({
        provider: 'NEAR',
        errorCode: 'invalidBuyAssetAddress',
        message: 'Invalid buyAssetAddress {"a":1}',
      }),
    ).toBe('Does not support this asset.');
  });

  it('drops the endpoint in front of other prose', () => {
    expect(
      reasonFor({
        provider: 'NEAR',
        errorCode: 'quoteError',
        message: '1click.chaindefuser.com/v0/quote: Pair paused',
      }),
    ).toBe('Pair paused');
  });
});
