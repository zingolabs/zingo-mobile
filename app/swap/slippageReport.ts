/**
 * How a finished swap's slippage is put to the user: the tolerance it ran
 * under, and what it actually came to.
 *
 * Both are kept on the record because a refund investigation once turned on
 * the tolerance alone and nothing recorded it: Flashnet's order said 200 bps,
 * the app sends 100 unless the picker was changed, and nobody could say which
 * had been asked for.
 */

/** A basis-point figure as a percentage, to at most two decimals: 100 → "1". */
function percent(bps: number): string {
  return String(Number((Math.abs(bps) / 100).toFixed(2)));
}

const usable = (bps: number | undefined): bps is number =>
  typeof bps === 'number' && Number.isFinite(bps);

/**
 * The tolerance, and the one we asked for when the provider reports another.
 *
 * `requestedBps` is what the quote went out with, which the app always knows.
 * `appliedBps` is SwapKit's `slippageTolerance`, the tolerance of the quote
 * the swap committed to, which not every provider reports. When both exist
 * and disagree, both are shown: that disagreement is the thing worth seeing.
 */
export function describeSlippageTolerance(
  requestedBps?: number,
  appliedBps?: number,
): string | undefined {
  const requested = usable(requestedBps) ? requestedBps : undefined;
  const applied = usable(appliedBps) ? appliedBps : undefined;
  if (
    applied !== undefined &&
    requested !== undefined &&
    applied !== requested
  ) {
    return `${percent(applied)}% (${percent(requested)}% requested)`;
  }
  const shown = applied ?? requested;
  return shown === undefined ? undefined : `${percent(shown)}%`;
}

/** Below this many basis points either way, the swap settled as quoted. */
const AS_QUOTED_BPS = 0.5;

/**
 * What the swap came to against its quote.
 *
 * SwapKit's `realizedSlippageBps` is (expected - actual) / expected, so a
 * positive figure means the swap delivered LESS than quoted. The sign is the
 * opposite of the route cost figure, which is one more reason to say it in
 * words instead of printing a signed number.
 *
 * Phrased as what the user received against "expected", the amount the
 * detail view shows right above it. "1.95% more than quoted" left a user
 * asking what it meant; the figure only reads once it names both what
 * moved and what it moved against.
 */
export function describeRealizedSlippage(
  bps: number | undefined,
): string | undefined {
  if (!usable(bps)) return undefined;
  if (Math.abs(bps) < AS_QUOTED_BPS) return 'Received as expected';
  return `Received ${(Math.abs(bps) / 100).toFixed(2)}% ${bps > 0 ? 'less' : 'more'} than expected`;
}
