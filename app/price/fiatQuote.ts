import { ChainNameEnum, ServerType, ZecPriceType } from '@app/AppState';
import Utils from '@app/utils';

export type FiatQuote =
  { kind: 'quote'; price: number; date: number } | { kind: 'none' };

/** Reports whether a remote server on the main chain admits a fiat price. */
export const fiatEligible = (
  server: ServerType,
  chainName: ChainNameEnum,
): boolean =>
  server.kind === 'remote' && chainName === ChainNameEnum.mainChainName;

/** Resolves the fetched price the UI converts with, or none when no conversion applies. */
export const fiatQuote = (
  zecPrice: ZecPriceType,
  server: ServerType,
  chainName: ChainNameEnum,
): FiatQuote =>
  fiatEligible(server, chainName) && zecPrice.zecPrice > 0 && zecPrice.date > 0
    ? { kind: 'quote', price: zecPrice.zecPrice, date: zecPrice.date }
    : { kind: 'none' };

const convert = (
  text: string,
  price: number,
  rate: (amount: number, price: number) => number,
  decimals: number,
): string => {
  const amount = Utils.parseStringLocaleToNumberFloat(text);
  return text && !isNaN(amount) && price > 0
    ? Utils.parseNumberFloatToStringLocale(rate(amount, price), decimals)
    : '';
};

/** Converts a locale ZEC amount to locale fiat text at two decimals, or '' when either input is unusable. */
export const toFiatText = (zecText: string, price: number): string =>
  convert(zecText, price, (zec, usd) => zec * usd, 2);

/** Converts a locale fiat amount to locale ZEC text at eight decimals, or '' when either input is unusable. */
export const toZecText = (fiatText: string, price: number): string =>
  convert(fiatText, price, (fiat, usd) => fiat / usd, 8);
