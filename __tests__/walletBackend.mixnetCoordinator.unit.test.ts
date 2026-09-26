import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import {
  afterSettled,
  BOOTSTRAP_DEADLINE_MILLIS,
  BOOTSTRAP_POLL_MILLIS,
  BOOTSTRAP_REDRAW_LIMIT,
  MixnetCoordinator,
  MixnetTransportBinding,
  RECONNECT_BASE_MILLIS,
  RECONNECT_MAX_MILLIS,
  STEADY_POLL_MILLIS,
  StartMixnetTransport,
  StopMixnetTransport,
} from '@app/walletBackend/modules/MixnetCoordinator';
import {
  deriveMixnetView,
  sendGateOpen,
} from '@app/walletBackend/transforms/mixnetView';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';
import { mixnetStatusPayload as statusPayload } from '../__mocks__/dataMocks/mockMixnetStatus';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

const MICROTASK_SETTLE_TURNS = 50;

async function settleMicrotasks(): Promise<void> {
  for (let turn = 0; turn < MICROTASK_SETTLE_TURNS; turn += 1) {
    await Promise.resolve();
  }
}

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(settle => {
    resolve = settle;
  });
  return { promise, resolve };
}

type Gate<T> = {
  called: Promise<void>;
  release: (value: T) => void;
  implementation: () => Promise<T>;
};

function gate<T>(): Gate<T> {
  const call = deferred<void>();
  const result = deferred<T>();
  return {
    called: call.promise,
    release: result.resolve,
    implementation: () => {
      call.resolve();
      return result.promise;
    },
  };
}

const transportBinding = {
  socks5Addr: '127.0.0.1:1080',
  exitNode: 'test-exit',
};

const READY = statusPayload('ready', transportBinding.socks5Addr);

type RecordingCoordinator = {
  coordinator: MixnetCoordinator;
  published: MixnetView[];
  lastView: () => MixnetView;
};

// Every construction here injects a stub transport stop: these tests judge the
// coordinator's own behaviour, and the stop's own contract is judged where it
// is exercised (goOffline, below).
function recordingCoordinator(
  startTransport: StartMixnetTransport,
  stopTransport: StopMixnetTransport = jest.fn().mockResolvedValue(undefined),
): RecordingCoordinator {
  const published: MixnetView[] = [];
  const coordinator = new MixnetCoordinator(
    startTransport,
    view => published.push(view),
    stopTransport,
  );
  return {
    coordinator,
    published,
    lastView: () => published[published.length - 1],
  };
}

function stayBootstrapping(): void {
  mockedBridge.attachMixnet.mockResolvedValue(statusPayload('bootstrapping'));
  mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
    statusPayload('bootstrapping'),
  );
}

describe('deriveMixnetView', () => {
  const noDetail = null;

  it('blocks sending in every state except ready', () => {
    const blocked = (view: MixnetView) => view.sendBlocked;
    expect(
      blocked(
        deriveMixnetView(
          {
            kind: 'status',
            indicator: RPCMixnetIndicatorEnum.ready,
            socks5Addr: '127.0.0.1:1080',
          },
          noDetail,
        ),
      ),
    ).toBe(false);
    expect(
      blocked(
        deriveMixnetView(
          {
            kind: 'status',
            indicator: RPCMixnetIndicatorEnum.bootstrapping,
            socks5Addr: null,
          },
          noDetail,
        ),
      ),
    ).toBe(true);
    expect(
      blocked(
        deriveMixnetView(
          {
            kind: 'status',
            indicator: RPCMixnetIndicatorEnum.died,
            socks5Addr: null,
          },
          noDetail,
        ),
      ),
    ).toBe(true);
    expect(
      blocked(
        deriveMixnetView(
          {
            kind: 'failure',
            failure: { reason: 'nativeRejection', message: 'gone' },
          },
          noDetail,
        ),
      ),
    ).toBe(true);
  });

  it('offers the right recovery per state', () => {
    expect(
      deriveMixnetView(
        {
          kind: 'status',
          indicator: RPCMixnetIndicatorEnum.died,
          socks5Addr: null,
        },
        noDetail,
      ).recovery,
    ).toBe('reenable');
    expect(
      deriveMixnetView(
        {
          kind: 'status',
          indicator: RPCMixnetIndicatorEnum.bootstrapping,
          socks5Addr: null,
        },
        noDetail,
      ).recovery,
    ).toBe('wait');
    expect(
      deriveMixnetView(
        {
          kind: 'status',
          indicator: RPCMixnetIndicatorEnum.ready,
          socks5Addr: '127.0.0.1:1',
        },
        noDetail,
      ).recovery,
    ).toBe('none');
  });

  it('surfaces the narration only while bootstrapping', () => {
    const narration = { kind: 'detail' as const, detail: 'attempt 2/10' };
    expect(
      deriveMixnetView(
        {
          kind: 'status',
          indicator: RPCMixnetIndicatorEnum.bootstrapping,
          socks5Addr: null,
        },
        narration,
      ).narration,
    ).toBe('attempt 2/10');
    expect(
      deriveMixnetView(
        {
          kind: 'status',
          indicator: RPCMixnetIndicatorEnum.ready,
          socks5Addr: '127.0.0.1:1',
        },
        narration,
      ).narration,
    ).toBeNull();
  });
});

