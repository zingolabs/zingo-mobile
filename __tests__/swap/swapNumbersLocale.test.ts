import { describeCostVsMarket } from '@app/swap/costVsMarket';
import { describeEmptyQuote } from '@app/swap/describeEmptyQuote';
import { formatFeeAmount } from '@app/swap/feeConversion';
import { formatMinimumAmount } from '@app/swap/formatMinimumAmount';
import { describeSlippageTolerance } from '@app/swap/slippageReport';
import { toDottedDecimal } from '@app/swap/toDottedDecimal';
import { english } from '../../__mocks__/dataMocks/swap/englishText';

jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => ({
    decimalSeparator: ',',
    groupingSeparator: '.',
  }),
}));

describe('swap numbers on a device with a decimal comma', () => {
  test('Tests that percentages take the comma', () => {
    expect(english(describeCostVsMarket(-142.077722))).toBe(
      '1,42% below market value, fees included',
    );
    expect(english(describeSlippageTolerance(25))).toBe('0,25%');
  });

  test('Tests that a fee takes the comma, also under the threshold', () => {
    expect(formatFeeAmount('1.5')).toBe('1,5');
    expect(formatFeeAmount(0.00000000123)).toBe('< 0,00000001');
  });

  test('Tests that a minimum takes the comma and keeps every zatoshi when it is above 1', () => {
    expect(formatMinimumAmount(1.00068)).toBe('1,00068');
    expect(formatMinimumAmount(2)).toBe('2,0');
    expect(
      english(
        describeEmptyQuote(
          {
            routes: [],
            providerErrors: [
              {
                provider: 'NEAR',
                errorCode: 'sellAssetAmountTooSmall',
                minAmount: '0.01068069',
              },
            ],
          },
          'ZEC',
        ),
      ),
    ).toContain('0,01068069 ZEC');
  });

  test('Tests that the amount sent to SwapKit stays dotted and never in exponent notation', () => {
    expect(toDottedDecimal(1.5)).toBe('1.5');
    expect(toDottedDecimal(0.0000001)).toBe('0.0000001');
    expect(toDottedDecimal(12)).toBe('12');
  });
});
