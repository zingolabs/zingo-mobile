import { prefillFromRecord } from '@app/swap/swapPrefill';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

const BTC = {
  swapKitId: 'BTC.BTC',
  chain: 'BTC',
  symbol: 'BTC',
  ticker: 'BTC',
  chainId: 'bitcoin',
  decimals: 8,
};

const record: SwapRecordType = {
  recordId: 'rec-1',
  depositAddress: 'bc1qdeposit',
  provider: SwapKitProviderEnum.Near,
  direction: SwapDirectionEnum.Inbound,
  routeId: 'route-1',
  sellAsset: BTC,
  receiveAsset: {
    swapKitId: 'ZEC.ZEC',
    chain: 'ZEC',
    symbol: 'ZEC',
    ticker: 'ZEC',
    chainId: 'zcash',
    decimals: 8,
  },
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
  createdAtMs: 1_700_000_000_000,
  updatedAtMs: 1_700_000_000_000,
};

test('Tests that a new quote starts from the expired purchase’s coin, amount and refund address', () => {
  expect(prefillFromRecord(record, 42)).toEqual({
    sellAsset: BTC,
    sellAmountHumanDecimal: '0.03',
    refundAddress: 'bc1qrefund',
    requestedAtMs: 42,
  });
});
