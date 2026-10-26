import { newlyExpired } from '@app/swap/newlyExpired';
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

const record = (recordId: string, status: SwapStatusEnum): SwapRecordType => ({
  recordId,
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
  status,
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
});

test('Tests that only a swap seen awaiting its deposit counts when it turns up expired', () => {
  const seen = new Map([
    ['a', SwapStatusEnum.AwaitingExternalDeposit],
    ['b', SwapStatusEnum.Expired],
    ['c', SwapStatusEnum.Pending],
  ]);
  const now = [
    record('a', SwapStatusEnum.Expired),
    record('b', SwapStatusEnum.Expired),
    record('c', SwapStatusEnum.Expired),
    record('d', SwapStatusEnum.Expired),
    record('e', SwapStatusEnum.AwaitingExternalDeposit),
  ];

  expect(newlyExpired(seen, now).map(r => r.recordId)).toEqual(['a']);
});
