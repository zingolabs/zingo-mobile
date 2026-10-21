jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);
jest.mock('@app/walletBackend', () => ({
  deriveRefundAddress: jest.fn(async () => ({
    ok: true,
    value: JSON.stringify({ encoded_address: 't1ephemeral' }),
  })),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ChainNameEnum } from '@app/AppState';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import type {
  QuoteInput,
  RouteOptionType,
  SwapService,
  TokenEntryType,
} from '@app/swap';
import { useSwapForm } from '@screens/Swap/useSwapForm';

const BTC: TokenEntryType = {
  chain: 'BTC',
  chainId: 'bitcoin',
  ticker: 'BTC',
  identifier: 'BTC.BTC',
  symbol: 'BTC',
  name: 'Bitcoin',
  decimals: 8,
};

const route = (overrides: Partial<RouteOptionType> = {}): RouteOptionType => ({
  routeId: 'route-near',
  provider: SwapKitProviderEnum.NearIntents,
  expectedReceiveAmount: '0.002',
  minReceiveAmount: '0.0019',
  totalFeesInSellAsset: '0.001',
  ...overrides,
});

const BTC_ADDRESS = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

const service = (routes: RouteOptionType[] = [route()]) => {
  const quote = jest.fn(async (_input: QuoteInput) => ({
    routes,
    unavailable: [],
    rawResponse: {},
  }));
  const listRoutableTokens = jest.fn(async () => [BTC]);
  return {
    swapService: { quote, listRoutableTokens } as unknown as SwapService,
    quote,
  };
};

const render = (swapService: SwapService, spendable = 10) =>
  renderHook(() =>
    useSwapForm({
      swapService,
      spendable,
      zecChain: ChainNameEnum.mainChainName,
      mixnetBlocked: false,
    }),
  );

const settle = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('Tests that the form quotes once the amount settles when the catalog has landed', async () => {
  const { swapService, quote } = service();
  const { result } = render(swapService);
  await waitFor(() => expect(result.current.selectedToken).toEqual(BTC));

  act(() => result.current.setAmount('1'));
  expect(result.current.cta).toBe('noAddress');
  await settle(999);
  expect(quote).not.toHaveBeenCalled();
  await settle(1);
  await waitFor(() => expect(result.current.routes).toHaveLength(1));

  expect(quote).toHaveBeenCalledTimes(1);
  expect(quote.mock.calls[0][0]).toMatchObject({
    sellAmountHumanDecimal: '1',
    sellAsset: { swapKitId: 'ZEC.ZEC' },
    receiveAsset: { swapKitId: 'BTC.BTC' },
  });
  expect(result.current.chosenRoute?.routeId).toBe('route-near');
});

test('Tests that the main action is ready when a valid destination address is bound to the quote', async () => {
  const { swapService, quote } = service();
  const { result } = render(swapService);
  await waitFor(() => expect(result.current.selectedToken).toEqual(BTC));

  act(() => {
    result.current.setAmount('1');
    result.current.setActiveAddress(BTC_ADDRESS);
  });
  await waitFor(() => expect(result.current.addressValid).toBe(true));
  await settle(1000);
  await waitFor(() => expect(result.current.cta).toBe('ready'));

  expect(quote.mock.calls[0][0]).toMatchObject({
    destinationAddress: BTC_ADDRESS,
    sourceAddress: 't1ephemeral',
  });
  let taken: ReturnType<typeof result.current.review> = null;
  act(() => {
    taken = result.current.review();
  });
  expect(taken?.route.routeId).toBe('route-near');
});

test('Tests that a quote with no routes is asked once until an input changes', async () => {
  const { swapService, quote } = service([]);
  const { result } = render(swapService);
  await waitFor(() => expect(result.current.selectedToken).toEqual(BTC));

  act(() => result.current.setAmount('0.0001'));
  await settle(1000);
  await waitFor(() => expect(result.current.cta).toBe('noRoutes'));
  await settle(5000);
  expect(quote).toHaveBeenCalledTimes(1);

  act(() => result.current.setAmount('0.5'));
  await settle(1000);
  await waitFor(() => expect(quote).toHaveBeenCalledTimes(2));
});

test('Tests that flipping the direction drops the routes and quotes the other way round', async () => {
  const { swapService, quote } = service();
  const { result } = render(swapService);
  await waitFor(() => expect(result.current.selectedToken).toEqual(BTC));
  act(() => result.current.setAmount('1'));
  await settle(1000);
  await waitFor(() => expect(result.current.routes).toHaveLength(1));

  act(() => result.current.flip());

  expect(result.current.isOutbound).toBe(false);
  expect(result.current.routes).toBeNull();
  await waitFor(() => expect(result.current.selectedToken).toEqual(BTC));
  await settle(1000);
  await waitFor(() => expect(quote).toHaveBeenCalledTimes(2));
  expect(quote.mock.calls[1][0]).toMatchObject({
    sellAsset: { swapKitId: 'BTC.BTC' },
    receiveAsset: { swapKitId: 'ZEC.ZEC' },
  });
});

test('Tests that an amount over the spendable balance is refused when selling ZEC', async () => {
  const { swapService } = service();
  const { result } = render(swapService, 0.5);
  await waitFor(() => expect(result.current.selectedToken).toEqual(BTC));

  act(() => result.current.setAmount('1'));

  expect(result.current.overBalance).toBe(true);
  expect(result.current.cta).toBe('overBalance');
});
