import { BlockExplorerEnum, ChainNameEnum } from '@app/AppState';

jest.mock('@app/RPCModule', () => ({ __esModule: true, default: {} }));
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import {
  buildChainExplorerUrl,
  buildTrackerEntries,
} from '@app/swap/explorerUrls';
import { hashRowsForRecord } from '@app/swap/hashRowsForRecord';
import { applyDefaultTrackUpdate } from '@app/swap/providers/trackUpdateBase';
import {
  DEPOSIT_HASH,
  NEAR_EXECUTION_HASH,
  SOLANA_DELIVERY_SIGNATURE,
  nearZecToSolUsdcTrack,
} from '../../__mocks__/dataMocks/swap/nearZecToSolUsdcTrack';
import {
  REFUND_HASH,
  REFUNDED_DEPOSIT_HASH,
  flashnetRefundedTrack,
} from '../../__mocks__/dataMocks/swap/flashnetRefundedTrack';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

const explorer = {
  zecChainName: ChainNameEnum.mainChainName,
  zecBlockExplorer: BlockExplorerEnum.Zcashexplorer,
};

const ZEC: SwapAssetType = {
  swapKitId: 'ZEC.ZEC',
  chain: 'ZEC',
  symbol: 'ZEC',
  ticker: 'ZEC',
  chainId: 'zcash',
  decimals: 8,
};

const SOL_USDC: SwapAssetType = {
  swapKitId: 'SOL.USDC-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  chain: 'SOL',
  symbol: 'USDC',
  ticker: 'USDC',
  chainId: 'solana',
  decimals: 6,
};

const record = (overrides: Partial<SwapRecordType> = {}): SwapRecordType => ({
  recordId: 'rec-1',
  depositAddress: 't1deposit',
  provider: SwapKitProviderEnum.Near,
  direction: SwapDirectionEnum.Outbound,
  routeId: 'route-1',
  sellAsset: ZEC,
  receiveAsset: SOL_USDC,
  sellAmountHumanDecimal: '0.05',
  expectedReceiveAmount: '55.6',
  minReceiveAmount: '55.0',
  destinationAddress: 'SolanaDestinationPlaceholder',
  sourceAddress: 't1ephemeral',
  status: SwapStatusEnum.Completed,
  providerData: { kind: SwapKitProviderEnum.Near, depositAddress: 't1deposit' },
  fiatValueBasis: {
    sellUsdUnitPrice: 1122,
    receiveUsdUnitPrice: 1,
    capturedAt: 0,
  },
  createdAtMs: 1_700_000_000_000,
  updatedAtMs: 1_700_000_000_000,
  ...overrides,
});

// A refunded Flashnet swap into Solana, as a record an older build left
// behind: the refund hash stored as the destination, taken from the last
// leg. Nothing in the response is on Solana.
describe('a refunded swap', () => {
  const leftBehind = (): SwapRecordType =>
    record({
      provider: SwapKitProviderEnum.Flashnet,
      providerData: { kind: SwapKitProviderEnum.Flashnet },
      status: SwapStatusEnum.Refunded,
      broadcast: { txId: REFUNDED_DEPOSIT_HASH } as SwapRecordType['broadcast'],
      observedDepositTxHash: REFUNDED_DEPOSIT_HASH,
      destinationTxHash: REFUND_HASH,
    });

  it('drops a refund hash stored as the destination', () => {
    const tracked = applyDefaultTrackUpdate(
      leftBehind(),
      flashnetRefundedTrack,
    );

    expect(tracked.destinationTxHash).toBeUndefined();
    expect(tracked.refundInfo?.refundTxHash).toBe(REFUND_HASH);
  });

  it('links the refund on Zcash and nothing on Solana', () => {
    const tracked = applyDefaultTrackUpdate(
      leftBehind(),
      flashnetRefundedTrack,
    );

    const entries = buildTrackerEntries({ record: tracked, ...explorer });

    expect(entries.some(e => e.url.includes('solscan'))).toBe(false);
    expect(entries.find(e => e.key === 'refund-explorer')).toMatchObject({
      label: 'Refund explorer',
      onZcash: true,
    });
    expect(entries.find(e => e.key === 'refund-explorer')?.url).toContain(
      REFUND_HASH,
    );
  });

  // The same hash under Destination had been hiding the Refund row, since
  // the rows never repeat a hash.
  it('lists the refund under its own name', () => {
    const tracked = applyDefaultTrackUpdate(
      leftBehind(),
      flashnetRefundedTrack,
    );

    expect(hashRowsForRecord(tracked)).toContainEqual({
      label: 'Refund',
      value: REFUND_HASH,
      chain: 'ZEC',
    });
    expect(
      hashRowsForRecord(tracked).some(row => row.label === 'Destination'),
    ).toBe(false);
  });
});

