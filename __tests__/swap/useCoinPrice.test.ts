import { renderHook } from '@testing-library/react-native';
import { useCoinPrice } from '@screens/Swap/useCoinPrice';

type Props = { id?: string; price: number; coin?: string };

const coinPrice = (initial: Props) =>
  renderHook(({ id, price, coin }: Props) => useCoinPrice(id, price, coin), {
    initialProps: initial,
  });

describe('useCoinPrice', () => {
  test('Tests that there is no price when the coin was never quoted', () => {
    const { result } = coinPrice({ price: 0, coin: 'BTC.BTC' });
    expect(result.current).toBe(0);
  });

  test('Tests that the quoted price is the coin price when a quote comes', () => {
    const { result } = coinPrice({
      id: 'BTC.BTC',
      price: 60000,
      coin: 'BTC.BTC',
    });
    expect(result.current).toBe(60000);
  });

  test('Tests that a coin keeps its last price when another coin is picked and back', () => {
    const { result, rerender } = coinPrice({
      id: 'BTC.BTC',
      price: 60000,
      coin: 'BTC.BTC',
    });
    rerender({ id: 'BTC.BTC', price: 60000, coin: 'ETH.ETH' });
    expect(result.current).toBe(0);
    rerender({ id: 'ETH.ETH', price: 3000, coin: 'ETH.ETH' });
    expect(result.current).toBe(3000);
    rerender({ id: 'ETH.ETH', price: 3000, coin: 'BTC.BTC' });
    expect(result.current).toBe(60000);
  });

  test('Tests that a quote without a price keeps the last one when SwapKit omits it', () => {
    const { result, rerender } = coinPrice({
      id: 'BTC.BTC',
      price: 60000,
      coin: 'BTC.BTC',
    });
    rerender({ id: 'BTC.BTC', price: 0, coin: 'BTC.BTC' });
    expect(result.current).toBe(60000);
  });
});
