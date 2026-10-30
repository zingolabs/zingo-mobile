import { SwapService } from '@app/swap/SwapService';
import {
  DEPOSIT_WAIT_MS,
  awaitsDeposit,
  depositDeadlineMs,
  depositOverdue,
  depositPhase,
  depositWarnAtMs,
  slowDeposit,
} from '@app/swap/depositDeadline';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapPoller } from '@app/swap/SwapPoller';
import type { SwapStore } from '@app/swap/SwapStore';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

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

const ETH: SwapAssetType = {
  swapKitId: 'ETH.ETH',
  chain: 'ETH',
  symbol: 'ETH',
  ticker: 'ETH',
  chainId: '1',
  decimals: 18,
};

const T0 = 1_700_000_000_000;

const makeRecord = (
  overrides: Partial<SwapRecordType> = {},
): SwapRecordType => ({
  recordId: 'rec-1',
  depositAddress: 'bc1qdeposit',
  provider: SwapKitProviderEnum.Near,
  direction: SwapDirectionEnum.Inbound,
  routeId: 'route-1',
  sellAsset: BTC,
  receiveAsset: ZEC,
  sellAmountHumanDecimal: '0.03',
  expectedReceiveAmount: '12.5',
  minReceiveAmount: '12.4',
  destinationAddress: 't1ephemeral',
  sourceAddress: 'bc1qrefund',
  status: SwapStatusEnum.AwaitingExternalDeposit,
  providerData: {
    kind: SwapKitProviderEnum.Near,
    depositAddress: 'bc1qdeposit',
  },
  fiatValueBasis: {
    sellUsdUnitPrice: 60000,
    receiveUsdUnitPrice: 30,
    capturedAt: 0,
  },
  createdAtMs: T0,
  updatedAtMs: T0,
  depositDeadlineMs: T0 + 600_000,
  ...overrides,
});

test('Tests that the wait ends at the record’s own deadline, or 12 hours after creation when it has none', () => {
  expect(depositDeadlineMs(makeRecord())).toBe(T0 + 600_000);
  expect(depositDeadlineMs({ createdAtMs: T0 })).toBe(T0 + DEPOSIT_WAIT_MS);
  expect(DEPOSIT_WAIT_MS).toBe(12 * 60 * 60 * 1000);
});

test('Tests that the wait ends at the quote’s deadline when that comes first, and that a record kept from a 24 hour wait waits 12', () => {
  expect(
    depositDeadlineMs({
      createdAtMs: T0,
      depositDeadlineMs: T0 + DEPOSIT_WAIT_MS,
      quoteExpiresAtMs: T0 + 900_000,
    }),
  ).toBe(T0 + 900_000);
  expect(
    depositDeadlineMs({
      createdAtMs: T0,
      depositDeadlineMs: T0 + 2 * DEPOSIT_WAIT_MS,
    }),
  ).toBe(T0 + DEPOSIT_WAIT_MS);
});

test('Tests that only an inbound deposit the provider has not seen is awaited', () => {
  expect(awaitsDeposit(makeRecord())).toBe(true);
  expect(
    awaitsDeposit(makeRecord({ observedDepositTxHash: 'ab'.repeat(32) })),
  ).toBe(false);
  expect(awaitsDeposit(makeRecord({ status: SwapStatusEnum.Pending }))).toBe(
    false,
  );
});

test('Tests that an awaited deposit is overdue once its deadline passes and before that it is not', () => {
  expect(depositOverdue(makeRecord(), T0 + 599_999)).toBe(false);
  expect(depositOverdue(makeRecord(), T0 + 600_000)).toBe(true);
  expect(
    depositOverdue(
      makeRecord({ observedDepositTxHash: 'ab'.repeat(32) }),
      T0 + 900_000,
    ),
  ).toBe(false);
});

describe('SwapService.markDepositSent', () => {
  const serviceOver = (record: SwapRecordType | null) => {
    const upsert = jest.fn(async () => undefined);
    const poller = {
      isRunning: jest.fn(() => true),
      start: jest.fn(),
      tickOnce: jest.fn(async () => undefined),
    };
    const service = new SwapService({
      client: null as never,
      registry: null as never,
      store: {
        getByRecordId: async () => record,
        upsert,
      } as unknown as typeof SwapStore,
      poller: poller as unknown as SwapPoller,
      tokenCatalog: null as never,
    });
    return { service, upsert, poller };
  };

  it('keeps the moment the user said the deposit was sent and leaves the status alone', async () => {
    const { service, upsert, poller } = serviceOver(makeRecord());

    const updated = await service.markDepositSent({ recordId: 'rec-1' });

    expect(updated.depositSentAtMs).toEqual(expect.any(Number));
    expect(updated.status).toBe(SwapStatusEnum.AwaitingExternalDeposit);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(poller.tickOnce).toHaveBeenCalled();
  });

  it('keeps the first moment when the user says it twice', async () => {
    const { service, upsert } = serviceOver(
      makeRecord({ depositSentAtMs: T0 + 1 }),
    );

    const updated = await service.markDepositSent({ recordId: 'rec-1' });

    expect(updated.depositSentAtMs).toBe(T0 + 1);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('refuses an outbound swap, whose deposit this wallet sends', async () => {
    const { service } = serviceOver(
      makeRecord({ direction: SwapDirectionEnum.Outbound }),
    );

    await expect(
      service.markDepositSent({ recordId: 'rec-1' }),
    ).rejects.toThrow('not an inbound record');
  });
});

test('Tests that the wait turns to a warning half an hour after the payment address was made', () => {
  expect(depositWarnAtMs(makeRecord({ sellAsset: ETH }))).toBe(
    T0 + 30 * 60 * 1000,
  );
  expect(slowDeposit(makeRecord({ sellAsset: ETH }))).toBe(false);
});

test('Tests that the wait turns to a warning after 90 minutes when the payment is in Bitcoin', () => {
  expect(depositWarnAtMs(makeRecord())).toBe(T0 + 90 * 60 * 1000);
  expect(slowDeposit(makeRecord())).toBe(true);
});

test('Tests that a purchase reads awaiting, looking, not detected, detected and swapping as it moves', () => {
  expect(depositPhase(makeRecord(), T0 + 1_000)).toBe('awaiting');
  const sent = makeRecord({ depositSentAtMs: T0 + 1_000 });
  expect(depositPhase(sent, T0 + 90 * 60 * 1000 - 1)).toBe('looking');
  expect(depositPhase(sent, T0 + 90 * 60 * 1000)).toBe('notDetected');
  expect(
    depositPhase(
      makeRecord({
        status: SwapStatusEnum.Pending,
        observedDepositTxHash: 'ab'.repeat(32),
      }),
      T0 + 1_000,
    ),
  ).toBe('detected');
  expect(
    depositPhase(makeRecord({ status: SwapStatusEnum.Processing }), T0),
  ).toBe('swapping');
  expect(
    depositPhase(
      makeRecord({
        direction: SwapDirectionEnum.Outbound,
        status: SwapStatusEnum.Pending,
      }),
      T0,
    ),
  ).toBe('swapping');
});

test('Tests that a purchase reads detected when its deposit is seen before the status moves', () => {
  expect(
    depositPhase(
      makeRecord({ observedDepositTxHash: 'ab'.repeat(32) }),
      T0 + 1_000,
    ),
  ).toBe('detected');
});