describe('buildChainExplorerUrl', () => {
  // A chain missing from the table does not fail loudly: the row is simply
  // left out. A NEAR swap into USDC on Solana showed no destination link at
  // all, because Solana was never in the table.
  it('links a Solana transaction', () => {
    expect(
      buildChainExplorerUrl({ chain: 'SOL', hash: '5sig', ...explorer }),
    ).toBe('https://solscan.io/tx/5sig');
  });

  it('reads the chain symbol case-insensitively', () => {
    expect(
      buildChainExplorerUrl({ chain: 'sol', hash: '5sig', ...explorer }),
    ).toBe('https://solscan.io/tx/5sig');
  });

  it('gives nothing for a chain it does not know', () => {
    expect(
      buildChainExplorerUrl({ chain: 'NOPE', hash: 'h', ...explorer }),
    ).toBeNull();
  });
});

describe('buildTrackerEntries', () => {
  // The real response, end to end: what the poller stores from it and what
  // the detail screen then links. NEAR Intents routes through a call on
  // NEAR that was captured nowhere, so neither the NEAR link nor, with
  // Solana missing from the table, the destination link ever appeared.
  it('links every leg of a NEAR Intents swap into Solana', () => {
    const tracked = applyDefaultTrackUpdate(
      record({ status: SwapStatusEnum.Processing }),
      nearZecToSolUsdcTrack,
    );

    const entries = buildTrackerEntries({ record: tracked, ...explorer });

    expect(entries.map(e => e.url)).toEqual(
      expect.arrayContaining([
        `https://nearblocks.io/txns/${NEAR_EXECUTION_HASH}`,
        `https://solscan.io/tx/${SOLANA_DELIVERY_SIGNATURE}`,
      ]),
    );
    expect(entries.find(e => e.url.includes('nearblocks'))?.label).toBe(
      'NEAR explorer',
    );
  });

  it('lists each leg once, under the name of what it is', () => {
    const tracked = applyDefaultTrackUpdate(
      record({ status: SwapStatusEnum.Processing }),
      nearZecToSolUsdcTrack,
    );

    // Each row carries the chain it happened on, which is what lets the detail
    // view offer the right explorer for it.
    expect(hashRowsForRecord(tracked)).toEqual([
      { label: 'Deposit', value: DEPOSIT_HASH, chain: 'ZEC' },
      { label: 'Via NEAR', value: NEAR_EXECUTION_HASH, chain: 'NEAR' },
      { label: 'Destination', value: SOLANA_DELIVERY_SIGNATURE, chain: 'SOL' },
    ]);
  });

  // A leg that has not landed carries a placeholder hash, and a link to it
  // would open nothing.
  it('skips a leg that has not landed yet', () => {
    const inFlight = {
      ...nearZecToSolUsdcTrack,
      legs: nearZecToSolUsdcTrack.legs?.map(leg =>
        leg.chainId === 'near' ? { ...leg, hash: '0x' + '0'.repeat(64) } : leg,
      ),
    };
    const tracked = applyDefaultTrackUpdate(
      record({ status: SwapStatusEnum.Processing }),
      inFlight,
    );

    expect(tracked.intermediateLegs).toBeUndefined();
  });

  // The detail view rows entries by chain: trackers and other chains first,
  // Zcash below. The flag follows the chain a link opens, not its role.
  it('marks only the Zcash transactions of an outbound swap as on Zcash', () => {
    const tracked = applyDefaultTrackUpdate(
      record({
        status: SwapStatusEnum.Processing,
        broadcast: { txId: DEPOSIT_HASH } as SwapRecordType['broadcast'],
      }),
      nearZecToSolUsdcTrack,
    );

    const onZcash = Object.fromEntries(
      buildTrackerEntries({ record: tracked, ...explorer }).map(e => [
        e.key,
        e.onZcash,
      ]),
    );

    expect(onZcash).toEqual({
      swapkit: false,
      'source-explorer': true,
      'leg-0': false,
      'dest-explorer': false,
    });
  });

  it('puts the Zcash delivery of an inbound swap on Zcash', () => {
    const entries = buildTrackerEntries({
      record: record({
        direction: SwapDirectionEnum.Inbound,
        sellAsset: SOL_USDC,
        receiveAsset: ZEC,
        observedDepositTxHash: '5solanadeposit',
        destinationTxHash: 'bb22'.repeat(16),
      }),
      ...explorer,
    });

    expect(entries.find(e => e.key === 'source-explorer')?.onZcash).toBe(false);
    expect(entries.find(e => e.key === 'dest-explorer')?.onZcash).toBe(true);
  });

  it('offers the destination chain explorer for a swap into Solana', () => {
    const entries = buildTrackerEntries({
      record: record({ destinationTxHash: '5solanasignature' }),
      ...explorer,
    });

    expect(entries).toContainEqual({
      key: 'dest-explorer',
      label: 'Destination chain explorer',
      url: 'https://solscan.io/tx/5solanasignature',
      onZcash: false,
    });
  });
});