describe('afterSettled', () => {
  it('runs the work when nothing is pending', async () => {
    await expect(afterSettled(undefined, async () => 'done')).resolves.toBe(
      'done',
    );
  });

  it('runs the work only after the pending promise settles', async () => {
    const pending = deferred<void>();
    const work = jest.fn().mockResolvedValue('done');

    const running = afterSettled(pending.promise, work);
    await settleMicrotasks();
    expect(work).not.toHaveBeenCalled();

    pending.resolve();
    await expect(running).resolves.toBe('done');
  });

  it('runs the work after a pending promise that rejects', async () => {
    await expect(
      afterSettled(Promise.reject(new Error('gone')), async () => 'done'),
    ).resolves.toBe('done');
  });

  it('turns a synchronous throw into a rejection', async () => {
    const running = afterSettled(undefined, () => {
      throw new TypeError('not registered');
    });
    await expect(running).rejects.toThrow('not registered');
  });
});

describe('sendGateOpen', () => {
  const view = (statusKey: MixnetView['statusKey'], sendBlocked: boolean) =>
    ({
      ...deriveMixnetView(
        {
          kind: 'status',
          indicator: RPCMixnetIndicatorEnum.ready,
          socks5Addr: '127.0.0.1:1080',
        },
        null,
      ),
      statusKey,
      sendBlocked,
    }) as MixnetView;

  it('follows the fail-closed verdict: a send waits for a usable transport', () => {
    expect(sendGateOpen(view('mixnet.status.died', true))).toBe(false);
    expect(sendGateOpen(view('mixnet.status.bootstrapping', true))).toBe(false);
    expect(sendGateOpen(view('mixnet.status.ready', false))).toBe(true);
  });

  it('opens where no mixnet policy runs', () => {
    expect(sendGateOpen(null)).toBe(true);
  });
});

