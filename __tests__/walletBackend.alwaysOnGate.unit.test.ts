/**
 * Pins the always-on flavors' fail-closed gate (CONTEXT.md: Fail-closed).
 *
 * Both covered surfaces must refuse rather than touch clearnet while the
 * mixnet transport is not ready: the send path through WalletBackend's
 * backend-layer gate, and the CEX price fetch through the module gate. The
 * on-device alpha proved the hole this closes: a failed enable left the
 * wallet at `off`, and with the mixnet UI withheld, a send went clearnet
 * silently. The auto-recovery loop is also pinned here — the silent
 * flavors have no human re-enable path.
 */
import {
  MixnetCoordinator,
  RECOVERY_RETRY_MILLIS,
} from '../app/walletBackend/modules/MixnetCoordinator';
import {
  COVERED_SURFACE_REFUSAL,
  coveredSurfacePermitted,
  recordMixnetTransportReady,
} from '../app/walletBackend/utils/mixnetGate';
import { classifySendFailure } from '../app/walletBackend/transforms/sendFailureTransform';

jest.mock('../app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);
jest.mock('../app/walletBackend/utils/nymTransport', () => ({
  isMixnetAlwaysOn: jest.fn(() => false),
  startMixnetTransport: jest.fn(),
  stopMixnetTransport: jest.fn(),
}));

import RPCModule from '../app/RPCModule';
import { isMixnetAlwaysOn } from '../app/walletBackend/utils/nymTransport';
import { getZecPrice } from '../app/walletBackend/utils/walletUtils';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;
const mockedAlwaysOn = isMixnetAlwaysOn as jest.Mock;

function statusPayload(mode: string, socks5Addr?: string): string {
  return JSON.stringify(
    socks5Addr === undefined
      ? { mixnet_mode: mode }
      : { mixnet_mode: mode, socks5_addr: socks5Addr },
  );
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedAlwaysOn.mockReturnValue(false);
  recordMixnetTransportReady(false);
});

describe('the refusal text', () => {
  it('classifies as a mixnetRefusal: never a server problem, no retry', () => {
    expect(classifySendFailure(COVERED_SURFACE_REFUSAL).kind).toBe(
      'mixnetRefusal',
    );
  });
});

describe('coveredSurfacePermitted', () => {
  it('always permits in the stock flavors', () => {
    mockedAlwaysOn.mockReturnValue(false);
    recordMixnetTransportReady(false);
    expect(coveredSurfacePermitted()).toBe(true);
  });

  it('refuses in an always-on build until the transport is ready', () => {
    mockedAlwaysOn.mockReturnValue(true);
    recordMixnetTransportReady(false);
    expect(coveredSurfacePermitted()).toBe(false);
    recordMixnetTransportReady(true);
    expect(coveredSurfacePermitted()).toBe(true);
  });
});

describe('coordinator readiness and the gate mirror', () => {
  // House convention for coordinator tests: fake timers, so the polling
  // intervals the coordinator schedules never outlive the test.
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('a ready attach opens the gate; stop closes it fail-closed', async () => {
    mockedAlwaysOn.mockReturnValue(true);
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    const coordinator = new MixnetCoordinator(
      jest.fn().mockResolvedValue('127.0.0.1:1080'),
      () => {},
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    expect(coordinator.isReady()).toBe(true);
    expect(coveredSurfacePermitted()).toBe(true);

    coordinator.stop();
    expect(coveredSurfacePermitted()).toBe(false);
  });

  it('a failed enable leaves the gate closed', async () => {
    mockedAlwaysOn.mockReturnValue(true);
    const coordinator = new MixnetCoordinator(
      jest.fn().mockRejectedValue(new Error('verifier not initialized')),
      () => {},
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    expect(coordinator.isReady()).toBe(false);
    expect(coveredSurfacePermitted()).toBe(false);
    coordinator.stop();
  });
});

describe('auto-recovery (always-on builds only)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries a failed enable after the recovery interval', async () => {
    const startTransport = jest
      .fn()
      .mockRejectedValueOnce(new Error('verifier not initialized'))
      .mockResolvedValue('127.0.0.1:1080');
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    // The steady poll also ticks during the advance; it must keep
    // reporting the same state rather than fabricate a failure.
    mockedBridge.mixnetModeInfo.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    const coordinator = new MixnetCoordinator(startTransport, () => {}, true);

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(1);
    expect(coordinator.isReady()).toBe(false);

    await jest.advanceTimersByTimeAsync(RECOVERY_RETRY_MILLIS);

    expect(startTransport).toHaveBeenCalledTimes(2);
    expect(coordinator.isReady()).toBe(true);
    coordinator.stop();
  });

  it('never retries on its own in a stock build', async () => {
    const startTransport = jest
      .fn()
      .mockRejectedValue(new Error('shim missing'));
    const coordinator = new MixnetCoordinator(startTransport, () => {});

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    jest.advanceTimersByTime(RECOVERY_RETRY_MILLIS * 3);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
    coordinator.stop();
  });
});

describe('the price fetch gate', () => {
  it('refuses without touching the FFI while the gate is closed', async () => {
    mockedAlwaysOn.mockReturnValue(true);
    recordMixnetTransportReady(false);

    const { price, error } = await getZecPrice();

    expect(price).toBe(-1);
    expect(error).toBe(COVERED_SURFACE_REFUSAL);
    expect(mockedBridge.zecPriceInfo).not.toHaveBeenCalled();
  });

  it('fetches normally once the transport is ready', async () => {
    mockedAlwaysOn.mockReturnValue(true);
    recordMixnetTransportReady(true);
    mockedBridge.zecPriceInfo.mockResolvedValue(
      JSON.stringify({ current_price: 42.5 }),
    );

    const { price, error } = await getZecPrice();

    expect(price).toBe(42.5);
    expect(error).toBe('');
  });
});
