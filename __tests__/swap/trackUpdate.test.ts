import {
  applyDefaultTrackUpdate,
  isRealLegHash,
  pickLegHash,
} from '@app/swap/providers/trackUpdateBase';
import {
  mapSwapStatus,
  mapTrackingStatus,
} from '@app/swap/providers/statusMapping';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import { TrackingStatusEnum } from '@app/swap/enums/TrackingStatusEnum';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import type { TrackResponseType } from '@app/swap/types/TrackResponseType';

/**
 * This is the poller's whole reason for existing: what a `/track` response
 * does to a record, and therefore what the user sees a swap doing. The
 * scheduling around it is covered in `SwapPoller.test.ts`, which runs a
 * passthrough executor precisely so the two concerns stay separable.
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

const ZERO_HASH = '0'.repeat(64);
const DEPOSIT_HASH = 'a'.repeat(64);
const PAYOUT_HASH = 'b'.repeat(64);

const record = (overrides: Partial<SwapRecordType> = {}): SwapRecordType => ({
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

describe('mapSwapStatus', () => {
  it.each([
    ['PENDING', SwapStatusEnum.Pending],
    ['COMPLETED', SwapStatusEnum.Completed],
    ['SUCCESS', SwapStatusEnum.Completed],
    ['REFUNDED', SwapStatusEnum.Refunded],
    ['FAILED', SwapStatusEnum.Failed],
    ['ERROR', SwapStatusEnum.Failed],
    ['EXPIRED', SwapStatusEnum.Expired],
    ['INCOMPLETE_DEPOSIT', SwapStatusEnum.IncompleteDeposit],
  ])('reads %s', (raw, expected) => {
    expect(mapSwapStatus(raw)).toBe(expected);
  });

  // A streaming Maya swap reports itself mid-flight under several names. Each
  // is the provider actively moving funds, and any that failed to map used to
  // demote a healthy swap to unknown.
  it.each(['PROCESSING', 'IN_PROGRESS', 'SWAPPING', 'STREAMING'])(
    'reads %s as in progress',
    raw => {
      expect(mapSwapStatus(raw)).toBe(SwapStatusEnum.Processing);
    },
  );

  it('is not fussy about the case SwapKit sends', () => {
    expect(mapSwapStatus('completed')).toBe(SwapStatusEnum.Completed);
  });

  // Undefined is the signal to keep whatever the record already says. Only an
  // explicit "unknown" from SwapKit earns the dedicated status, because that
  // is the provider confirming its own ignorance rather than our own.
  it('answers undefined for a status it does not recognise', () => {
    expect(mapSwapStatus('SOMETHING_NEW')).toBeUndefined();
    expect(mapSwapStatus('NOT_STARTED')).toBeUndefined();
    expect(mapSwapStatus(undefined)).toBeUndefined();
  });

  it("keeps SwapKit's own admission of ignorance distinct", () => {
    expect(mapSwapStatus('UNKNOWN')).toBe(SwapStatusEnum.ProviderStatusUnknown);
  });
});

describe('mapTrackingStatus', () => {
  it.each([
    ['inbound', TrackingStatusEnum.Inbound],
    ['swapping', TrackingStatusEnum.Swapping],
    ['completed', TrackingStatusEnum.Completed],
    ['refunded', TrackingStatusEnum.Refunded],
    ['failed', TrackingStatusEnum.Failed],
    ['expired', TrackingStatusEnum.Expired],
  ])('reads %s', (raw, expected) => {
    expect(mapTrackingStatus(raw)).toBe(expected);
  });

  it('answers undefined for anything else', () => {
    expect(mapTrackingStatus('mystery')).toBeUndefined();
    expect(mapTrackingStatus(undefined)).toBeUndefined();
  });
});

describe('isRealLegHash', () => {
  it('accepts a hash that names a transaction', () => {
    expect(isRealLegHash(DEPOSIT_HASH)).toBe(true);
  });

  // SwapKit's placeholder for a leg that has not landed. Persisting one would
  // put a row in the trackers sheet that copies nothing and links nowhere.
  it('rejects the placeholder in both spellings', () => {
    expect(isRealLegHash(ZERO_HASH)).toBe(false);
    expect(isRealLegHash(`0x${ZERO_HASH}`)).toBe(false);
  });

  it('rejects nothing at all', () => {
    expect(isRealLegHash('')).toBe(false);
    expect(isRealLegHash(undefined)).toBe(false);
  });
});

describe('pickLegHash', () => {
  const legs = (
    ...entries: Array<{ chainId?: string; hash?: string }>
  ): TrackResponseType => ({ legs: entries });

  // The semantically correct path: match the leg to the chain it belongs to.
  it('matches a leg by its chain', () => {
    const response = legs(
      { chainId: 'bitcoin', hash: PAYOUT_HASH },
      { chainId: 'zcash', hash: DEPOSIT_HASH },
    );

    expect(pickLegHash(response, 'inbound', 'zcash')).toBe(DEPOSIT_HASH);
    expect(pickLegHash(response, 'outbound', 'bitcoin')).toBe(PAYOUT_HASH);
  });

  it('matches the chain whatever case it arrives in', () => {
    expect(
      pickLegHash(
        legs({ chainId: 'ZCASH', hash: DEPOSIT_HASH }),
        'inbound',
        'zcash',
      ),
    ).toBe(DEPOSIT_HASH);
  });

  // When no leg names a chain, position stands in: the deposit is first and
  // the payout is last, which has held across every provider observed.
  it('falls back to first for inbound and last for outbound', () => {
    const response = legs({ hash: DEPOSIT_HASH }, { hash: PAYOUT_HASH });

    expect(pickLegHash(response, 'inbound', 'zcash')).toBe(DEPOSIT_HASH);
    expect(pickLegHash(response, 'outbound', 'bitcoin')).toBe(PAYOUT_HASH);
  });

  // The deposit leg is the first one, so when it carries a placeholder the
  // positional fallback lands on that same leg and the answer is nothing. That
  // is the right answer: the deposit has not landed, and a hash borrowed from
  // the payout leg would name the wrong transaction.
  it('answers nothing when the leg for that chain has not landed', () => {
    const response = legs(
      { chainId: 'zcash', hash: ZERO_HASH },
      { chainId: 'bitcoin', hash: PAYOUT_HASH },
    );

    expect(pickLegHash(response, 'inbound', 'zcash')).toBeUndefined();
  });

  // Once pinned as unreachable, because real responses put the delivery last.
  // A refund does not: its last leg is the return on the source chain, and
  // position alone took that for the delivery. A leg that names a chain is
  // only ever matched by it.
  it('never crosses chains through the positional fallback', () => {
    const response = legs(
      { chainId: 'zcash', hash: ZERO_HASH },
      { chainId: 'bitcoin', hash: PAYOUT_HASH },
    );

    expect(pickLegHash(response, 'outbound', 'zcash')).toBeUndefined();
  });

  it("does not take a refund's return leg for the delivery", () => {
    const response: TrackResponseType = {
      legs: [
        { chainId: 'zcash', hash: DEPOSIT_HASH, status: 'completed' },
        { chainId: 'spark', hash: ZERO_HASH, status: 'refunded' },
        { chainId: 'zcash', hash: PAYOUT_HASH, status: 'refunded' },
      ],
    };

    expect(pickLegHash(response, 'outbound', 'solana')).toBeUndefined();
  });

  it('does not take a refunded leg that names no chain either', () => {
    const response: TrackResponseType = {
      legs: [{ hash: DEPOSIT_HASH }, { hash: PAYOUT_HASH, status: 'refunded' }],
    };

    expect(pickLegHash(response, 'outbound', 'solana')).toBeUndefined();
  });

  it('has nothing to answer with when there are no legs', () => {
    expect(pickLegHash({ legs: [] }, 'inbound', 'zcash')).toBeUndefined();
    expect(pickLegHash({}, 'inbound', 'zcash')).toBeUndefined();
  });
});

describe('applyDefaultTrackUpdate', () => {
  it('advances the status the provider reports', () => {
    const updated = applyDefaultTrackUpdate(record(), {
      status: 'PROCESSING',
      trackingStatus: 'swapping',
    });

    expect(updated.status).toBe(SwapStatusEnum.Processing);
    expect(updated.trackingStatus).toBe(TrackingStatusEnum.Swapping);
  });

  // The one that matters most: a status SwapKit adds later must not knock a
  // swap the wallet is tracking back to nothing.
  it("keeps the record's status when the response says something unrecognised", () => {
    const updated = applyDefaultTrackUpdate(
      record({ status: SwapStatusEnum.Processing }),
      { status: 'TELEPORTING' },
    );

    expect(updated.status).toBe(SwapStatusEnum.Processing);
  });

  it('takes the leg hashes onto the record', () => {
    const updated = applyDefaultTrackUpdate(record(), {
      status: 'PROCESSING',
      legs: [
        { chainId: 'zcash', hash: DEPOSIT_HASH },
        { chainId: 'bitcoin', hash: PAYOUT_HASH },
      ],
    });

    expect(updated.observedDepositTxHash).toBe(DEPOSIT_HASH);
    expect(updated.destinationTxHash).toBe(PAYOUT_HASH);
  });

  it('holds the hashes it already had when a response carries none', () => {
    const before = record({
      observedDepositTxHash: DEPOSIT_HASH,
      destinationTxHash: PAYOUT_HASH,
    });
    const updated = applyDefaultTrackUpdate(before, { status: 'PROCESSING' });

    expect(updated.observedDepositTxHash).toBe(DEPOSIT_HASH);
    expect(updated.destinationTxHash).toBe(PAYOUT_HASH);
  });

  // Records written before the placeholder filter existed still carry one, so
  // the update scrubs it rather than carrying it forward forever.
  it('drops a placeholder an older build persisted', () => {
    const updated = applyDefaultTrackUpdate(
      record({ observedDepositTxHash: ZERO_HASH }),
      { status: 'PROCESSING' },
    );

    expect(updated.observedDepositTxHash).toBeUndefined();
  });

  it('records the payout once the provider reports it in the asset we asked for', () => {
    const updated = applyDefaultTrackUpdate(record(), {
      status: 'COMPLETED',
      toAsset: 'BTC.BTC',
      toAmount: '0.00197',
    });

    expect(updated.actualReceiveAmount).toBe('0.00197');
  });

  // The bug this guard exists for: a multi-step swap reports an intermediate
  // hop's amount at the top level, and persisting it made the History row
  // jitter between unrelated numbers, showing a USDT leg's amount as ZEC.
  it('refuses an amount denominated in some other asset', () => {
    const updated = applyDefaultTrackUpdate(
      record({ actualReceiveAmount: '0.002' }),
      {
        status: 'PROCESSING',
        toAsset: 'ETH.USDT',
        toAmount: '184.22',
      },
    );

    expect(updated.actualReceiveAmount).toBe('0.002');
  });

  // A provider that fixes the output on settlement reports zero until then.
  // Shown, it read "0.03 ZEC → 0 ETH" on a swap that was proceeding normally.
  it('refuses a payout of zero', () => {
    const updated = applyDefaultTrackUpdate(
      record({ actualReceiveAmount: '0.00197' }),
      {
        status: 'PROCESSING',
        toAsset: 'BTC.BTC',
        toAmount: '0',
      },
    );

    expect(updated.actualReceiveAmount).toBe('0.00197');
  });

  it('leaves a record with no payout yet alone rather than calling it zero', () => {
    const updated = applyDefaultTrackUpdate(record(), {
      status: 'PROCESSING',
      toAsset: 'BTC.BTC',
      toAmount: '0',
    });

    expect(updated.actualReceiveAmount).toBeUndefined();
  });

  it('refuses an amount with no asset named at all', () => {
    const updated = applyDefaultTrackUpdate(record(), {
      status: 'PROCESSING',
      toAmount: '0.00197',
    });

    expect(updated.actualReceiveAmount).toBeUndefined();
  });

  it('captures a failure reason only when the swap actually failed', () => {
    const failed = applyDefaultTrackUpdate(record(), {
      status: 'FAILED',
      failureReason: 'refund issued',
    });
    const running = applyDefaultTrackUpdate(record(), {
      status: 'PROCESSING',
      failureReason: 'refund issued',
    });

    expect(failed.failureReason).toBe('refund issued');
    expect(running.failureReason).toBeUndefined();
  });

  it('finds a provider explorer link at the top level or on a leg', () => {
    const topLevel = applyDefaultTrackUpdate(record(), {
      status: 'PROCESSING',
      meta: { providerExplorerUrl: 'https://explorer.example/top' },
    });
    const onLeg = applyDefaultTrackUpdate(record(), {
      status: 'PROCESSING',
      legs: [{ meta: { providerExplorerUrl: 'https://explorer.example/leg' } }],
    });

    expect(topLevel.providerExplorerUrl).toBe('https://explorer.example/top');
    expect(onLeg.providerExplorerUrl).toBe('https://explorer.example/leg');
  });

  // The link is what the trackers sheet offers after the swap settles and the
  // poller stops asking, so a later response without it must not erase it.
  it('keeps an explorer link a previous tick found', () => {
    const before = record({
      providerExplorerUrl: 'https://explorer.example/kept',
    });
    const updated = applyDefaultTrackUpdate(before, { status: 'COMPLETED' });

    expect(updated.providerExplorerUrl).toBe('https://explorer.example/kept');
  });

  describe('timestamps', () => {
    it('stamps the terminal moment on the transition into one, and only then', () => {
      const settled = applyDefaultTrackUpdate(
        record({ status: SwapStatusEnum.Processing }),
        { status: 'COMPLETED' },
      );
      expect(settled.terminalAtMs).toEqual(expect.any(Number));

      const again = applyDefaultTrackUpdate(
        record({
          status: SwapStatusEnum.Completed,
          terminalAtMs: 1_700_000_000_500,
        }),
        { status: 'COMPLETED' },
      );
      expect(again.terminalAtMs).toBe(1_700_000_000_500);
    });

    it('leaves the terminal moment unset while the swap is still moving', () => {
      expect(
        applyDefaultTrackUpdate(record(), { status: 'PROCESSING' })
          .terminalAtMs,
      ).toBeUndefined();
    });

    it('stamps the first observation once and keeps it', () => {
      const first = applyDefaultTrackUpdate(record(), { status: 'PROCESSING' });
      expect(first.firstObservedAtMs).toEqual(expect.any(Number));

      const later = applyDefaultTrackUpdate(
        record({ firstObservedAtMs: 1_700_000_000_100 }),
        {
          status: 'PROCESSING',
        },
      );
      expect(later.firstObservedAtMs).toBe(1_700_000_000_100);
    });
  });

  // The poller compares the record before and after to decide whether to pay
  // for an encrypted write, ignoring `updatedAtMs`. Anything else the update
  // touches gratuitously would defeat that.
  it('leaves every other field of the record alone', () => {
    const before = record();
    const updated = applyDefaultTrackUpdate(before, { status: 'PROCESSING' });

    expect(updated.recordId).toBe(before.recordId);
    expect(updated.sellAsset).toEqual(before.sellAsset);
    expect(updated.destinationAddress).toBe(before.destinationAddress);
    expect(updated.expectedReceiveAmount).toBe(before.expectedReceiveAmount);
    expect(updated.createdAtMs).toBe(before.createdAtMs);
    expect(before.status).toBe(SwapStatusEnum.Pending);
  });
});

/**
 * Shaped after a real Flashnet refund on mainnet: the deposit landed and
 * completed on the sell chain, the provider leg refunded carrying the order
 * id and the reason, and a second transfer on the sell chain brought the
 * funds back. Everything the user needs to chase it was in this response and
 * none of it reached the record.
 */
