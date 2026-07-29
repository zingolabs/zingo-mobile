/**
 * Pins the flavor chain default (CONTEXT.md: the silent alpha APKs).
 *
 * flavorDefaultChainName steers only the first-run server default. It must
 * be testnet exactly when the flavor exports "test", and mainnet on every
 * other shape — an absent module, an absent constant, or any unexpected
 * value — so the stock flavors and old native layers keep mainnet.
 */

/**
 * Loads a fresh flavor util against the given NativeModules shape. The
 * util captures nothing at import time, but react-native itself must be
 * mocked before the import chain pulls it in, so each case resets the
 * registry and re-imports.
 */
function loadFlavorDefaultChainName(
  nativeModules: Record<string, unknown>,
): () => string {
  jest.resetModules();
  jest.doMock('react-native', () => ({ NativeModules: nativeModules }));
  const { flavorDefaultChainName } = require('../app/utils/flavor');
  jest.dontMock('react-native');
  return flavorDefaultChainName;
}

describe('flavorDefaultChainName', () => {
  it('is mainnet where the native module is absent', () => {
    expect(loadFlavorDefaultChainName({})()).toBe('main');
  });

  it('is mainnet when the module exports no constant', () => {
    expect(loadFlavorDefaultChainName({ RPCModule: {} })()).toBe('main');
  });

  it('is mainnet for the stock flavors (constant "main")', () => {
    expect(
      loadFlavorDefaultChainName({ RPCModule: { defaultChainName: 'main' } })(),
    ).toBe('main');
  });

  it('is mainnet for any unexpected constant value', () => {
    expect(
      loadFlavorDefaultChainName({
        RPCModule: { defaultChainName: 'regtest' },
      })(),
    ).toBe('main');
  });

  it('is testnet only for the testnet alpha flavor (constant "test")', () => {
    expect(
      loadFlavorDefaultChainName({ RPCModule: { defaultChainName: 'test' } })(),
    ).toBe('test');
  });
});
