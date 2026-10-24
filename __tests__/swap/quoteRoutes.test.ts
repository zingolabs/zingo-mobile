import { SwapService } from '@app/swap/SwapService';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapOperationEnum } from '@app/swap/enums/SwapErrorCategoryEnum';
import { SwapKitHttpError, SwapKitNetworkError } from '@app/swap/errors';
import { createDefaultProviderRegistry } from '@app/swap/providers/ProviderRegistry';
import type { SwapKitClient } from '@app/swap/SwapKitClient';
import { english } from '../../__mocks__/dataMocks/swap/englishText';
import type { SwapPoller } from '@app/swap/SwapPoller';
import type { SwapStore } from '@app/swap/SwapStore';
import type { TokenCatalog } from '@app/swap/TokenCatalog';
import type {
  QuoteResponseType,
  QuoteRouteType,
} from '@app/swap/types/QuoteResponseType';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';

/**
 * `quote()` projects SwapKit's routes into what the screen reads. Two of those
 * numbers are load-bearing: the fee total in the sell asset feeds the largest
 * amount the user is offered and the guard that refuses a commit, and the fee
 * total in the receive asset is the headline the user judges the route by.
 *
 * The arithmetic exists because SwapKit denominates fees inconsistently. Maya
 * quotes most of them in the destination asset, NEAR quotes almost everything
 * in the source asset, and a screen that showed only one side would print a
 * zero over fees the user is really paying.
 */

const ZEC: SwapAssetType = {
  swapKitId: 'ZEC.ZEC',
  chain: 'ZEC',
  symbol: 'ZEC',
  ticker: 'ZEC',
  chainId: 'zcash',
  decimals: 8,
};

const BTC: SwapAssetType = {
  swapKitId: 'BTC.BTC',
  chain: 'BTC',
  symbol: 'BTC',
  ticker: 'BTC',
  chainId: 'bitcoin',
  decimals: 8,
};

const serviceReturning = (response: QuoteResponseType) => {
  const quote = jest.fn(async () => response);
  const service = new SwapService({
    client: { quote } as unknown as SwapKitClient,
    registry: createDefaultProviderRegistry(),
    store: null as unknown as typeof SwapStore,
    poller: null as unknown as SwapPoller,
    tokenCatalog: null as unknown as TokenCatalog,
  });
  return { service, quote };
};

// 10 ZEC in, 1 BTC out, so the route's implied rate is 0.1 BTC per ZEC.
const route = (overrides: Partial<QuoteRouteType> = {}): QuoteRouteType => ({
  routeId: 'route-1',
  providers: [SwapKitProviderEnum.MayachainStreaming],
  expectedBuyAmount: '1',
  ...overrides,
});

const failing = (error: unknown) => {
  const quote = jest.fn(async () => {
    throw error;
  });
  return new SwapService({
    client: { quote } as unknown as SwapKitClient,
    registry: createDefaultProviderRegistry(),
    store: null as unknown as typeof SwapStore,
    poller: null as unknown as SwapPoller,
    tokenCatalog: null as unknown as TokenCatalog,
  });
};

const askForQuote = (service: SwapService) =>
  service.quote({
    sellAsset: ZEC,
    receiveAsset: BTC,
    sellAmountHumanDecimal: '10',
    sourceAddress: 't1ephemeral',
    destinationAddress: 'bc1qdestination',
  });