describe('applyDefaultTrackUpdate on a refund', () => {
  const REFUND_HASH = 'c'.repeat(64);
  const REASON = 'Order processing failed. Contact support with this order ID.';

  const refunded: TrackResponseType = {
    status: 'refunded',
    trackingStatus: 'refunded',
    meta: { refundReason: REASON },
    legs: [
      {
        chainId: 'zcash',
        type: 'native_send',
        status: 'completed',
        hash: DEPOSIT_HASH,
      },
      {
        chainId: 'spark',
        type: 'swap',
        status: 'refunded',
        hash: ZERO_HASH,
        meta: { providerOrderId: 'ord_placeholder', refundReason: REASON },
      },
      {
        chainId: 'zcash',
        type: 'native_send',
        status: 'refunded',
        hash: REFUND_HASH,
      },
    ],
  };

  it('keeps the reason the provider gave for handing the deposit back', () => {
    const updated = applyDefaultTrackUpdate(record(), refunded);

    expect(updated.status).toBe(SwapStatusEnum.Refunded);
    expect(updated.refundInfo?.refundReason).toBe(REASON);
  });

  // The deposit leg sits on the same chain and carries a real hash, so the
  // refunded status is what picks the right transaction out, not the chain.
  it('takes the transaction that returned the funds, not the one that sent them', () => {
    const updated = applyDefaultTrackUpdate(record(), refunded);

    expect(updated.refundInfo?.refundTxHash).toBe(REFUND_HASH);
  });

  // The provider asks for this by name when refusing an order, and it was
  // reaching the app and going nowhere.
  it('keeps the provider order id', () => {
    const updated = applyDefaultTrackUpdate(record(), refunded);

    expect(updated.providerOrderId).toBe('ord_placeholder');
  });

  // The real refund reported zero on both the swap leg and the returning
  // transfer while returning the deposit in full. A figure read from there
  // would tell the user they got nothing back.
  it('claims no refunded amount, because the ones reported are not to be trusted', () => {
    const updated = applyDefaultTrackUpdate(record(), {
      ...refunded,
      toAmount: '0',
    });

    expect(updated.refundInfo?.refundedAmountText).toBeUndefined();
    expect(updated.refundInfo?.depositedAmountText).toBeUndefined();
  });

  it('leaves the refund untouched while the swap is still running', () => {
    const updated = applyDefaultTrackUpdate(record(), {
      status: 'PROCESSING',
      legs: refunded.legs,
    });

    expect(updated.refundInfo).toBeUndefined();
  });

  // A second tick of the poller must not lose what the first one learned.
  it('keeps what it already knew when a later response says less', () => {
    const first = applyDefaultTrackUpdate(record(), refunded);
    const second = applyDefaultTrackUpdate(first, { status: 'refunded' });

    expect(second.refundInfo?.refundReason).toBe(REASON);
    expect(second.refundInfo?.refundTxHash).toBe(REFUND_HASH);
    expect(second.providerOrderId).toBe('ord_placeholder');
  });
});

