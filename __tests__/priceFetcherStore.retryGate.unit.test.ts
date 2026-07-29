/**
 * The single-flight retry gate: the store's one immediate retry is
 * reserved for attempts that settled natively. A watchdog timeout leaves
 * the native call possibly still in flight, so a retry would stack a
 * second call behind it, and a fail-closed gate refusal is never retried
 * (see CONTEXT.md, "Fail-closed").
 */
jest.mock('../app/createAlert', () => ({ createAlert: jest.fn() }));
jest.mock('../app/sendEmail', () => ({ sendEmail: jest.fn() }));
jest.mock('../app/RPCModule', () => ({}));
jest.mock('../app/walletBackend', () => ({
  getZecPrice: jest.fn(),
  zecPriceFailureReport: jest.fn((outcome: { kind: string }) =>
    outcome.kind === 'price' ? null : 'title\ndetail line',
  ),
}));

type Store = typeof import('../components/Components/priceFetcherStore');
type Backend = { getZecPrice: jest.Mock };

/** A fresh store module and its fresh backend mock, with deps bound. */
function freshHarness(): {
  store: Store;
  getZecPrice: jest.Mock;
  setZecPrice: jest.Mock;
} {
  let store: Store | undefined;
  let backend: Backend | undefined;
  jest.isolateModules(() => {
    backend = require('../app/walletBackend');
    store = require('../components/Components/priceFetcherStore');
  });
  const setZecPrice = jest.fn();
  store!.priceFetcherStore.setDeps({
    setZecPrice,
    translate: (key: string) => `t:${key}`,
    addLastSnackbar: jest.fn(),
    setBackgroundError: jest.fn(),
    zingolibVersion: 'zingolib-test-version',
  });
  return { store: store!, getZecPrice: backend!.getZecPrice, setZecPrice };
}

const flush = () => jest.advanceTimersByTimeAsync(0);

describe('the single-flight retry gate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    // The store parks a cooldown timer and the visible-floor sleep after
    // every fetch; clear them so the worker exits cleanly.
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('does not launch a second native fetch after a watchdog timeout', async () => {
    const { store, getZecPrice } = freshHarness();
    getZecPrice.mockResolvedValue({ kind: 'timedOut', afterMs: 25000 });

    store.priceFetcherStore.fetch();
    await flush();

    expect(getZecPrice).toHaveBeenCalledTimes(1);
  });

  it('does not retry a fail-closed gate refusal', async () => {
    const { store, getZecPrice } = freshHarness();
    getZecPrice.mockResolvedValue({
      kind: 'gateRefusal',
      error: 'the covered surface refused',
    });

    store.priceFetcherStore.fetch();
    await flush();

    expect(getZecPrice).toHaveBeenCalledTimes(1);
  });

  it('still retries once when the attempt settled natively without a price', async () => {
    const { store, getZecPrice, setZecPrice } = freshHarness();
    getZecPrice
      .mockResolvedValueOnce({ kind: 'noData', elapsedMs: 120 })
      .mockResolvedValueOnce({
        kind: 'price',
        usd: 42.5,
        route: { kind: 'clearnet' },
        elapsedMs: 340,
      });

    store.priceFetcherStore.fetch();
    await flush();

    expect(getZecPrice).toHaveBeenCalledTimes(2);
    expect(setZecPrice).toHaveBeenCalledWith(42.5, expect.any(Number));
  });
});