describe('route projection', () => {
  it('carries the amounts and the provider through', async () => {
    const { service } = serviceReturning({
      routes: [
        route({
          expectedBuyAmountMaxSlippage: '0.98',
          estimatedTime: { total: 630 },
        }),
      ],
    });

    const { routes } = await askForQuote(service);

    expect(routes).toHaveLength(1);
    expect(routes[0].provider).toBe(SwapKitProviderEnum.MayachainStreaming);
    expect(routes[0].expectedReceiveAmount).toBe('1');
    expect(routes[0].minReceiveAmount).toBe('0.98');
    // Rounded up to the minute, so a 10-and-a-half-minute route never reads as
    // ten.
    expect(routes[0].estimatedTimeText).toBe('~11 min');
  });

  // Named for what it is on the way in: SwapKit calls it totalSlippageBps,
  // and it is the route's all-in cost against market value, not a tolerance.
  it('carries the route cost against market value', async () => {
    const { service } = serviceReturning({
      routes: [route({ totalSlippageBps: -142.077722 })],
    });

    const { routes } = await askForQuote(service);

    expect(routes[0].costVsMarketBps).toBe(-142.077722);
  });

  it('leaves the cost undefined when the provider reports none', async () => {
    const { service } = serviceReturning({ routes: [route()] });

    const { routes } = await askForQuote(service);

    expect(routes[0].costVsMarketBps).toBeUndefined();
  });

  it('falls back to the expected amount when no slippage floor is quoted', async () => {
    const { service } = serviceReturning({ routes: [route()] });

    expect((await askForQuote(service)).routes[0].minReceiveAmount).toBe('1');
  });

  // Committing needs the per-route id. A route without one would fail at
  // /v3/swap, so dropping it beats offering it.
  it('drops a route with no routeId', async () => {
    const { service } = serviceReturning({
      routes: [route({ routeId: undefined })],
    });

    expect((await askForQuote(service)).routes).toHaveLength(0);
  });

  it('drops a route from a provider with no executor', async () => {
    const { service } = serviceReturning({
      routes: [route({ providers: [SwapKitProviderEnum.Chainflip] })],
    });

    expect((await askForQuote(service)).routes).toHaveLength(0);
  });

  it('keeps the routable options when one of several is unroutable', async () => {
    const { service } = serviceReturning({
      routes: [
        route({ routeId: 'bad', providers: [SwapKitProviderEnum.Chainflip] }),
        route({ routeId: 'good', providers: [SwapKitProviderEnum.Near] }),
      ],
    });

    const { routes } = await askForQuote(service);
    expect(routes.map(r => r.routeId)).toEqual(['good']);
  });

  it('reads the expiry as seconds and hands back milliseconds', async () => {
    const { service } = serviceReturning({
      routes: [route({ expiration: '1800000000' })],
    });

    expect((await askForQuote(service)).routes[0].expiresAtMs).toBe(
      1_800_000_000_000,
    );
  });

  it('leaves the expiry unset when SwapKit sends something unreadable', async () => {
    const { service } = serviceReturning({
      routes: [route({ expiration: 'soon' })],
    });

    expect((await askForQuote(service)).routes[0].expiresAtMs).toBeUndefined();
  });

  it('keeps tags only when they are the array of strings the screen expects', async () => {
    const { service } = serviceReturning({
      routes: [
        route({ routeId: 'a', meta: { tags: ['RECOMMENDED', 'FASTEST'] } }),
        route({ routeId: 'b', meta: { tags: 'RECOMMENDED' } }),
        route({ routeId: 'c', meta: { tags: [1, 2] } }),
      ],
    });

    const { routes } = await askForQuote(service);
    expect(routes[0].tags).toEqual(['RECOMMENDED', 'FASTEST']);
    expect(routes[1].tags).toBeUndefined();
    expect(routes[2].tags).toBeUndefined();
  });

  it('joins warnings into one line for the screen', async () => {
    const { service } = serviceReturning({
      routes: [route({ warnings: ['slow', 'high slippage'] })],
    });

    expect((await askForQuote(service)).routes[0].warningsText).toBe(
      'slow; high slippage',
    );
  });
});