// SwapKit reports these once a swap settles. The tolerance explains a refund
// on price and was once recorded nowhere; the realised figure is how the
// result compares with the quote.
describe('applyDefaultTrackUpdate slippage', () => {
  it('keeps the tolerance and the realised slippage the provider reports', () => {
    const updated = applyDefaultTrackUpdate(record(), {
      status: 'completed',
      slippageTolerance: 100,
      realizedSlippageBps: -6,
    });

    expect(updated.slippageToleranceBps).toBe(100);
    expect(updated.realizedSlippageBps).toBe(-6);
  });

  it('does not lose them to a later response that omits them', () => {
    const first = applyDefaultTrackUpdate(record(), {
      status: 'completed',
      slippageTolerance: 200,
      realizedSlippageBps: 12,
    });
    const second = applyDefaultTrackUpdate(first, { status: 'completed' });

    expect(second.slippageToleranceBps).toBe(200);
    expect(second.realizedSlippageBps).toBe(12);
  });

  // Measured against the full quoted amount, a partial refund reads as a
  // large shortfall that is not slippage. SwapKit says to check the state.
  it('ignores the realised figure on a partially refunded swap', () => {
    const updated = applyDefaultTrackUpdate(record(), {
      status: 'refunded',
      trackingStatus: 'partially_refunded',
      realizedSlippageBps: 4800,
    });

    expect(updated.realizedSlippageBps).toBeUndefined();
  });

  it('ignores a value that is not a finite number', () => {
    const updated = applyDefaultTrackUpdate(record(), {
      status: 'completed',
      slippageTolerance: NaN,
    } as TrackResponseType);

    expect(updated.slippageToleranceBps).toBeUndefined();
  });
});
