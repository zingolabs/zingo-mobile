import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import {
  MIN_REMAINING_VALIDITY_MS,
  STALE_QUOTE_GRACE_MS,
  carryOverRoutes,
  quoteQuestionKey,
} from '@app/swap/keepLastQuote';
import type { QuoteInput } from '@app/swap/SwapService';
import type { RouteOptionType } from '@app/swap/types/RouteOptionType';

const asset = (swapKitId: string) => ({ swapKitId }) as QuoteInput['sellAsset'];
const input = (overrides: Partial<QuoteInput> = {}): QuoteInput => ({
  sellAsset: asset('ZEC.ZEC'),
  receiveAsset: asset('SOL.USDC-EPjF'),
  sellAmountHumanDecimal: '0.1',
  sourceAddress: 't1source',
  destinationAddress: 'sol-dest',
  slippageBps: 100,
  ...overrides,
});
const route = (provider: SwapKitProviderEnum, expiresAtMs?: number) =>
  ({
    routeId: `${provider}-${expiresAtMs ?? 'none'}`,
    provider,
    expiresAtMs,
  }) as RouteOptionType;

const NOW = 1_000_000;
const KEY = quoteQuestionKey(input());
const TWELVE_MIN = 12 * 60_000;
const carry = (
  overrides: Partial<Parameters<typeof carryOverRoutes>[0]> = {},
) =>
  carryOverRoutes({
    questionKey: KEY,
    shownQuestionKey: KEY,
    shownRoutes: [],
    freshRoutes: [],
    lastFreshAtMs: NOW - 20_000,
    nowMs: NOW,
    ...overrides,
  });

describe('carryOverRoutes', () => {
  // The report: Flashnet's route, valid for twelve minutes and chosen, gone on
  // the next refresh because Flashnet did not answer that one.
  it('keeps a chosen route the refresh did not bring back, while it is still valid', () => {
    const flashnet = route(SwapKitProviderEnum.Flashnet, NOW + TWELVE_MIN);
    const fresh = [route(SwapKitProviderEnum.Near, NOW + TWELVE_MIN)];
    expect(
      carry({
        shownRoutes: [route(SwapKitProviderEnum.Near), flashnet],
        freshRoutes: fresh,
      }),
    ).toEqual([flashnet]);
  });

  it('keeps the routes on screen through a refresh that brought none', () => {
    const shown = [
      route(SwapKitProviderEnum.Near, NOW + TWELVE_MIN),
      route(SwapKitProviderEnum.Flashnet, NOW + TWELVE_MIN),
    ];
    expect(carry({ shownRoutes: shown })).toEqual(shown);
  });

  // A fresh route replaces the old one from the same provider.
  it('does not carry a provider that answered again', () => {
    const shown = [route(SwapKitProviderEnum.Near, NOW + TWELVE_MIN)];
    expect(
      carry({
        shownRoutes: shown,
        freshRoutes: [route(SwapKitProviderEnum.Near, NOW + TWELVE_MIN)],
      }),
    ).toEqual([]);
  });

  it('lets a changed question have its own answer', () => {
    const shown = [route(SwapKitProviderEnum.Flashnet, NOW + TWELVE_MIN)];
    const other = quoteQuestionKey(input({ sellAmountHumanDecimal: '0.2' }));
    expect(carry({ questionKey: other, shownRoutes: shown })).toEqual([]);
  });

  // Time to review and commit: a route about to expire is not worth offering.
  it('drops a route with less than a minute of validity left', () => {
    const shown = [
      route(SwapKitProviderEnum.Flashnet, NOW + MIN_REMAINING_VALIDITY_MS - 1),
    ];
    expect(carry({ shownRoutes: shown })).toEqual([]);
  });

  it('carries a route with no expiry only briefly', () => {
    const shown = [route(SwapKitProviderEnum.Flashnet)];
    expect(carry({ shownRoutes: shown })).toEqual(shown);
    expect(
      carry({ shownRoutes: shown, lastFreshAtMs: NOW - STALE_QUOTE_GRACE_MS }),
    ).toEqual([]);
  });
});

describe('quoteQuestionKey', () => {
  it('changes with every input the quote depends on', () => {
    const base = quoteQuestionKey(input());
    expect(quoteQuestionKey(input({ slippageBps: 300 }))).not.toBe(base);
    expect(quoteQuestionKey(input({ destinationAddress: 'other' }))).not.toBe(
      base,
    );
    expect(
      quoteQuestionKey(input({ receiveAsset: asset('TRON.USDT-TR7') })),
    ).not.toBe(base);
    expect(quoteQuestionKey(input())).toBe(base);
  });
});
