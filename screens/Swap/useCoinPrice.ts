import { useEffect, useState } from 'react';

/**
 * The USD price of a coin you buy ZEC with. SwapKit only gives it with a
 * quote, so the last price seen for each coin is kept: USD typing is offered
 * from the coin's first quote on, also after switching coins and back.
 * Returns 0 while the coin has never been quoted.
 */
export function useCoinPrice(
  quotedId: string | undefined,
  quotedPrice: number,
  coinId: string | undefined,
): number {
  const [prices, setPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    if (quotedId && quotedPrice > 0) {
      setPrices(known =>
        known[quotedId] === quotedPrice
          ? known
          : { ...known, [quotedId]: quotedPrice },
      );
    }
  }, [quotedId, quotedPrice]);
  return coinId ? (prices[coinId] ?? 0) : 0;
}
