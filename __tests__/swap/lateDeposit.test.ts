import {
  LATE_WATCH_MS,
  acceptsLateUpdate,
  isRefunding,
  watchesLateDeposit,
} from '@app/swap/lateDeposit';
import { newlyExpired, newlyRefunding } from '@app/swap/swapTransitions';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
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

const T0 = 1_700_000_000_000;

const expired = (overrides: Partial<SwapRecordType> = {}): SwapRecordType => ({
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
  status: SwapStatusEnum.Expired,
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
  terminalAtMs: T0 + 600_000,
  ...overrides,
});

const paid = { observedDepositTxHash: 'ab'.repeat(32) };

test('Tests that an expired purchase is watched for a late payment within the window and dropped after it', () => {
  expect(watchesLateDeposit(expired(), T0 + 600_000 + 1_000)).toBe(true);
  expect(watchesLateDeposit(expired(), T0 + 600_000 + LATE_WATCH_MS - 1)).toBe(
    true,
  );
  expect(watchesLateDeposit(expired(), T0 + 600_000 + LATE_WATCH_MS)).toBe(
    false,
  );
});

test('Tests that a sale, a paid purchase and a swap that is not expired are not watched', () => {
  const now = T0 + 601_000;
  expect(
    watchesLateDeposit(expired({ direction: SwapDirectionEnum.Outbound }), now),
  ).toBe(false);
  expect(watchesLateDeposit(expired(paid), now)).toBe(false);
  expect(
    watchesLateDeposit(expired({ status: SwapStatusEnum.Pending }), now),
  ).toBe(false);
});

test('Tests that a record without a terminal stamp is watched from its deadline', () => {
  const record = expired({ terminalAtMs: undefined });
  expect(watchesLateDeposit(record, T0 + 600_000 + LATE_WATCH_MS - 1)).toBe(
    true,
  );
  expect(watchesLateDeposit(record, T0 + 600_000 + LATE_WATCH_MS)).toBe(false);
});

test('Tests that only an answer with a payment or a verdict moves an expired purchase on', () => {
  expect(acceptsLateUpdate(expired({ status: SwapStatusEnum.Pending }))).toBe(
    false,
  );
  expect(acceptsLateUpdate(expired())).toBe(false);
  expect(
    acceptsLateUpdate(expired({ status: SwapStatusEnum.Pending, ...paid })),
  ).toBe(true);
  expect(acceptsLateUpdate(expired({ status: SwapStatusEnum.Refunded }))).toBe(
    true,
  );
});

test('Tests that a purchase reads as refunding while its late payment is in flight and stops once it settles', () => {
  expect(
    isRefunding(
      expired({ status: SwapStatusEnum.Pending, lateDepositAtMs: T0, ...paid }),
    ),
  ).toBe(true);
  expect(
    isRefunding(
      expired({
        status: SwapStatusEnum.Refunded,
        lateDepositAtMs: T0,
        ...paid,
      }),
    ),
  ).toBe(false);
  expect(isRefunding(expired({ status: SwapStatusEnum.Pending }))).toBe(false);
});

test('Tests that only a swap seen awaiting counts as newly expired and only one seen expired as newly refunding', () => {
  const seen = new Map([
    ['a', SwapStatusEnum.AwaitingExternalDeposit],
    ['b', SwapStatusEnum.Expired],
    ['c', SwapStatusEnum.Pending],
    ['d', SwapStatusEnum.Expired],
  ]);
  const now = [
    expired({ recordId: 'a' }),
    expired({ recordId: 'b' }),
    expired({ recordId: 'c' }),
    expired({
      recordId: 'd',
      status: SwapStatusEnum.Pending,
      lateDepositAtMs: T0,
      ...paid,
    }),
    expired({ recordId: 'e' }),
  ];

  expect(newlyExpired(seen, now).map(r => r.recordId)).toEqual(['a']);
  expect(newlyRefunding(seen, now).map(r => r.recordId)).toEqual(['d']);
});