describe('MixnetCoordinator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts the transport, attaches, and publishes the view', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('bootstrapping'));
    mockedBridge.mixnetBootstrapDetailInfo.mockResolvedValue(
      JSON.stringify({ detail: 'attempt 1/10' }),
    );
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator, published } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
    expect(mockedBridge.attachMixnet).toHaveBeenCalledWith(
      '127.0.0.1:1080',
      'test-exit',
    );
    expect(published).toHaveLength(2);
    expect(published[0].statusKey).toBe('mixnet.status.bootstrapping');
    expect(published[0].narration).toBeNull();
    expect(published[1].statusKey).toBe('mixnet.status.bootstrapping');
    expect(published[1].narration).toBe('attempt 1/10');
    expect(published[1].sendBlocked).toBe(true);
    coordinator.stop();
  });

  it('publishes the bootstrapping view immediately, before the transport answers', () => {
    const startTransport = jest.fn().mockReturnValue(new Promise(() => {}));
    const { coordinator, published } = recordingCoordinator(startTransport);

    coordinator.ensureForConnectedSession();

    expect(published).toHaveLength(1);
    expect(published[0].statusKey).toBe('mixnet.status.bootstrapping');
    expect(published[0].sendBlocked).toBe(true);
    expect(published[0].recovery).toBe('wait');
    expect(published[0].reconnecting).toBe(false);
    expect(mockedBridge.mixnetBootstrapDetailInfo).not.toHaveBeenCalled();
    coordinator.stop();
  });

  it('a transport-start failure publishes the failure view and offers re-enable, never clearnet', async () => {
    const startTransport = jest
      .fn()
      .mockRejectedValue(new Error('shim missing'));
    const { coordinator, published } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    expect(published).toHaveLength(2);
    expect(published[0].statusKey).toBe('mixnet.status.bootstrapping');
    expect(published[1].statusKey).toBe('mixnet.status.unknown');
    expect(published[1].sendBlocked).toBe(true);
    expect(published[1].recovery).toBe('reenable');
    expect(mockedBridge.attachMixnet).not.toHaveBeenCalled();
    coordinator.stop();
  });

  it('does not poll while a re-enable is in progress', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('died'));
    const startTransport = jest
      .fn()
      .mockResolvedValueOnce(transportBinding)
      .mockReturnValue(new Promise(() => {}));
    const { coordinator, lastView } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(lastView().statusKey).toBe('mixnet.status.died');

    coordinator.reenable();
    await jest.advanceTimersByTimeAsync(STEADY_POLL_MILLIS * 3);

    expect(mockedBridge.mixnetIndicatorInfo).not.toHaveBeenCalled();
    const latest = lastView();
    expect(latest.statusKey).toBe('mixnet.status.bootstrapping');
    expect(latest.reconnecting).toBe(true);
    coordinator.stop();
  });

  it('keeps sends blocked when the first poll after a transport failure reports off', async () => {
    const startTransport = jest
      .fn()
      .mockRejectedValue(new Error('shim missing'));
    const { coordinator, lastView } = recordingCoordinator(startTransport);
    await coordinator.ensureForConnectedSession();
    await flushPromises();

    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(statusPayload('off'));
    jest.advanceTimersByTime(STEADY_POLL_MILLIS);
    await flushPromises();

    const latest = lastView();
    expect(latest.sendBlocked).toBe(true);
    expect(latest.recovery).toBe('reenable');
    coordinator.stop();
  });

  it('a stale bootstrapping publication cannot overwrite a newer view', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('bootstrapping'));
    const narration = deferred<string>();
    mockedBridge.mixnetBootstrapDetailInfo.mockReturnValue(narration.promise);
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(READY);
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator, lastView } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await jest.advanceTimersByTimeAsync(BOOTSTRAP_POLL_MILLIS);
    await flushPromises();
    narration.resolve(JSON.stringify({ detail: 'connecting to a gateway' }));
    await flushPromises();

    const latest = lastView();
    expect(latest.statusKey).toBe('mixnet.status.ready');
    expect(latest.narration).toBeNull();
    coordinator.stop();
  });

  it('polls while running and never overlaps a slow poll', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(READY);
    mockedBridge.mixnetIndicatorInfo.mockReturnValue(new Promise(() => {}));
    const { coordinator } = recordingCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    await jest.advanceTimersByTimeAsync(30_000);
    await jest.advanceTimersByTimeAsync(30_000);
    await jest.advanceTimersByTimeAsync(30_000);
    expect(mockedBridge.mixnetIndicatorInfo).toHaveBeenCalledTimes(1);
    coordinator.stop();
  });

  it('stop() halts polling', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(READY);
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(READY);
    const { coordinator } = recordingCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    coordinator.stop();

    await jest.advanceTimersByTimeAsync(120_000);
    expect(mockedBridge.mixnetIndicatorInfo).not.toHaveBeenCalled();
  });

  it('auto-reconnects after the transport dies, with no user action', async () => {
    mockedBridge.attachMixnet
      .mockResolvedValueOnce(statusPayload('died'))
      .mockResolvedValueOnce(READY);
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator, lastView } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(lastView().statusKey).toBe('mixnet.status.died');

    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(2);
    const latest = lastView();
    expect(latest.statusKey).toBe('mixnet.status.ready');
    expect(latest.sendBlocked).toBe(false);
    coordinator.stop();
  });

  it('flags the view as reconnecting from loss until recovery', async () => {
    mockedBridge.attachMixnet
      .mockResolvedValueOnce(statusPayload('died'))
      .mockResolvedValueOnce(READY);
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator, lastView } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(lastView().reconnecting).toBe(true);

    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();
    const latest = lastView();
    expect(latest.statusKey).toBe('mixnet.status.ready');
    expect(latest.reconnecting).toBe(false);
    coordinator.stop();
  });

  it('backs off exponentially while the transport stays down', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('died'));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(3);
    coordinator.stop();
  });
});

