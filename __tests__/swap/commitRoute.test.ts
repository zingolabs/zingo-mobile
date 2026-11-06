import { SwapService } from '@app/swap/SwapService';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { createDefaultProviderRegistry } from '@app/swap/providers/ProviderRegistry';
import type { SwapKitClient } from '@app/swap/SwapKitClient';
import type { SwapPoller } from '@app/swap/SwapPoller';
import type { SwapStore } from '@app/swap/SwapStore';
import type { TokenCatalog } from '@app/swap/TokenCatalog';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import { SwapKitHttpError } from '@app/swap/errors';
import { SwapOperationEnum } from '@app/swap/enums/SwapErrorCategoryEnum';

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
 * keep it: an internal 24 hours from the payment address, never shown.
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

  it('waits 12 hours from the commit', async () => {
    const { record } = await commitInbound(1_800_000_000_000);

    expect(record.depositDeadlineMs).toBe(
      record.createdAtMs + 12 * 60 * 60 * 1000,
    );
  });

  it('keeps the quote’s expiry, for a sale whose ZEC did not leave', async () => {
    const { record } = await commitInbound(1_800_000_000_000);

    expect(record.quoteExpiresAtMs).toBe(1_800_000_000_000);
  });

  it('leaves an outbound swap without a deadline', async () => {
    const { record } = await commit(100);

    expect(record.depositDeadlineMs).toBeUndefined();
  });
});

/**
 * Maya pays a purchase to a unified address of this wallet when the source
 * chain's memo can carry one, so the ZEC lands shielded. The route quoted to
 * the transparent address takes the new destination at `/v3/swap`.
 */
describe('SwapService.commitRoute purchase destination', () => {
  const UA = 'u1shielded';
  const ETH: SwapAssetType = {
    swapKitId: 'ETH.ETH',
    chain: 'ETH',
    symbol: 'ETH',
    ticker: 'ETH',
    chainId: '1',
    decimals: 18,
  };
  const tooLong = new SwapKitHttpError({
    operation: SwapOperationEnum.Swap,
    httpStatus: 400,
    body: JSON.stringify({
      message:
        "Destination address is too long for the source chain's memo limit; this route can't be built",
    }),
  });

  const commitPurchase = (args: {
    sellAsset?: SwapAssetType;
    provider?: SwapKitProviderEnum;
    swap?: jest.Mock;
    newShieldedAddress?: jest.Mock;
  }) => {
    const swap =
      args.swap ??
      jest.fn(async (params: { destinationAddress: string }) => ({
        inboundAddress: '0xvault',
        memo: `=:z:${params.destinationAddress}`,
      }));
    const newShieldedAddress =
      args.newShieldedAddress ?? jest.fn(async () => UA);
    const service = new SwapService({
      client: { swap } as unknown as SwapKitClient,
      registry: createDefaultProviderRegistry(),
      store: {
        getByRecordId: async () => null,
        upsert: jest.fn(async () => undefined),
      } as unknown as typeof SwapStore,
      poller: { start: jest.fn() } as unknown as SwapPoller,
      tokenCatalog: null as unknown as TokenCatalog,
      newShieldedAddress,
    });
    const committed = service.commitRoute({
      quoteInput: {
        sellAsset: args.sellAsset ?? ETH,
        receiveAsset: ZEC,
        sellAmountHumanDecimal: '0.01',
        sourceAddress: '0xrefund',
        destinationAddress: 't1ephemeral',
      },
      chosenRoute: {
        routeId: 'route-1',
        provider: args.provider ?? SwapKitProviderEnum.MayachainStreaming,
        expectedReceiveAmount: '0.0174',
        minReceiveAmount: '0.0169',
      },
      direction: SwapDirectionEnum.Inbound,
      fiatValueBasis: {
        sellUsdUnitPrice: 2000,
        receiveUsdUnitPrice: 1200,
        capturedAt: 0,
      },
    });
    return { committed, swap, newShieldedAddress };
  };

  it('Tests that the order names a new unified address when Maya buys from a chain whose memo fits it', async () => {
    const { committed, swap } = commitPurchase({});
    const { record } = await committed;

    expect(swap).toHaveBeenCalledTimes(1);
    expect(swap).toHaveBeenCalledWith(
      expect.objectContaining({ routeId: 'route-1', destinationAddress: UA }),
    );
    expect(record.destinationAddress).toBe(UA);
  });

  it('Tests that the order keeps the transparent address when the source chain is Bitcoin', async () => {
    const { committed, newShieldedAddress } = commitPurchase({
      sellAsset: BTC,
    });
    const { record } = await committed;

    expect(newShieldedAddress).not.toHaveBeenCalled();
    expect(record.destinationAddress).toBe('t1ephemeral');
  });

  it('Tests that the order keeps the transparent address when the provider is not Maya', async () => {
    const { committed, newShieldedAddress } = commitPurchase({
      provider: SwapKitProviderEnum.Near,
    });
    const { record } = await committed;

    expect(newShieldedAddress).not.toHaveBeenCalled();
    expect(record.destinationAddress).toBe('t1ephemeral');
  });

  it('Tests that the order falls back to the transparent address when SwapKit says the memo does not fit', async () => {
    const swap = jest
      .fn()
      .mockRejectedValueOnce(tooLong)
      .mockImplementation(async (params: { destinationAddress: string }) => ({
        inboundAddress: '0xvault',
        memo: `=:z:${params.destinationAddress}`,
      }));
    const { committed } = commitPurchase({ swap });
    const { record } = await committed;

    expect(swap).toHaveBeenCalledTimes(2);
    expect(swap).toHaveBeenLastCalledWith(
      expect.objectContaining({ destinationAddress: 't1ephemeral' }),
    );
    expect(record.destinationAddress).toBe('t1ephemeral');
  });

  it('Tests that the order falls back to the transparent address when the wallet makes no address', async () => {
    const { committed, swap } = commitPurchase({
      newShieldedAddress: jest.fn(async () => {
        throw new Error('wallet busy');
      }),
    });
    const { record } = await committed;

    expect(swap).toHaveBeenCalledTimes(1);
    expect(record.destinationAddress).toBe('t1ephemeral');
  });

  it('Tests that the commit fails when SwapKit refuses the shielded order for another reason', async () => {
    const swap = jest.fn(async () => {
      throw new Error('SwapKit swap HTTP 503: unavailable');
    });
    const { committed } = commitPurchase({ swap });

    await expect(committed).rejects.toThrow('503');
    expect(swap).toHaveBeenCalledTimes(1);
  });
});

