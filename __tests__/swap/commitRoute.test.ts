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
