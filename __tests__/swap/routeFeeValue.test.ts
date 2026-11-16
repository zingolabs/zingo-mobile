jest.mock('@app/RPCModule', () =>
  require('../../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import type {
  FiatValueBasisType,
  QuoteInput,
  RouteOptionType,
} from '@app/swap';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { routeFeeValue } from '@screens/Swap/routeFeeValue';

const route = (overrides: Partial<RouteOptionType> = {}): RouteOptionType => ({
  routeId: 'route-near',
  provider: SwapKitProviderEnum.Near,
  expectedReceiveAmount: '0.98',
  minReceiveAmount: '0.97',
  ...overrides,
});

const quoteInput = {
  sellAsset: { ticker: 'ZEC', symbol: 'ZEC' },
  receiveAsset: { ticker: 'USDT', symbol: 'USDT' },
  sellAmountHumanDecimal: '2',
} as unknown as QuoteInput;

const prices = {
  sellUsdUnitPrice: 50,
  receiveUsdUnitPrice: 1,
} as FiatValueBasisType;

test('Tests that the fee reads as a share of the sale with its dollars when it is in the sold asset', () => {
  expect(
    routeFeeValue({
      route: route({ totalFeesInSellAsset: '0.02' }),
      quoteInput,
      fiatValueBasis: prices,
      isOutbound: true,
    }),
  ).toBe('1% · ≈ $1.00');
});

test('Tests that the fee reads as the amount when no share can be told', () => {
  expect(
    routeFeeValue({
      route: route(),
      quoteInput,
      fiatValueBasis: prices,
      isOutbound: true,
    }),
  ).toBe('—');
});
