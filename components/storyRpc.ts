// Canned answers for the native RPC bridge, keyed by bridge method name. The
// web Storybook aliases app/RPCModule to a proxy that reads from here, so a
// screen's real walletBackend wrappers run unchanged against fixture JSON.
// On device the real bridge is used and this registry is inert.
export type RpcFixture =
  string | ((call: number, ...args: string[]) => string | Promise<string>);

const fixtures = new Map<string, RpcFixture>();
const calls = new Map<string, number>();

export const setRpcFixtures = (next: Record<string, RpcFixture>) => {
  fixtures.clear();
  calls.clear();
  for (const [method, fixture] of Object.entries(next)) {
    fixtures.set(method, fixture);
  }
};

export const callRpcFixture = (
  method: string,
  args: string[],
): Promise<string> => {
  const fixture = fixtures.get(method);
  if (fixture === undefined) {
    return Promise.reject(
      Object.assign(new Error(`storybook: no RPC fixture for ${method}`), {
        code: 'Unknown',
      }),
    );
  }
  if (typeof fixture === 'string') {
    return Promise.resolve(fixture);
  }
  const call = calls.get(method) ?? 0;
  calls.set(method, call + 1);
  return Promise.resolve(fixture(call, ...args));
};

export const json = (payload: unknown) => JSON.stringify(payload);

// A call that never answers: the screen stays in its loading state.
export const pending = () => new Promise<string>(() => {});

// A typed bridge rejection, the shape callFfi maps to an FfiError.
export const rejection =
  (message: string, code = 'Unknown') =>
  () =>
    Promise.reject(Object.assign(new Error(message), { code }));
