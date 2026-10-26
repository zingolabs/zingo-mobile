import { getNumberFormatSettings } from 'react-native-localize';

/**
 * How numbers read across the app, with the device's decimal separator.
 * Amounts never group thousands; block heights and counts take the
 * device's grouping separator.
 */

const decimalSeparator = () => getNumberFormatSettings().decimalSeparator;

const localize = (dotted: string) => dotted.replace('.', decimalSeparator());

/** Cuts `value` to `decimals` places without rounding, as dotted text. */
const cut = (value: number, decimals: number): string => {
  const [whole, fraction = ''] = Math.abs(value).toFixed(10).split('.');
  return `${value < 0 ? '-' : ''}${whole}.${fraction.slice(0, decimals)}`;
};

/**
 * An amount of ZEC or another coin: at least one decimal and no trailing
 * zeros (2,0 · 0,1 · 1,6234), up to 4 decimals from 1 and 8 under it. Cut,
 * never rounded up: a row must not show more than the wallet holds.
 */
export function formatAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) {
    return localize('0.0');
  }
  const dotted = cut(amount, Math.abs(amount) >= 1 ? 4 : 8);
  return localize(dotted.replace(/0+$/, '').replace(/\.$/, '.0'));
}

/**
 * An amount the user has to reproduce exactly (a deposit to send from
 * another wallet): every decimal of the dotted source, only the separator
 * changes.
 */
export function formatExactAmount(dotted: string): string {
  return localize(dotted);
}

/** A US dollar figure: `$` and two decimals, no grouping. */
export function formatUsd(usd: number): string {
  return `$${localize((Number.isFinite(usd) ? usd : 0).toFixed(2))}`;
}

/** A percentage up to `maxDecimals` places, trailing zeros dropped, no `%`. */
export function formatPercent(
  percent: number,
  maxDecimals: number = 2,
): string {
  const dotted = String(Number(percent.toFixed(maxDecimals)));
  return localize(dotted);
}

/** A block height or a count, grouped with the device's separator. */
export function formatInteger(value: number): string {
  const { groupingSeparator } = getNumberFormatSettings();
  const digits = String(Math.trunc(Math.abs(value)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, groupingSeparator);
  return `${value < 0 ? '-' : ''}${grouped}`;
}

/**
 * An amount to put into an input, as the user would type it: up to 8
 * decimals, cut, no trailing zeros, never exponent notation.
 */
export function toAmountInput(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return '';
  }
  return localize(cut(amount, 8).replace(/0+$/, '').replace(/\.$/, ''));
}

/**
 * Reads a typed or pasted amount: the device's decimal separator, or a dot
 * (amounts pasted from elsewhere). NaN when it is not a number.
 */
export function parseAmountInput(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return NaN;
  }
  const separator = decimalSeparator();
  const normalized =
    separator === '.' ? trimmed : trimmed.replace(separator, '.');
  return /^\d*\.?\d*$/.test(normalized) && normalized !== '.'
    ? Number(normalized)
    : NaN;
}
