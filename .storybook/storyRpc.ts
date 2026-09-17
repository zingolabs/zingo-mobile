// Canned answers for the wallet handle, keyed by wallet method name. The web
// Storybook hands `storyWallet` to `currentWallet()`, so a screen's real
// walletBackend wrappers run unchanged against typed fixtures. On device the
// real wallet is used and this registry is inert.
import { WalletInterface, ZingoError } from 'zingo-ffi';

export type WalletFixture =
  | ((call: number, ...args: unknown[]) => unknown)
  | { readonly value: unknown };

const fixtures = new Map<string, WalletFixture>();
const calls = new Map<string, number>();

/** Wraps a plain value so it is never mistaken for a call handler. */
export const answer = (value: unknown): WalletFixture => ({ value });

export const setWalletFixtures = (next: Record<string, WalletFixture>) => {
  fixtures.clear();
  calls.clear();
  for (const [method, fixture] of Object.entries(next)) {
    fixtures.set(method, fixture);
  }
};

export const callWalletFixture = (
  method: string,
  args: unknown[],
): Promise<unknown> => {
  const fixture = fixtures.get(method);
  if (fixture === undefined) {
    return Promise.reject(
      new ZingoError.Internal({
        detail: `storybook: no wallet fixture for ${method}`,
      }),
    );
  }
  if (typeof fixture !== 'function') {
    return Promise.resolve(fixture.value);
  }
  const call = calls.get(method) ?? 0;
  calls.set(method, call + 1);
  return Promise.resolve(fixture(call, ...args));
};

const idleStream = () => ({
  next: () => new Promise<undefined>(() => {}),
  cancel: () => {},
});

/** The wallet handle a story's screen talks to on web. */
export const storyWallet = new Proxy({} as Record<string, unknown>, {
  get: (_target, method) =>
    method === 'events'
      ? idleStream
      : (...args: unknown[]) => callWalletFixture(String(method), args),
}) as unknown as WalletInterface;

// A call that never answers: the screen stays in its loading state.
export const pending = () => new Promise<never>(() => {});

// A typed wallet rejection, the shape callFfi maps to an FfiError.
export const rejection = (error: ZingoError) => () => Promise.reject(error);
