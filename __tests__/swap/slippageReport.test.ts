import {
  describeRealizedSlippage,
  describeSlippageTolerance,
} from '@app/swap/slippageReport';

describe('describeSlippageTolerance', () => {
  it('states the tolerance when only one figure is known', () => {
    expect(describeSlippageTolerance(100, undefined)).toBe('1%');
    expect(describeSlippageTolerance(undefined, 150)).toBe('1.5%');
  });

  it('states it once when the provider applied what was asked', () => {
    expect(describeSlippageTolerance(100, 100)).toBe('1%');
  });

  // The case the record exists for: a provider holding a swap to a tolerance
  // other than the one requested.
  it('shows both when the provider applied a different one', () => {
    expect(describeSlippageTolerance(100, 200)).toBe('2% (1% requested)');
  });

  it('keeps small tolerances readable', () => {
    expect(describeSlippageTolerance(25)).toBe('0.25%');
  });

  it('says nothing without a usable figure', () => {
    expect(describeSlippageTolerance(undefined, undefined)).toBeUndefined();
    expect(describeSlippageTolerance(NaN, undefined)).toBeUndefined();
  });
});

describe('describeRealizedSlippage', () => {
  // SwapKit defines it as (expected - actual) / expected: positive is less.
  // A NEAR swap on mainnet reported -6, which delivered slightly more.
  it('reads a negative figure as more than expected', () => {
    expect(describeRealizedSlippage(-6)).toBe(
      'Received 0.06% more than expected',
    );
  });

  // A Flashnet swap held up for twelve hours delivered 7.752256 USDC against
  // 7.603717 expected: -195 bps, the market having moved in the user's favour.
  it('reads a delayed swap that gained as more than expected', () => {
    expect(describeRealizedSlippage(-195)).toBe(
      'Received 1.95% more than expected',
    );
  });

  it('reads a positive figure as less than expected', () => {
    expect(describeRealizedSlippage(42)).toBe(
      'Received 0.42% less than expected',
    );
  });

  it('calls a negligible difference as expected', () => {
    expect(describeRealizedSlippage(0)).toBe('Received as expected');
    expect(describeRealizedSlippage(0.4)).toBe('Received as expected');
  });

  it('says nothing when the provider reported nothing', () => {
    expect(describeRealizedSlippage(undefined)).toBeUndefined();
    expect(describeRealizedSlippage(Infinity)).toBeUndefined();
  });
});
