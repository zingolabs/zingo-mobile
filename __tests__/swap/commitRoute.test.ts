import { SwapService } from '@app/swap/SwapService';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { createDefaultProviderRegistry } from '@app/swap/providers/ProviderRegistry';
import type { SwapKitClient } from '@app/swap/SwapKitClient';
import type { SwapPoller } from '@app/swap/SwapPoller';
import type { SwapStore } from '@app/swap/SwapStore';
import type { TokenCatalog } from '@app/swap/TokenCatalog';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';

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

const commit = (slippageBps?: number) => {
  const upsert = jest.fn(async () => undefined);
  const service = new SwapService({
    client: {
      swap: jest.fn(async () => ({
        tx: { to: 't1deposit' },
        inboundAddress: 't1deposit',
      })),
    } as unknown as SwapKitClient,
    registry: createDefaultProviderRegistry(),
    store: {
      getByRecordId: async () => null,
      upsert,
    } as unknown as typeof SwapStore,
    poller: { start: jest.fn() } as unknown as SwapPoller,
    tokenCatalog: null as unknown as TokenCatalog,
  });
  return service.commitRoute({
    quoteInput: {
      sellAsset: ZEC,
      receiveAsset: BTC,
      sellAmountHumanDecimal: '0.05',
      sourceAddress: 't1ephemeral',
      destinationAddress: 'bc1qdestination',
      slippageBps,
    },
    chosenRoute: {
      routeId: 'route-1',
      provider: SwapKitProviderEnum.Near,
      expectedReceiveAmount: '0.0005',
      minReceiveAmount: '0.00049',
    },
    direction: SwapDirectionEnum.Outbound,
    fiatValueBasis: {
      sellUsdUnitPrice: 1000,
      receiveUsdUnitPrice: 100000,
      capturedAt: 0,
    },
  });
};

/**
 * The tolerance a quote went out with is known only here, at the commit, and
 * nowhere afterwards. A refund investigation once needed it and it had not been
 * kept, so the provider's figure could not be checked against what was asked.
 */
describe('SwapService.commitRoute', () => {
  it('records the slippage tolerance the quote was requested with', async () => {
    const { record } = await commit(100);

    expect(record.requestedSlippageBps).toBe(100);
  });

  it('records nothing when the quote carried no tolerance', async () => {
    const { record } = await commit(undefined);

    expect(record.requestedSlippageBps).toBeUndefined();
  });
});

/**
 * The deadline is what ends a deposit that never comes, so the commit has to
 * keep it. The quote's expiry is the provider's own figure; a quote without
 * one gets the window, since a deposit with no end is the bug this guards.
 */
describe('SwapService.commitRoute deposit deadline', () => {
  const commitInbound = (expiresAtMs?: number) => {
    const service = new SwapService({
      client: {
        swap: jest.fn(async () => ({
          tx: { to: 'bc1qdeposit' },
          inboundAddress: 'bc1qdeposit',
        })),
      } as unknown as SwapKitClient,
      registry: createDefaultProviderRegistry(),
      store: {
        getByRecordId: async () => null,
        upsert: jest.fn(async () => undefined),
      } as unknown as typeof SwapStore,
      poller: { start: jest.fn() } as unknown as SwapPoller,
      tokenCatalog: null as unknown as TokenCatalog,
    });
    return service.commitRoute({
      quoteInput: {
        sellAsset: BTC,
        receiveAsset: ZEC,
        sellAmountHumanDecimal: '0.03',
        sourceAddress: 'bc1qrefund',
        destinationAddress: 't1ephemeral',
      },
      chosenRoute: {
        routeId: 'route-1',
        provider: SwapKitProviderEnum.Near,
        expectedReceiveAmount: '12.5',
        minReceiveAmount: '12.4',
        expiresAtMs,
      },
      direction: SwapDirectionEnum.Inbound,
      fiatValueBasis: {
        sellUsdUnitPrice: 100000,
        receiveUsdUnitPrice: 1000,
        capturedAt: 0,
      },
    });
  };

  it('keeps the quote’s expiry as the deposit deadline', async () => {
    const { record } = await commitInbound(1_800_000_000_000);

    expect(record.depositDeadlineMs).toBe(1_800_000_000_000);
  });

  it('gives a quote without an expiry the window from the commit', async () => {
    const { record } = await commitInbound(undefined);

    expect(record.depositDeadlineMs).toBe(record.createdAtMs + 15 * 60 * 1000);
  });

  it('leaves an outbound swap without a deadline', async () => {
    const { record } = await commit(100);

    expect(record.depositDeadlineMs).toBeUndefined();
  });
});
