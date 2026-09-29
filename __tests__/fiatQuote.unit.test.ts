jest.mock('@app/RPCModule', () => ({
  default: {},
}));

import { ChainNameEnum, SelectServerEnum, ZecPriceType } from '@app/AppState';
import Utils from '@app/utils';
import {
  fiatEligible,
  fiatQuote,
  toFiatText,
  toZecText,
} from '@app/price/fiatQuote';

type AppFacts = {
  selectServer: SelectServerEnum;
  serverChain: ChainNameEnum;
  infoChain: ChainNameEnum;
  zecPrice: ZecPriceType;
};

const reachableFacts = (): AppFacts[] =>
  Object.values(SelectServerEnum).flatMap(selectServer =>
    Object.values(ChainNameEnum)
      .filter(wallet => wallet !== ChainNameEnum.noneChainName)
      .flatMap(wallet =>
        [
          { zecPrice: 0, date: 0 },
          { zecPrice: 33.33, date: 1_700_000_000_000 },
        ].map(zecPrice => ({
          selectServer,
          serverChain:
            selectServer === SelectServerEnum.offline
              ? ChainNameEnum.noneChainName
              : wallet,
          infoChain: wallet,
          zecPrice,
        })),
      ),
  );

const quoted = (
  zecPrice: ZecPriceType,
  chain: ChainNameEnum,
  selectServer: SelectServerEnum,
) => fiatQuote(zecPrice, chain, selectServer).kind === 'quote';

test('Tests that the price driver fetches in the same states as before when fiatEligible replaces its guard. The legacy guard checks the server selection and the info chain.', () => {
  reachableFacts().forEach(f => {
    const legacy =
      f.selectServer !== SelectServerEnum.offline &&
      f.infoChain === ChainNameEnum.mainChainName;
    expect(fiatEligible(f.infoChain, f.selectServer)).toBe(legacy);
  });
});

test('Tests that the header fiat rows appear in the same states as before when fiatQuote replaces their guards. BalanceRow checked the date and PriceRow checked the price.', () => {
  reachableFacts().forEach(f => {
    const balanceRow =
      f.selectServer !== SelectServerEnum.offline &&
      f.infoChain === ChainNameEnum.mainChainName &&
      f.zecPrice.date > 0;
    const priceRow = !(
      f.zecPrice.zecPrice <= 0 ||
      f.selectServer === SelectServerEnum.offline ||
      f.infoChain !== ChainNameEnum.mainChainName
    );
    const quote = quoted(f.zecPrice, f.infoChain, f.selectServer);
    expect(quote).toBe(balanceRow);
    expect(quote).toBe(priceRow);
  });
});

test('Tests that the Send and Confirm fiat controls appear in the same states as before when the shared guards replace theirs. Send and Confirm read the server chain.', () => {
  reachableFacts().forEach(f => {
    const onMain = f.serverChain === ChainNameEnum.mainChainName;
    expect(fiatEligible(f.serverChain, f.selectServer)).toBe(onMain);
    const quote = quoted(f.zecPrice, f.serverChain, f.selectServer);
    expect(quote).toBe(onMain && f.zecPrice.zecPrice > 0);
    expect(quote).toBe(onMain && f.zecPrice.date > 0);
  });
});

test('Tests that fiatQuote carries the fetched price and date when it yields a quote.', () => {
  expect(
    fiatQuote(
      { zecPrice: 33.33, date: 42 },
      ChainNameEnum.mainChainName,
      SelectServerEnum.auto,
    ),
  ).toEqual({ kind: 'quote', price: 33.33, date: 42 });
});

const legacyToFiat = (text: string, price: number) =>
  isNaN(Utils.parseStringLocaleToNumberFloat(text))
    ? ''
    : text && price > 0
      ? Utils.parseNumberFloatToStringLocale(
          Utils.parseStringLocaleToNumberFloat(text) * price,
          2,
        )
      : '';

const legacyToZec = (text: string, price: number) =>
  isNaN(Utils.parseStringLocaleToNumberFloat(text))
    ? ''
    : text && price > 0
      ? Utils.parseNumberFloatToStringLocale(
          Utils.parseStringLocaleToNumberFloat(text) / price,
          8,
        )
      : '';

const texts = [
  '',
  '0',
  '1',
  '1.5',
  '0.00000001',
  '12345678.9',
  'abc',
  '1.2.3',
  ' ',
  '-2',
];
const prices = [-1, 0, 0.01, 33.33, 1e6, NaN];

test('Tests that toFiatText returns the legacy Send text for every text and price. The inputs include empty, malformed, negative, and zero values.', () => {
  texts.forEach(t =>
    prices.forEach(p => expect(toFiatText(t, p)).toBe(legacyToFiat(t, p))),
  );
});

test('Tests that toZecText returns the legacy Send text for every text and price. The inputs include empty, malformed, negative, and zero values.', () => {
  texts.forEach(t =>
    prices.forEach(p => expect(toZecText(t, p)).toBe(legacyToZec(t, p))),
  );
});
