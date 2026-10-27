import {
  NEAR_NO_REFUND_USD,
  nearRefusesSmallRefunds,
} from '@app/swap/nearSmallSwap';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';

const buy = (provider: SwapKitProviderEnum | undefined, sellUsd: number) =>
  nearRefusesSmallRefunds({
    provider,
    direction: SwapDirectionEnum.Inbound,
    sellUsd,
  });

test('Tests that a purchase through NEAR under the line gets the warning and one at or over it does not', () => {
  expect(buy(SwapKitProviderEnum.Near, 120)).toBe(true);
  expect(buy(SwapKitProviderEnum.Near, NEAR_NO_REFUND_USD - 0.01)).toBe(true);
  expect(buy(SwapKitProviderEnum.Near, NEAR_NO_REFUND_USD)).toBe(false);
  expect(buy(SwapKitProviderEnum.Near, 1_000)).toBe(false);
});

test('Tests that another provider, a sale and an unpriced quote get no warning', () => {
  expect(buy(SwapKitProviderEnum.MayachainStreaming, 120)).toBe(false);
  expect(buy(undefined, 120)).toBe(false);
  expect(buy(SwapKitProviderEnum.Near, 0)).toBe(false);
  expect(buy(SwapKitProviderEnum.Near, NaN)).toBe(false);
  expect(
    nearRefusesSmallRefunds({
      provider: SwapKitProviderEnum.Near,
      direction: SwapDirectionEnum.Outbound,
      sellUsd: 120,
    }),
  ).toBe(false);
});
