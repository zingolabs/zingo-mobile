import { formatExactAmount } from '@app/utils/formatAmount';

/**
 * A provider's minimum in the amount format, but to the zatoshi at any size
 * (1.00068, not 1.0006): a minimum cut lower than it is would still be
 * refused.
 */
export function formatMinimumAmount(minimum: number): string {
  return formatExactAmount(
    minimum.toFixed(8).replace(/0+$/, '').replace(/\.$/, '.0'),
  );
}
