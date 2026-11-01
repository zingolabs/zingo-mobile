import { SwapService } from '@app/swap/SwapService';
import { createDefaultProviderRegistry } from '@app/swap/providers/ProviderRegistry';
import type { SwapKitClient } from '@app/swap/SwapKitClient';
import type { SwapPoller } from '@app/swap/SwapPoller';
import type { SwapStore } from '@app/swap/SwapStore';
import type { TokenCatalog } from '@app/swap/TokenCatalog';

const serviceAnswering = (answer: unknown) => {
  const price = jest.fn(async () => answer);
  const service = new SwapService({
    client: { price } as unknown as SwapKitClient,
    registry: createDefaultProviderRegistry(),
    store: {} as unknown as typeof SwapStore,
    poller: { start: jest.fn() } as unknown as SwapPoller,
    tokenCatalog: null as unknown as TokenCatalog,
  });
  return { service, price };
};

test('Tests that a coin’s USD price is read from its row when SwapKit answers a list', async () => {
  const { service, price } = serviceAnswering([
    { identifier: 'ETH.ETH', price_usd: 2300 },
    { identifier: 'BTC.BTC', price_usd: 60000 },
  ]);

  expect(await service.usdPrice('BTC.BTC')).toBe(60000);
  expect(price).toHaveBeenCalledWith(['BTC.BTC']);
});

test('Tests that a single row is read whatever it calls its price field', async () => {
  expect(
    await serviceAnswering([{ priceUsd: '61000.5' }]).service.usdPrice(
      'BTC.BTC',
    ),
  ).toBe(61000.5);
});

test('Tests that there is no price when SwapKit answers none, a zero, or an unknown shape', async () => {
  expect(await serviceAnswering([]).service.usdPrice('BTC.BTC')).toBeNull();
  expect(
    await serviceAnswering([
      { identifier: 'BTC.BTC', price_usd: 0 },
    ]).service.usdPrice('BTC.BTC'),
  ).toBeNull();
  expect(
    await serviceAnswering({ message: 'nope' }).service.usdPrice('BTC.BTC'),
  ).toBeNull();
});