describe('SwapService.commitRoute swapId', () => {
  const commitWith = (response: object) => {
    const service = new SwapService({
      client: {
        swap: jest.fn(async () => ({
          tx: { to: 't1deposit' },
          inboundAddress: 't1deposit',
          ...response,
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
        sellAsset: ZEC,
        receiveAsset: BTC,
        sellAmountHumanDecimal: '0.05',
        sourceAddress: 't1ephemeral',
        destinationAddress: 'bc1qdestination',
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

  it('Tests that the record keeps the order id when SwapKit names it', async () => {
    const { record } = await commitWith({ swapId: 'swap-uuid' });

    expect(record.swapKitInternalId).toBe('swap-uuid');
  });

  it('Tests that the record keeps the transient id when only that one is named', async () => {
    const { record } = await commitWith({ transient: { swapId: 'old-uuid' } });

    expect(record.swapKitInternalId).toBe('old-uuid');
  });
});

/**
 * A Maya payout to this wallet names the deposit it settles. The purchase
 * whose memo is that swap's takes it, and completes with the ZEC received.
 */
describe('SwapService.claimPayouts', () => {
  const HASH =
    '274A79A7383131BCB28D5D71415E9245D7FA83F1ABC1DE20BE4F40C459EE2578';
  const note = { txid: '8d93434e', amount: 0.01692458, inboundHash: HASH };
  const purchase = (recordId: string, memo: string, over: object = {}) =>
    ({
      recordId,
      provider: SwapKitProviderEnum.MayachainStreaming,
      direction: SwapDirectionEnum.Inbound,
      sellAsset: { chain: 'ETH', chainId: '1' },
      receiveAsset: ZEC,
      providerData: { kind: SwapKitProviderEnum.MayachainStreaming, memo },
      status: SwapStatusEnum.AwaitingExternalDeposit,
      createdAtMs: 1,
      updatedAtMs: 1,
      ...over,
    }) as unknown as SwapRecordType;

  const harness = (
    records: SwapRecordType[],
    found: { memo: string } | null,
  ) => {
    const stored = new Map(records.map(r => [r.recordId, r]));
    const find = jest.fn(async () => found);
    const service = new SwapService({
      client: {} as unknown as SwapKitClient,
      registry: createDefaultProviderRegistry(),
      store: {
        readAll: async () => [...stored.values()],
        update: async (
          id: string,
          change: (current: SwapRecordType) => SwapRecordType,
        ) => {
          const current = stored.get(id);
          if (!current) return undefined;
          stored.set(id, change(current));
          return stored.get(id);
        },
      } as unknown as typeof SwapStore,
      poller: { start: jest.fn() } as unknown as SwapPoller,
      tokenCatalog: null as unknown as TokenCatalog,
      findSwapByInboundHash: find,
    });
    return { service, stored, find };
  };

  it('Tests that the purchase whose memo is the swap’s completes with the payout', async () => {
    const { service, stored } = harness(
      [purchase('mine', '=:z:u1mine'), purchase('other', '=:z:u1other')],
      { memo: '=:z:u1mine' },
    );

    const settled = await service.claimPayouts([note]);

    expect(settled).toEqual(['8d93434e']);
    expect(stored.get('mine')).toEqual(
      expect.objectContaining({
        status: SwapStatusEnum.Completed,
        destinationTxHash: '8d93434e',
        actualReceiveAmount: '0.01692458',
      }),
    );
    expect(stored.get('other')?.status).toBe(
      SwapStatusEnum.AwaitingExternalDeposit,
    );
  });

  it('Tests that the payout waits for a later call when Midgard does not know the swap yet', async () => {
    const { service, stored } = harness([purchase('mine', '=:z:u1mine')], null);

    expect(await service.claimPayouts([note])).toEqual([]);
    expect(stored.get('mine')?.destinationTxHash).toBeUndefined();
  });

  it('Tests that a payout of a swap no purchase here is settles without touching any', async () => {
    const { service, stored } = harness([purchase('mine', '=:z:u1mine')], {
      memo: '=:z:u1somebodyelse',
    });

    expect(await service.claimPayouts([note])).toEqual(['8d93434e']);
    expect(stored.get('mine')?.destinationTxHash).toBeUndefined();
  });

  it('Tests that Midgard is not asked when no purchase awaits a payout', async () => {
    const { service, find } = harness(
      [purchase('done', '=:z:u1mine', { destinationTxHash: 'zz' })],
      { memo: '=:z:u1mine' },
    );

    expect(await service.claimPayouts([note])).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });
});
