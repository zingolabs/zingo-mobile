import { assetShortLabel, formatFeeAmount } from '@app/swap/feeConversion';

/**
 * Fee amounts reach the screen from two places at once: converted into the
 * receive asset as a number, and verbatim as the provider's own string. An
 * ERC20 fee arrives with 18 decimals, so a line could carry both a rounded
 * figure and a raw one and look like two different precisions.
 */

describe('formatFeeAmount', () => {
  it("caps at the wallet's own smallest unit", () => {
    expect(formatFeeAmount(0.000012345678901234567)).toBe('0.00001235');
  });

  // The provider's string is what the breakdown shows beside the converted
  // figure, so it has to go through the same formatter to match it.
  it("takes the provider's string as readily as a number", () => {
    expect(formatFeeAmount('0.000012345678901234567')).toBe('0.00001235');
    expect(formatFeeAmount('1.5')).toBe('1.5');
  });

  it('trims the padding rather than printing it', () => {
    expect(formatFeeAmount(1.5)).toBe('1.5');
    expect(formatFeeAmount(10)).toBe('10');
    expect(formatFeeAmount(1000)).toBe('1000');
  });

  // Binary fractions surface as a long tail that is arithmetic rather than
  // money.
  it('does not let a binary fraction leak its tail', () => {
    expect(formatFeeAmount(0.1 + 0.2)).toBe('0.3');
  });

  // Printing "0" for a fee that exists would read as no fee at all.
  it('says a fee is under the threshold rather than calling it zero', () => {
    expect(formatFeeAmount(0.00000000123)).toBe('< 0.00000001');
  });

  it('reads a real zero, and anything unreadable, as zero', () => {
    expect(formatFeeAmount(0)).toBe('0');
    expect(formatFeeAmount('')).toBe('0');
    expect(formatFeeAmount('not a number')).toBe('0');
    expect(formatFeeAmount(undefined)).toBe('0');
    expect(formatFeeAmount(Number.NaN)).toBe('0');
  });

  it('never reaches for scientific notation', () => {
    expect(formatFeeAmount(0.00000001)).not.toContain('e');
  });
});

describe('assetShortLabel', () => {
  // The catalog identifier carries the contract for a token, which is noise
  // beside a fee amount.
  it('keeps the symbol and drops the contract', () => {
    expect(
      assetShortLabel('ETH.USDC-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
    ).toBe('USDC');
  });

  it('keeps a native asset as it is', () => {
    expect(assetShortLabel('BTC.BTC')).toBe('BTC');
    expect(assetShortLabel('ZEC.ZEC')).toBe('ZEC');
  });

  it('passes through something with no chain prefix', () => {
    expect(assetShortLabel('BTC')).toBe('BTC');
  });
});