describe('fee aggregation', () => {
  it('totals fees already denominated in the receive asset', async () => {
    const { service } = serviceReturning({
      routes: [
        route({
          fees: [
            { type: 'liquidity', amount: '0.01', asset: 'BTC.BTC' },
            { type: 'outbound', amount: '0.005', asset: 'BTC.BTC' },
          ],
        }),
      ],
    });

    const { routes } = await askForQuote(service);
    expect(Number(routes[0].totalFeesInReceiveAsset)).toBeCloseTo(0.015, 10);
  });

  // The route's own implied rate does the conversion, so the fee shown carries
  // the same assumption the route is offering rather than a separate oracle's.
  it("converts a source-asset fee through the route's own rate", async () => {
    const { service } = serviceReturning({
      routes: [
        route({ fees: [{ type: 'inbound', amount: '1', asset: 'ZEC.ZEC' }] }),
      ],
    });

    const { routes } = await askForQuote(service);
    // 1 ZEC at 0.1 BTC per ZEC.
    expect(Number(routes[0].totalFeesInReceiveAsset)).toBeCloseTo(0.1, 10);
    expect(Number(routes[0].totalFeesInSellAsset)).toBeCloseTo(1, 10);
  });

  // The sell-side total is what the balance guard subtracts, so a fee quoted on
  // the destination side still has to reach it.
  it('converts a receive-asset fee back into the sell asset', async () => {
    const { service } = serviceReturning({
      routes: [
        route({
          fees: [{ type: 'liquidity', amount: '0.1', asset: 'BTC.BTC' }],
        }),
      ],
    });

    const { routes } = await askForQuote(service);
    // 0.1 BTC at 0.1 BTC per ZEC.
    expect(Number(routes[0].totalFeesInSellAsset)).toBeCloseTo(1, 10);
  });

  it("counts only the bridge's own cut in the bridge totals", async () => {
    const { service } = serviceReturning({
      routes: [
        route({
          fees: [
            { type: 'liquidity', amount: '0.01', asset: 'BTC.BTC' },
            { type: 'affiliate', amount: '0.002', asset: 'BTC.BTC' },
            { type: 'service', amount: '0.003', asset: 'BTC.BTC' },
          ],
        }),
      ],
    });

    const { routes } = await askForQuote(service);
    expect(Number(routes[0].totalFeesInReceiveAsset)).toBeCloseTo(0.015, 10);
    expect(Number(routes[0].bridgeFeesInReceiveAsset)).toBeCloseTo(0.005, 10);
  });

  // Amplifying a fee by a rate derived from a zero amount would print a
  // number with nothing behind it, so those fees are dropped instead.
  it('drops a converted fee when the route quotes no buy amount', async () => {
    const { service } = serviceReturning({
      routes: [
        route({
          expectedBuyAmount: '0',
          fees: [{ type: 'inbound', amount: '1', asset: 'ZEC.ZEC' }],
        }),
      ],
    });

    const { routes } = await askForQuote(service);
    expect(routes[0].totalFeesInReceiveAsset).toBe('0');
  });

  it('ignores a fee in a third asset it has no rate for', async () => {
    const { service } = serviceReturning({
      routes: [
        route({ fees: [{ type: 'inbound', amount: '5', asset: 'ETH.ETH' }] }),
      ],
    });

    const { routes } = await askForQuote(service);
    expect(routes[0].totalFeesInReceiveAsset).toBe('0');
  });

  it('reports no fees as zero rather than as nothing', async () => {
    const { service } = serviceReturning({ routes: [route({ fees: [] })] });

    expect((await askForQuote(service)).routes[0].totalFeesInReceiveAsset).toBe(
      '0',
    );
  });

  it('keeps the raw fees so the breakdown can show each in its own asset', async () => {
    const fees = [{ type: 'liquidity', amount: '0.01', asset: 'BTC.BTC' }];
    const { service } = serviceReturning({ routes: [route({ fees })] });

    expect((await askForQuote(service)).routes[0].feesRaw).toEqual(fees);
  });
});

describe('a refusal that means no route', () => {
  // The shape a small amount produces. It arrives as a thrown HTTP error while
  // the 200 answer for the same condition arrives as data, and only the second
  // was ever explained to the user.
  const noRoutes404 = (body: unknown) =>
    new SwapKitHttpError({
      operation: SwapOperationEnum.Quote,
      httpStatus: 404,
      body: JSON.stringify(body),
    });

  it("turns SwapKit's 404 into the empty quote its 200 would have been", async () => {
    const { routes, rawResponse } = await askForQuote(
      failing(
        noRoutes404({
          message: 'No routes found for NEAR.USDC -> ZEC.ZEC',
          error: 'noRoutesFound',
        }),
      ),
    );

    expect(routes).toEqual([]);
    expect(rawResponse.routes).toEqual([]);
  });

  // The caller reads the minimum off `providerErrors`, so a 404 that carries
  // them still names the amount that would work.
  it('keeps the provider errors when the refusal carries them', async () => {
    const { rawResponse } = await askForQuote(
      failing(
        noRoutes404({
          error: 'noRoutesFound',
          providerErrors: [
            {
              provider: 'NEAR',
              errorCode: 'sellAssetAmountTooSmall',
              minAmount: '0.01068069',
            },
          ],
        }),
      ),
    );

    expect(rawResponse.providerErrors).toEqual([
      {
        provider: 'NEAR',
        errorCode: 'sellAssetAmountTooSmall',
        minAmount: '0.01068069',
      },
    ]);
  });

  it('leaves the provider errors out rather than inventing them', async () => {
    const { rawResponse } = await askForQuote(
      failing(noRoutes404({ error: 'noRoutesFound' })),
    );

    expect(rawResponse.providerErrors).toBeUndefined();
  });

  it('survives a refusal whose body is not JSON', async () => {
    const error = new SwapKitHttpError({
      operation: SwapOperationEnum.Quote,
      httpStatus: 404,
      body: 'no route',
    });

    await expect(askForQuote(failing(error))).resolves.toMatchObject({
      routes: [],
    });
  });

  // The half that matters most. Only the refusal the classifier already calls
  // NoQuoteOrLiquidity is read as an answer; everything else is still a fault
  // and still reaches the user as one.
  it('still throws a rejected key', async () => {
    const error = new SwapKitHttpError({
      operation: SwapOperationEnum.Quote,
      httpStatus: 403,
      body: JSON.stringify({ message: 'Invalid API key' }),
    });

    await expect(askForQuote(failing(error))).rejects.toThrow(
      /Invalid API key/,
    );
  });

  it('still throws when the provider is down', async () => {
    const error = new SwapKitHttpError({
      operation: SwapOperationEnum.Quote,
      httpStatus: 503,
      body: '',
    });

    await expect(askForQuote(failing(error))).rejects.toThrow(/503/);
  });

  it('still throws a transport failure', async () => {
    const error = new SwapKitNetworkError(
      SwapOperationEnum.Quote,
      new Error('socket hang up'),
    );

    await expect(askForQuote(failing(error))).rejects.toThrow(/socket hang up/);
  });

  it('still throws anything that is not a SwapKit error at all', async () => {
    await expect(askForQuote(failing(new Error('boom')))).rejects.toThrow(
      'boom',
    );
  });
});

