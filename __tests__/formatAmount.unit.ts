import {
  formatAmount,
  formatExactAmount,
  formatInteger,
  formatPercent,
  formatUsd,
  parseAmountInput,
  toAmountInput,
} from '@app/utils/formatAmount';

let mockSeparators = { decimalSeparator: ',', groupingSeparator: '.' };
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => mockSeparators,
}));

describe('on a device with a decimal comma', () => {
  beforeEach(() => {
    mockSeparators = { decimalSeparator: ',', groupingSeparator: '.' };
  });

  test('Tests that an amount takes the comma and is cut, never rounded', () => {
    expect(formatAmount(1.62349999)).toBe('1,6234');
    expect(formatAmount(0.00015)).toBe('0,00015');
    expect(formatAmount(2)).toBe('2,0');
    expect(formatAmount(0)).toBe('0,0');
    expect(formatAmount(12345.5)).toBe('12345,5');
  });

  test('Tests that an exact amount keeps every decimal', () => {
    expect(formatExactAmount('1.234567891')).toBe('1,234567891');
  });

  test('Tests that dollars take two decimals and no grouping', () => {
    expect(formatUsd(1234.5)).toBe('$1234,50');
  });

  test('Tests that a percentage drops trailing zeros', () => {
    expect(formatPercent(0.25)).toBe('0,25');
    expect(formatPercent(1)).toBe('1');
    expect(formatPercent(0.25, 1)).toBe('0,3');
  });

  test('Tests that a block height is grouped with the device separator', () => {
    expect(formatInteger(3428608)).toBe('3.428.608');
    expect(formatInteger(999)).toBe('999');
  });

  test('Tests that an input amount never uses exponent notation', () => {
    expect(toAmountInput(0.0000001)).toBe('0,0000001');
    expect(toAmountInput(1.5)).toBe('1,5');
    expect(toAmountInput(0)).toBe('');
  });

  test('Tests that typed amounts read with the comma or a dot', () => {
    expect(parseAmountInput('1,5')).toBe(1.5);
    expect(parseAmountInput('1.5')).toBe(1.5);
    expect(parseAmountInput(',5')).toBe(0.5);
    expect(parseAmountInput('1.234,5')).toBeNaN();
    expect(parseAmountInput('')).toBeNaN();
    expect(parseAmountInput('abc')).toBeNaN();
  });
});

describe('on a device with a decimal dot', () => {
  beforeEach(() => {
    mockSeparators = { decimalSeparator: '.', groupingSeparator: ',' };
  });

  test('Tests that an amount takes the dot', () => {
    expect(formatAmount(1.25)).toBe('1.25');
  });

  test('Tests that a comma is not read as a decimal when the device uses a dot', () => {
    expect(parseAmountInput('1,5')).toBeNaN();
    expect(parseAmountInput('1.5')).toBe(1.5);
  });
});
