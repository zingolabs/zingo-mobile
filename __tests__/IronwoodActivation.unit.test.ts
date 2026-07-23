/**
 * @format
 */

import { InfoType, isIronwoodActive } from '../app/AppState';

// Stands in for whatever zingolib reports for the connected chain; the value
// itself is never asserted on, only how the tip compares to it.
const ACTIVATION = 3_428_143;

const infoAt = (
  latestBlock: number,
  ironwoodActivationHeight: number | null = ACTIVATION,
) => ({ latestBlock, ironwoodActivationHeight }) as InfoType;

describe('isIronwoodActive', () => {
  test('switches on at the height zingolib reports', () => {
    expect(isIronwoodActive(infoAt(ACTIVATION - 1))).toBe(false);
    expect(isIronwoodActive(infoAt(ACTIVATION))).toBe(true);
    expect(isIronwoodActive(infoAt(ACTIVATION + 1))).toBe(true);
  });

  test('follows the reported height rather than a built-in schedule', () => {
    // e.g. regtest, which activates every upgrade at genesis.
    expect(isIronwoodActive(infoAt(1, 1))).toBe(true);
  });

  test('is inactive when the chain has no activation scheduled', () => {
    // null covers Offline (no chain) and a native lib that predates the field.
    expect(isIronwoodActive(infoAt(99_999_999, null))).toBe(false);
  });

  test('is inactive before the chain tip is known', () => {
    // `info` starts as `{}` and an info-fetch failure zeroes `latestBlock`.
    expect(isIronwoodActive({} as InfoType)).toBe(false);
    expect(isIronwoodActive(infoAt(0))).toBe(false);
    expect(isIronwoodActive(null)).toBe(false);
  });
});
