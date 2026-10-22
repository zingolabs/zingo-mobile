import { describeCostVsMarket as describeCostVsMarketText } from '@app/swap/costVsMarket';
import { english } from '../../__mocks__/dataMocks/swap/englishText';

/** The sentence as the English app shows it. */
const describeCostVsMarket = (
  ...args: Parameters<typeof describeCostVsMarketText>
) => english(describeCostVsMarketText(...args));

/**
 * The figures are the ones two live quotes returned for 0.05 ZEC to USDC on
 * Solana: NEAR at -92.16 and Flashnet at -142.08 basis points. The wording is
 * what keeps the number from being read as a charge on top of the fee.
 */
describe('describeCostVsMarket', () => {
  it('states a route that delivers less than market value', () => {
    expect(describeCostVsMarket(-142.077722)).toBe(
      '1.42% below market value, fees included',
    );
    expect(describeCostVsMarket(-92.163718)).toBe(
      '0.92% below market value, fees included',
    );
  });

  it('states a route that delivers more', () => {
    expect(describeCostVsMarket(10)).toBe(
      '0.10% above market value, fees included',
    );
  });

  // Rounding a tiny figure to two decimals would print a signless 0.00 with a
  // direction attached, which says nothing true.
  it('calls a negligible difference at market', () => {
    expect(describeCostVsMarket(0.3)).toBe('At market value, fees included');
    expect(describeCostVsMarket(-0.4)).toBe('At market value, fees included');
  });

  it('says nothing when the provider reported nothing usable', () => {
    expect(describeCostVsMarket(undefined)).toBeUndefined();
    expect(describeCostVsMarket(NaN)).toBeUndefined();
    expect(describeCostVsMarket(Infinity)).toBeUndefined();
  });
});
