/**
 * A ZEC amount as History and the transaction detail show it: at least one
 * decimal and no trailing zeros (2.0, 0.1, 1.6234), up to 4 decimals from 1
 * ZEC and 8 under it, as the swap rows. Cut, never rounded up, like the
 * balance: a row must not show more than the wallet holds.
 */
export function formatZecAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) {
    return '0.0';
  }
  const decimals = Math.abs(amount) >= 1 ? 4 : 8;
  const [whole, fraction = ''] = Math.abs(amount).toFixed(10).split('.');
  const kept = fraction.slice(0, decimals).replace(/0+$/, '') || '0';
  return `${amount < 0 ? '-' : ''}${whole}.${kept}`;
}
