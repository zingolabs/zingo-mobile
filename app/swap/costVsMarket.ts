/**
 * What a route delivers compared with what the user sends, both valued at the
 * market prices SwapKit quotes alongside it.
 *
 * SwapKit reports this per route as `totalSlippageBps`, and the name misleads:
 * it is neither the slippage tolerance nor a minimum. Checked against live
 * quotes on 2026-09-12, it equals `expectedBuyAmount` at the buy price over
 * `sellAmount` at the sell price, minus one, to every decimal it carries, and
 * it did not move when the requested tolerance went from 1% to 3%. It is the
 * all-in cost of the route: fees, spread and price impact together.
 *
 * That makes it the one figure that compares routes on price. In the quote it
 * was checked against, Flashnet delivered half a point less than NEAR and was
 * about six times faster, a trade the screen could not show before.
 *
 * Put in words rather than as a signed percentage. A negative next to a fee
 * reads as a second charge to add to it, and a negative cost is a double
 * negative; "below market value, fees included" says both what it is and that
 * the fee is already inside it.
 */

import { swapKey } from './swapText';
import type { SwapTextType } from './swapText';

/** Below this many basis points either way, the route is at market. */
const AT_MARKET_BPS = 0.5;

export function describeCostVsMarket(
  bps: number | undefined,
): SwapTextType | undefined {
  if (typeof bps !== 'number' || !Number.isFinite(bps)) return undefined;
  if (Math.abs(bps) < AT_MARKET_BPS) return swapKey('swap.msg-at-market');
  const percent = (Math.abs(bps) / 100).toFixed(2);
  return swapKey(bps < 0 ? 'swap.msg-below-market' : 'swap.msg-above-market', {
    percent,
  });
}
