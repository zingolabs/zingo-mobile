/**
 * Pins the "Always On" flavor gate (CONTEXT.md: the silent alpha APK).
 *
 * isMixnetAlwaysOn decides whether the app withholds the Mixnet Mode UI
 * projection. It must be true only when the native module exports the
 * flavor constant as true, and false on every other shape — including the
 * module's complete absence (iOS until the Mac-gated step) — so the stock
 * flavors and platforms keep their full mixnet UI.
 */

/**
 * Loads a fresh nymTransport against the given NativeModules shape.
 * nymTransport captures the native module at import time, so each case
 * resets the module registry, mocks react-native to the case's shape,
 * and re-imports.
 */
function loadIsMixnetAlwaysOn(
  nativeModules: Record<string, unknown>,
): () => boolean {
  jest.resetModules();
  jest.doMock('react-native', () => ({ NativeModules: nativeModules }));
  const { isMixnetAlwaysOn } = require('../app/walletBackend/utils/nymTransport');
  jest.dontMock('react-native');
  return isMixnetAlwaysOn;
}

describe('isMixnetAlwaysOn', () => {
  it('is false where the platform has no transport module (iOS)', () => {
    expect(loadIsMixnetAlwaysOn({})()).toBe(false);
  });

  it('is false when the module exports no flavor constant', () => {
    expect(loadIsMixnetAlwaysOn({ NymTransportModule: {} })()).toBe(false);
  });

  it('is false in the stock flavors (constant false)', () => {
    expect(
      loadIsMixnetAlwaysOn({ NymTransportModule: { mixnetAlwaysOn: false } })(),
    ).toBe(false);
  });

  it('is true only in the always-on flavor (constant true)', () => {
    expect(
      loadIsMixnetAlwaysOn({ NymTransportModule: { mixnetAlwaysOn: true } })(),
    ).toBe(true);
  });
});