describe('MixnetCoordinator.goOffline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockedBridge.disableMixnet.mockResolvedValue(statusPayload('off'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stops the hosted transport and rests at off', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(READY);
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const stopTransport = jest.fn().mockResolvedValue(undefined);
    const { coordinator, lastView } = recordingCoordinator(
      startTransport,
      stopTransport,
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    await coordinator.goOffline();
    await flushPromises();

    expect(stopTransport).toHaveBeenCalledTimes(1);
    const resting = lastView();
    expect(resting.statusKey).toBe('mixnet.status.off');
    expect(resting.sendBlocked).toBe(true);
    expect(resting.recovery).toBe('none');
    expect(resting.reconnecting).toBe(false);
  });

  // The order is the contract: a shim killed under a live slot reads as an
  // unconsented death, and the app would chase a reconnect it caused itself.
  it('vacates the wallet slot before it kills the tunnel', async () => {
    const acts: string[] = [];
    mockedBridge.attachMixnet.mockResolvedValue(READY);
    mockedBridge.disableMixnet.mockImplementation(async () => {
      acts.push('disable');
      return statusPayload('off');
    });
    const stopTransport = jest.fn().mockImplementation(async () => {
      acts.push('stop');
    });
    const { coordinator } = recordingCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
      stopTransport,
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    await coordinator.goOffline();

    expect(acts).toEqual(['disable', 'stop']);
  });

  it('reports trouble, never off, when the tunnel refuses to stop', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(READY);
    const { coordinator, lastView } = recordingCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
      jest.fn().mockRejectedValue(new Error('the shim would not die')),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    await coordinator.goOffline();
    await flushPromises();

    const latest = lastView();
    expect(latest.statusKey).toBe('mixnet.status.unknown');
    expect(latest.sendBlocked).toBe(true);
  });

  it('never reconnects an Offline session whose tunnel refused to stop', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(READY);
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator, lastView } = recordingCoordinator(
      startTransport,
      jest.fn().mockRejectedValue(new Error('the shim would not die')),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    await coordinator.goOffline();
    await flushPromises();
    await jest.advanceTimersByTimeAsync(RECONNECT_MAX_MILLIS * 2);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
    const latest = lastView();
    expect(latest.statusKey).toBe('mixnet.status.unknown');
    expect(latest.reconnecting).toBe(false);
  });

  it('attaches a session that returns Online during the disable only after the disable lands', async () => {
    const acts: string[] = [];
    mockedBridge.attachMixnet.mockImplementation(async () => {
      acts.push('attach');
      return READY;
    });
    const disable = deferred<string>();
    mockedBridge.disableMixnet.mockReturnValue(disable.promise);
    const stopTransport = jest.fn().mockResolvedValue(undefined);
    const { coordinator, lastView } = recordingCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
      stopTransport,
    );

    const goingOffline = coordinator.goOffline();
    const returning = coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(mockedBridge.attachMixnet).not.toHaveBeenCalled();

    acts.push('disable');
    disable.resolve(statusPayload('off'));
    await goingOffline;
    await returning;
    await flushPromises();

    expect(acts).toEqual(['disable', 'attach']);
    expect(stopTransport).not.toHaveBeenCalled();
    expect(lastView().statusKey).toBe('mixnet.status.ready');
    coordinator.stop();
  });

  it('stops a transport whose start finishes after the session went Offline', async () => {
    const start = deferred<MixnetTransportBinding>();
    const startTransport = jest.fn().mockReturnValue(start.promise);
    const stopTransport = jest.fn().mockResolvedValue(undefined);
    const { coordinator, lastView } = recordingCoordinator(
      startTransport,
      stopTransport,
    );

    const drawing = coordinator.ensureForConnectedSession();
    await coordinator.goOffline();
    expect(stopTransport).toHaveBeenCalledTimes(1);

    start.resolve(transportBinding);
    await drawing;
    await flushPromises();

    expect(stopTransport).toHaveBeenCalledTimes(2);
    expect(mockedBridge.attachMixnet).not.toHaveBeenCalled();
    expect(lastView().statusKey).toBe('mixnet.status.off');
  });

  it('starts the returning session only after the Offline stop has finished', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(READY);
    const startTransport = jest
      .fn()
      .mockReturnValueOnce(new Promise<MixnetTransportBinding>(() => {}))
      .mockResolvedValue(transportBinding);
    const offlineStop = gate<void>();
    const stopTransport = jest
      .fn()
      .mockImplementation(offlineStop.implementation);
    const { coordinator } = recordingCoordinator(startTransport, stopTransport);

    coordinator.ensureForConnectedSession();
    const goingOffline = coordinator.goOffline();
    await offlineStop.called;
    const returning = coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(1);

    offlineStop.release();
    await goingOffline;
    await returning;

    expect(startTransport).toHaveBeenCalledTimes(2);
    coordinator.stop();
  });

  it('starts the returning session only after an orphaned transport has been stopped', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(READY);
    const orphanStart = deferred<MixnetTransportBinding>();
    const startTransport = jest
      .fn()
      .mockReturnValueOnce(orphanStart.promise)
      .mockResolvedValue(transportBinding);
    const orphanStop = gate<void>();
    const stopTransport = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(orphanStop.implementation);
    const { coordinator } = recordingCoordinator(startTransport, stopTransport);

    const orphanDraw = coordinator.ensureForConnectedSession();
    await coordinator.goOffline();
    orphanStart.resolve(transportBinding);
    await orphanStop.called;
    const returning = coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(1);

    orphanStop.release();
    await orphanDraw;
    await returning;

    expect(startTransport).toHaveBeenCalledTimes(2);
    coordinator.stop();
  });

  it('starts the returning session only after every queued Offline stop has finished', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(READY);
    const startTransport = jest
      .fn()
      .mockReturnValueOnce(new Promise<MixnetTransportBinding>(() => {}))
      .mockResolvedValue(transportBinding);
    const firstStop = gate<void>();
    const stopTransport = jest
      .fn()
      .mockImplementationOnce(firstStop.implementation)
      .mockResolvedValue(undefined);
    const { coordinator } = recordingCoordinator(startTransport, stopTransport);

    coordinator.ensureForConnectedSession();
    const firstOffline = coordinator.goOffline();
    await firstStop.called;
    const secondOffline = coordinator.goOffline();
    await settleMicrotasks();
    const returning = coordinator.ensureForConnectedSession();
    await settleMicrotasks();
    expect(startTransport).toHaveBeenCalledTimes(1);

    firstStop.release();
    await Promise.all([firstOffline, secondOffline, returning]);

    expect(startTransport).toHaveBeenCalledTimes(2);
    coordinator.stop();
  });

  it('reports trouble, never a rejection, when the stop throws before it returns a promise', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(READY);
    const { coordinator, lastView } = recordingCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
      jest.fn().mockImplementation(() => {
        throw new TypeError('NymTransportModule is not registered');
      }),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    await expect(coordinator.goOffline()).resolves.toBeUndefined();

    const latest = lastView();
    expect(latest.statusKey).toBe('mixnet.status.unknown');
    expect(latest.sendBlocked).toBe(true);
  });

  // The launch-Offline case: nothing was ever armed, and the header still has
  // to report where nym stands.
  it('lands off on a session that never armed a transport', async () => {
    const startTransport = jest.fn();
    const { coordinator, lastView } = recordingCoordinator(startTransport);

    await coordinator.goOffline();
    await flushPromises();

    expect(startTransport).not.toHaveBeenCalled();
    expect(lastView().statusKey).toBe('mixnet.status.off');
  });

  // The regression this whole change exists for: no timer may dial the mixnet
  // once the session has gone Offline.
  it('cancels a pending reconnect instead of dialing after going offline', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('died'));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator, lastView } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(1);

    await coordinator.goOffline();
    await flushPromises();

    await jest.advanceTimersByTimeAsync(
      RECONNECT_BASE_MILLIS + STEADY_POLL_MILLIS,
    );
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
    expect(lastView().statusKey).toBe('mixnet.status.off');
  });
});

