import { formatAmount } from '@app/utils/formatAmount';

/**
 * A swap amount string from SwapKit or a provider (sometimes 18+ decimals)
 * in the app's amount format. Missing or unparseable input reads as zero.
 *
 * **Do NOT** use this for values the user has to reproduce byte-for-byte
 * (the exact deposit amount, anything copied to the clipboard): those keep
 * every decimal, through `formatExactAmount` on screen.
 */
export function formatAmountForDisplay(raw: string | undefined): string {
  const n = parseFloat(raw ?? '0');
  return formatAmount(Number.isFinite(n) ? n : 0);
}
