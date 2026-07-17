/**
 * Factory for a mocked native bridge. Every member of the returned module is
 * a lazily created jest.fn, so a future import-time touch of some other
 * RPCModule member cannot break a suite that uses it. Shared by every
 * walletBackend unit suite that mocks the bridge:
 *
 *   jest.mock('../app/RPCModule', () =>
 *     require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
 *   );
 */
export function rpcModuleProxyMock() {
  const members: Record<PropertyKey, jest.Mock> = {};
  return {
    __esModule: true,
    default: new Proxy(members, {
      get: (target, prop) => (target[prop] ??= jest.fn()),
    }),
  };
}
