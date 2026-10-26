import { canRemoveSwap } from '@app/swap/canRemoveSwap';
import { BroadcastStatusEnum } from '@app/swap/enums/BroadcastStatusEnum';
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

const inbound = (overrides: Partial<SwapRecordType> = {}): SwapRecordType => ({
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
  createdAtMs: 1_700_000_000_000,
  updatedAtMs: 1_700_000_000_000,
  ...overrides,
});

const paid = { observedDepositTxHash: 'ab'.repeat(32) };

test('Tests that an expired or failed swap can be deleted when the provider never saw a deposit', () => {
  expect(canRemoveSwap(inbound())).toBe(true);
  expect(canRemoveSwap(inbound({ status: SwapStatusEnum.Failed }))).toBe(true);
});

test('Tests that an expired or failed swap stays when a deposit was seen', () => {
  expect(canRemoveSwap(inbound(paid))).toBe(false);
  expect(
    canRemoveSwap(inbound({ status: SwapStatusEnum.Failed, ...paid })),
  ).toBe(false);
});

test('Tests that a sale whose ZEC never left can be deleted and one that was broadcast cannot', () => {
  const sale = inbound({
    direction: SwapDirectionEnum.Outbound,
    sellAsset: ZEC,
    receiveAsset: BTC,
    status: SwapStatusEnum.PendingDeposit,
    broadcast: { status: BroadcastStatusEnum.PendingBroadcast },
  });
  expect(canRemoveSwap(sale)).toBe(true);
  expect(
    canRemoveSwap({
      ...sale,
      status: SwapStatusEnum.Failed,
      broadcast: {
        status: BroadcastStatusEnum.Broadcasted,
        txId: 'cd'.repeat(32),
      },
    }),
  ).toBe(false);
});

test('Tests that an awaited deposit, a swap in motion, a refund and a completed swap cannot be deleted', () => {
  for (const status of [
    SwapStatusEnum.AwaitingExternalDeposit,
    SwapStatusEnum.Pending,
    SwapStatusEnum.Processing,
    SwapStatusEnum.IncompleteDeposit,
    SwapStatusEnum.ProviderStatusUnknown,
    SwapStatusEnum.Refunded,
    SwapStatusEnum.Completed,
  ]) {
    expect(canRemoveSwap(inbound({ status }))).toBe(false);
  }
});
