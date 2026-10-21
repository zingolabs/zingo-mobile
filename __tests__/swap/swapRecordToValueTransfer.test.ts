import {
  swapRecordToValueTransfer,
  isOutboundSwap,
} from '@app/swap/swapRecordToValueTransfer';
import { BroadcastStatusEnum } from '@app/swap/enums/BroadcastStatusEnum';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import { ValueTransferKindEnum } from '@app/AppState';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

/**
 * The projection that lets a swap sit in the History list beside zingolib's
 * own transfers. It decides the number on the row, which direction the row
 * reads as, and whether the row is painted as settled or failed.
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

const outbound = (overrides: Partial<SwapRecordType> = {}): SwapRecordType => ({
  recordId: 'rec-1',
  depositAddress: 'maya1vault',
  provider: SwapKitProviderEnum.MayachainStreaming,
  direction: SwapDirectionEnum.Outbound,
  routeId: 'route-1',
  sellAsset: ZEC,
  receiveAsset: BTC,
  sellAmountHumanDecimal: '1.5',
  expectedReceiveAmount: '0.002',
  minReceiveAmount: '0.0019',
  destinationAddress: 'bc1qdestination',
  sourceAddress: 't1ephemeral',
  status: SwapStatusEnum.Pending,
  providerData: {
    kind: SwapKitProviderEnum.MayachainStreaming,
    vaultAddress: 'maya1vault',
    memo: '=:b:bc1q',
  },
  fiatValueBasis: {
    sellUsdUnitPrice: 30,
    receiveUsdUnitPrice: 60000,
    capturedAt: 0,
  },
  createdAtMs: 1_700_000_000_000,
  updatedAtMs: 1_700_000_000_000,
  ...overrides,
});

const inbound = (overrides: Partial<SwapRecordType> = {}): SwapRecordType =>
  outbound({
    direction: SwapDirectionEnum.Inbound,
    sellAsset: BTC,
    receiveAsset: ZEC,
    destinationAddress: 't1ephemeral',
    sourceAddress: 'bc1qrefund',
    // The sides swap with the assets. Inheriting the outbound basis would
    // price BTC at 30 and ZEC at 60000, which no assertion about either side
    // could then be trusted.
    fiatValueBasis: {
      sellUsdUnitPrice: 60000,
      receiveUsdUnitPrice: 30,
      capturedAt: 0,
    },
    ...overrides,
  });

describe('the amount on the row', () => {
  // The ZEC leg of a swap already has its own row beside this one, and those
  // are not deduplicated away. Repeating the ZEC figure here would say what
  // the neighbouring row already said, so the row carries the side nothing
  // else in the wallet can show.
  it('shows what is being bought on an outbound swap', () => {
    const vt = swapRecordToValueTransfer(outbound());

    expect(vt.amount).toBe(0.002);
    expect(vt.swapAssetTicker).toBe('BTC');
  });

  it('shows what was paid on an inbound swap', () => {
    const vt = swapRecordToValueTransfer(inbound());

    expect(vt.amount).toBe(1.5);
    expect(vt.swapAssetTicker).toBe('BTC');
  });

  // Once the provider reports what it really paid out, that beats the
  // quote-time estimate the outbound row started with.
  it('prefers the realised payout over the estimate once outbound settles', () => {
    expect(
      swapRecordToValueTransfer(outbound({ actualReceiveAmount: '0.0031' }))
        .amount,
    ).toBe(0.0031);
  });

  // Inbound reads the amount the user sent, which is fixed at commit time, so
  // a payout figure arriving later does not move it.
  it('keeps the inbound row on the amount paid', () => {
    expect(
      swapRecordToValueTransfer(inbound({ actualReceiveAmount: '0.0031' }))
        .amount,
    ).toBe(1.5);
  });

  it('falls back to zero rather than NaN when an amount is unreadable', () => {
    expect(
      swapRecordToValueTransfer(inbound({ sellAmountHumanDecimal: '' })).amount,
    ).toBe(0);
  });
});

describe('the price on the row', () => {
  // Pricing a BTC amount at the ZEC rate would be a wrong number rather than a
  // missing one, so the row carries the counterparty's own price, captured
  // when the route was quoted.
  it('carries the price of the side it is showing', () => {
    expect(swapRecordToValueTransfer(outbound()).swapUsdUnitPrice).toBe(60000);
    expect(swapRecordToValueTransfer(inbound()).swapUsdUnitPrice).toBe(60000);
  });

  // Zero is what the renderers read as "no figure to show", and it is what
  // SwapKit pricing neither side leaves behind.
  it('reports zero when the quote priced nothing', () => {
    const unpriced = outbound({
      fiatValueBasis: {
        sellUsdUnitPrice: 0,
        receiveUsdUnitPrice: 0,
        capturedAt: 0,
      },
    });

    expect(swapRecordToValueTransfer(unpriced).swapUsdUnitPrice).toBe(0);
  });
});

describe('the provider on the row', () => {
  it('carries the provider for the logo the row shows', () => {
    expect(swapRecordToValueTransfer(outbound()).swapProvider).toBe(
      outbound().provider,
    );
  });
});

describe('the identifier the list keys on', () => {
  it('uses the broadcast txid once this wallet has paid', () => {
    const vt = swapRecordToValueTransfer(
      outbound({
        broadcast: {
          status: BroadcastStatusEnum.Broadcasted,
          txId: 'a'.repeat(64),
        },
      }),
    );

    expect(vt.txid).toBe('a'.repeat(64));
  });

  it('uses the observed hash when the deposit came from elsewhere', () => {
    expect(
      swapRecordToValueTransfer(
        inbound({ observedDepositTxHash: 'b'.repeat(64) }),
      ).txid,
    ).toBe('b'.repeat(64));
  });

  // Before any deposit exists there is no transaction to name, so the row
  // borrows the deposit address. It cannot collide with a real txid: those are
  // 64 hex characters and a deposit address is not.
  it('falls back to the deposit address before a deposit exists', () => {
    expect(swapRecordToValueTransfer(outbound()).txid).toBe('maya1vault');
  });
});

describe('how the row is painted', () => {
  it('marks the kind so History routes the row to the swap detail', () => {
    const vt = swapRecordToValueTransfer(outbound());

    expect(vt.kind).toBe(ValueTransferKindEnum.Swap);
    expect(vt.swapRecordId).toBe('rec-1');
    expect(vt.swapStatus).toBe(SwapStatusEnum.Pending);
  });

  it.each([
    [SwapStatusEnum.Completed, RPCValueTransfersStatusEnum.confirmed],
    [SwapStatusEnum.Failed, RPCValueTransfersStatusEnum.failed],
    [SwapStatusEnum.Refunded, RPCValueTransfersStatusEnum.failed],
    [SwapStatusEnum.Expired, RPCValueTransfersStatusEnum.failed],
    [SwapStatusEnum.PendingDeposit, RPCValueTransfersStatusEnum.calculated],
    [
      SwapStatusEnum.AwaitingExternalDeposit,
      RPCValueTransfersStatusEnum.calculated,
    ],
    [SwapStatusEnum.Processing, RPCValueTransfersStatusEnum.mempool],
  ])('paints %s as %s', (swapStatus, expected) => {
    expect(
      swapRecordToValueTransfer(outbound({ status: swapStatus })).status,
    ).toBe(expected);
  });

  // The provider is holding the funds and will refund or accept a top-up, so
  // painting the row as failed would tell the user they lost money they have
  // not lost.
  it('keeps an incomplete deposit in flight rather than failed', () => {
    expect(
      swapRecordToValueTransfer(
        outbound({ status: SwapStatusEnum.IncompleteDeposit }),
      ).status,
    ).toBe(RPCValueTransfersStatusEnum.mempool);
  });

  // The list short-circuits on zero confirmations to render progress, so a
  // swap still moving has to report zero.
  it('reports confirmations only once the swap has settled', () => {
    expect(
      swapRecordToValueTransfer(outbound({ status: SwapStatusEnum.Processing }))
        .confirmations,
    ).toBe(0);
    expect(
      swapRecordToValueTransfer(outbound({ status: SwapStatusEnum.Completed }))
        .confirmations,
    ).toBe(1);
  });

  it('times the row from when the swap was created, in seconds', () => {
    expect(swapRecordToValueTransfer(outbound()).time).toBe(1_700_000_000);
  });
});

describe('isOutboundSwap', () => {
  it('separates the directional buckets the history filter uses', () => {
    expect(isOutboundSwap(outbound())).toBe(true);
    expect(isOutboundSwap(inbound())).toBe(false);
  });
});