describe('slippage', () => {
  // SwapKit reads a percentage. Sending basis points would ask for 100% and
  // take whatever came back.
  it('sends basis points to SwapKit as a percentage', async () => {
    const { service, quote } = serviceReturning({ routes: [] });

    await service.quote({
      sellAsset: ZEC,
      receiveAsset: BTC,
      sellAmountHumanDecimal: '10',
      sourceAddress: 't1ephemeral',
      destinationAddress: 'bc1qdestination',
      slippageBps: 250,
    });

    expect(quote).toHaveBeenCalledWith(
      expect.objectContaining({ slippage: 2.5 }),
    );
  });

  it('leaves slippage out entirely when the caller names none', async () => {
    const { service, quote } = serviceReturning({ routes: [] });

    await askForQuote(service);

    expect(quote).toHaveBeenCalledWith(
      expect.objectContaining({ slippage: undefined }),
    );
  });
});

describe('providers that returned nothing', () => {
  // The screen shows a single route and no way to tell whether the others do
  // not trade the pair or merely want a larger amount. The quote already
  // carries the answer; before this it was read only when there were no
  // routes at all.
  it('reports the refusals beside the routes, not only instead of them', async () => {
    const { service } = serviceReturning({
      routes: [route({ providers: [SwapKitProviderEnum.Near] })],
      providerErrors: [
        {
          provider: 'MAYACHAIN_STREAMING',
          errorCode: 'sellAssetAmountTooSmall',
          minAmount: '0.42',
        },
      ],
    });

    const { routes, unavailable } = await askForQuote(service);

    expect(routes.map(r => r.provider)).toEqual([SwapKitProviderEnum.Near]);
    expect(
      unavailable.map(row => ({ ...row, reason: english(row.reason) })),
    ).toEqual([
      {
        provider: SwapKitProviderEnum.MayachainStreaming,
        reason: 'Needs at least 0.42 ZEC.',
      },
      {
        provider: SwapKitProviderEnum.ThorchainStreaming,
        reason: 'Does not trade this pair.',
      },
      {
        provider: SwapKitProviderEnum.Flashnet,
        reason: 'Does not trade this pair.',
      },
    ]);
  });

  // A 404 is the same answer in a different envelope, and the list it feeds is
  // the same list.
  it('reports them for a refusal that arrived as a 404', async () => {
    const { unavailable } = await askForQuote(
      failing(
        new SwapKitHttpError({
          operation: SwapOperationEnum.Quote,
          httpStatus: 404,
          body: JSON.stringify({
            error: 'noRoutesFound',
            providerErrors: [
              {
                provider: 'NEAR',
                errorCode: 'sellAssetAmountTooSmall',
                minAmount: '0.01068069',
              },
            ],
          }),
        }),
      ),
    );

    expect(
      unavailable.map(row => ({ ...row, reason: english(row.reason) })),
    ).toContainEqual({
      provider: SwapKitProviderEnum.Near,
      reason: 'Needs at least 0.01068069 ZEC.',
    });
  });
});