/**
 * A draw that never proves itself is the dominant cost of going Online: the
 * wallet's readiness gate spends 61 s on it and retries the same gateway and
 * exit, so only the app can break the tie by drawing again.
 */
describe('MixnetCoordinator bootstrap deadline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockedBridge.mixnetBootstrapDetailInfo.mockResolvedValue(
      JSON.stringify({ detail: 'attempt 1/10' }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('draws again when a draw never proves itself', async () => {
    stayBootstrapping();
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(1);

    // The deadline is what draws again, not the status poll running beneath
    // it: a second before it, the draw still has its chance.
    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS - 1_000);
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1_000);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(2);
    coordinator.stop();
  });

  it('waits for a slow transport start instead of drawing behind it', async () => {
    stayBootstrapping();
    const slowStart = deferred<MixnetTransportBinding>();
    const startTransport = jest
      .fn()
      .mockReturnValueOnce(slowStart.promise)
      .mockResolvedValue(transportBinding);
    const { coordinator } = recordingCoordinator(startTransport);

    coordinator.ensureForConnectedSession();
    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS * 2);
    expect(startTransport).toHaveBeenCalledTimes(1);

    slowStart.resolve(transportBinding);
    await flushPromises();
    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(2);
    coordinator.stop();
  });

  it('keeps the deadline armed through a slow start, so a silent attach still draws again', async () => {
    mockedBridge.attachMixnet.mockReturnValue(new Promise<string>(() => {}));
    const slowStart = deferred<MixnetTransportBinding>();
    const startTransport = jest
      .fn()
      .mockReturnValueOnce(slowStart.promise)
      .mockResolvedValue(transportBinding);
    const { coordinator } = recordingCoordinator(startTransport);

    coordinator.ensureForConnectedSession();
    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS);
    expect(startTransport).toHaveBeenCalledTimes(1);

    slowStart.resolve(transportBinding);
    await flushPromises();
    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(2);
    coordinator.stop();
  });

  it('draws again while a start from before an Offline round trip is still pending', async () => {
    stayBootstrapping();
    mockedBridge.disableMixnet.mockResolvedValue(statusPayload('off'));
    const startTransport = jest
      .fn()
      .mockReturnValueOnce(new Promise<MixnetTransportBinding>(() => {}))
      .mockResolvedValue(transportBinding);
    const { coordinator } = recordingCoordinator(startTransport);

    coordinator.ensureForConnectedSession();
    await coordinator.goOffline();
    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(3);
    coordinator.stop();
  });

  it('leaves a draw that proves itself in time alone', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(READY);
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(READY);
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS * 3);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
    coordinator.stop();
  });

  // Past the limit the network is the explanation, not the draw: the last
  // one runs its full course and the reconnect backoff takes over, rather
  // than re-fetching the whole node topology every twenty seconds forever.
  it('stops drawing after the limit', async () => {
    stayBootstrapping();
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    for (let draw = 0; draw < BOOTSTRAP_REDRAW_LIMIT + 2; draw += 1) {
      await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS);
      await flushPromises();
    }

    expect(startTransport).toHaveBeenCalledTimes(BOOTSTRAP_REDRAW_LIMIT + 1);
    coordinator.stop();
  });

  it('never draws again once the session has gone Offline', async () => {
    stayBootstrapping();
    mockedBridge.disableMixnet.mockResolvedValue(statusPayload('off'));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    await coordinator.goOffline();
    await flushPromises();

    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS * 2);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
  });

  it('never draws again once the coordinator is stopped', async () => {
    stayBootstrapping();
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator } = recordingCoordinator(startTransport);

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    coordinator.stop();

    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS * 2);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
  });

  it('never draws while Offline, even when the disable answers bootstrapping', async () => {
    mockedBridge.disableMixnet.mockResolvedValue(
      statusPayload('bootstrapping'),
    );
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const { coordinator } = recordingCoordinator(startTransport);

    await coordinator.goOffline();
    await flushPromises();
    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS * 2);
    await flushPromises();

    expect(startTransport).not.toHaveBeenCalled();
  });
});
