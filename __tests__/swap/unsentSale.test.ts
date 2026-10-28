import { canResendSale, unsentSale } from '@app/swap/unsentSale';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

const NOW = 1_700_000_000_000;

const sale: SwapRecordType = {
  recordId: 'rec-1',
  depositAddress: 'zs1vault',
  provider: SwapKitProviderEnum.Near,
  direction: SwapDirectionEnum.Outbound,
  routeId: 'route-1',
  sellAsset: {
    swapKitId: 'ZEC.ZEC',
    chain: 'ZEC',
    symbol: 'ZEC',
    ticker: 'ZEC',
    chainId: 'zcash',
    decimals: 8,
  },
  receiveAsset: {
    swapKitId: 'BTC.BTC',
    chain: 'BTC',
    symbol: 'BTC',
    ticker: 'BTC',
    chainId: 'bitcoin',
    decimals: 8,
  },
  sellAmountHumanDecimal: '0.01',
  expectedReceiveAmount: '0.00005',
  minReceiveAmount: '0.00004',
  destinationAddress: 'bc1qdestination',
  sourceAddress: 'u1refund',
  status: SwapStatusEnum.PendingDeposit,
  quoteExpiresAtMs: NOW + 10 * 60_000,
  providerData: {
    kind: SwapKitProviderEnum.Near,
    depositAddress: 'zs1vault',
  },
  fiatValueBasis: {
    sellUsdUnitPrice: 30,
    receiveUsdUnitPrice: 60000,
    capturedAt: 0,
  },
  createdAtMs: NOW,
  updatedAtMs: NOW,
};

test('Tests that a sale is unsent while its ZEC has not left, and not once it did or for a purchase', () => {
  expect(unsentSale(sale)).toBe(true);
  expect(unsentSale({ ...sale, status: SwapStatusEnum.Pending })).toBe(false);
  expect(
    unsentSale({
      ...sale,
      direction: SwapDirectionEnum.Inbound,
      status: SwapStatusEnum.AwaitingExternalDeposit,
    }),
  ).toBe(false);
});

test('Tests that an unsent sale is sent again only while its quote holds', () => {
  expect(canResendSale(sale, NOW)).toBe(true);
  expect(canResendSale(sale, NOW + 9.5 * 60_000)).toBe(false);
  expect(canResendSale(sale, NOW + 2 * 24 * 60 * 60_000)).toBe(false);
});

test('Tests that an unsent sale made before its quote’s expiry was kept gets a new quote', () => {
  expect(canResendSale({ ...sale, quoteExpiresAtMs: undefined }, NOW)).toBe(
    false,
  );
});
