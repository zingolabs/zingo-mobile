/**
 * Compact user-facing formatter for swap amount strings.
 *
 * SwapKit and providers surface amounts as decimal strings with arbitrary
 * precision (sometimes 18+ decimals for EVM ERC20 conversions), which
 * overflows off narrow screens when rendered raw. This helper caps the
 * displayed precision to values that make sense across the assets we
 * route (BTC=8, ZEC=8, ETH/EVM natives get rounded, USDC/USDT=6 max) and
 * trims trailing zeros so `0.5` never renders as `0.50000000`.
 *
 * Rules:
 *   - Missing input, unparseable input, and 0 all render as `"0"`.
 *   - Values ≥ 1 use up to 4 decimals — enough to disambiguate amounts
 *     the user is likely to eyeball (rates, USD-side conversions).
 *   - Values < 1 use up to 8 decimals — the "smallest denomination" limit
 *     for the assets in scope (satoshis, zatoshis).
 *   - Trailing zeros after the decimal point are stripped; the decimal
 *     point itself is stripped if nothing remains after it.
 *
 * **Do NOT** use this for values the user has to reproduce byte-for-byte:
 *   - The "Exact amount" row on channel-based providers (NEAR Intents,
 *     Flashnet) where any deviation causes a refund.
 *   - Anything copied to the clipboard for pasting into another app.
 * Those must keep the raw provider-supplied string.
 */
export function formatAmountForDisplay(raw: string | undefined): string {
  const n = parseFloat(raw ?? '0');
  if (!Number.isFinite(n) || n === 0) return '0';
  const decimals = Math.abs(n) >= 1 ? 4 : 8;
  const fixed = n.toFixed(decimals);
  if (!fixed.includes('.')) return fixed;
  return fixed.replace(/0+$/, '').replace(/\.$/, '');
}
