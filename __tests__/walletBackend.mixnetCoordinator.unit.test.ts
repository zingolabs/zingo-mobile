import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import {
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

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

function statusPayload(indicator: string, socks5Addr?: string): string {
  return JSON.stringify(
    socks5Addr === undefined
      ? { mixnet_indicator: indicator }
      : { mixnet_indicator: indicator, socks5_addr: socks5Addr },
  );
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

const transportBinding = {
  socks5Addr: '127.0.0.1:1080',
  exitNode: 'test-exit',
};

// Every construction here injects a stub transport stop: these tests judge the
// coordinator's own behaviour, and the stop's own contract is judged where it
// is exercised (goOffline, below).
function coordinatorFor(
  startTransport: StartMixnetTransport,
  onChange: (view: MixnetView) => void,
  stopTransport: StopMixnetTransport = jest.fn().mockResolvedValue(undefined),
): MixnetCoordinator {
  return new MixnetCoordinator(startTransport, onChange, stopTransport);
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
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(startTransport, view =>
      published.push(view),
    );

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
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(startTransport, view =>
      published.push(view),
    );

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
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(startTransport, view =>
      published.push(view),
    );

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
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(startTransport, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(published[published.length - 1].statusKey).toBe(
      'mixnet.status.died',
    );

    coordinator.reenable();
    await jest.advanceTimersByTimeAsync(STEADY_POLL_MILLIS * 3);

    expect(mockedBridge.mixnetIndicatorInfo).not.toHaveBeenCalled();
    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.bootstrapping');
    expect(latest.reconnecting).toBe(true);
    coordinator.stop();
  });

  it('keeps sends blocked when the first poll after a transport failure reports off', async () => {
    const startTransport = jest
      .fn()
      .mockRejectedValue(new Error('shim missing'));
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(startTransport, view =>
      published.push(view),
    );
    await coordinator.ensureForConnectedSession();
    await flushPromises();

    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(statusPayload('off'));
    jest.advanceTimersByTime(STEADY_POLL_MILLIS);
    await flushPromises();

    const latest = published[published.length - 1];
    expect(latest.sendBlocked).toBe(true);
    expect(latest.recovery).toBe('reenable');
    coordinator.stop();
  });

  it('a stale bootstrapping publication cannot overwrite a newer view', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('bootstrapping'));
    let releaseNarration!: (payload: string) => void;
    mockedBridge.mixnetBootstrapDetailInfo.mockReturnValue(
      new Promise<string>(resolve => {
        releaseNarration = resolve;
      }),
    );
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(startTransport, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await jest.advanceTimersByTimeAsync(BOOTSTRAP_POLL_MILLIS);
    await flushPromises();
    releaseNarration(JSON.stringify({ detail: 'connecting to a gateway' }));
    await flushPromises();

    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.ready');
    expect(latest.narration).toBeNull();
    coordinator.stop();
  });

  it('polls while running and never overlaps a slow poll', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    mockedBridge.mixnetIndicatorInfo.mockReturnValue(new Promise(() => {}));
    const coordinator = coordinatorFor(
      jest.fn().mockResolvedValue(transportBinding),
      () => {},
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
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    const coordinator = coordinatorFor(
      jest.fn().mockResolvedValue(transportBinding),
      () => {},
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
      .mockResolvedValueOnce(statusPayload('ready', '127.0.0.1:1080'));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(startTransport, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(published[published.length - 1].statusKey).toBe(
      'mixnet.status.died',
    );

    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(2);
    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.ready');
    expect(latest.sendBlocked).toBe(false);
    coordinator.stop();
  });

  it('flags the view as reconnecting from loss until recovery', async () => {
    mockedBridge.attachMixnet
      .mockResolvedValueOnce(statusPayload('died'))
      .mockResolvedValueOnce(statusPayload('ready', '127.0.0.1:1080'));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(startTransport, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(published[published.length - 1].reconnecting).toBe(true);

    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();
    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.ready');
    expect(latest.reconnecting).toBe(false);
    coordinator.stop();
  });

  it('backs off exponentially while the transport stays down', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('died'));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const coordinator = coordinatorFor(startTransport, () => {});

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
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const stopTransport = jest.fn().mockResolvedValue(undefined);
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(
      startTransport,
      view => published.push(view),
      stopTransport,
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    await coordinator.goOffline();
    await flushPromises();

    expect(stopTransport).toHaveBeenCalledTimes(1);
    const resting = published[published.length - 1];
    expect(resting.statusKey).toBe('mixnet.status.off');
    expect(resting.sendBlocked).toBe(true);
    expect(resting.recovery).toBe('none');
    expect(resting.reconnecting).toBe(false);
  });

  // The order is the contract: a shim killed under a live slot reads as an
  // unconsented death, and the app would chase a reconnect it caused itself.
  it('vacates the wallet slot before it kills the tunnel', async () => {
    const acts: string[] = [];
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    mockedBridge.disableMixnet.mockImplementation(async () => {
      acts.push('disable');
      return statusPayload('off');
    });
    const stopTransport = jest.fn().mockImplementation(async () => {
      acts.push('stop');
    });
    const coordinator = coordinatorFor(
      jest.fn().mockResolvedValue(transportBinding),
      () => {},
      stopTransport,
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    await coordinator.goOffline();

    expect(acts).toEqual(['disable', 'stop']);
  });

  it('reports trouble, never off, when the tunnel refuses to stop', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(
      jest.fn().mockResolvedValue(transportBinding),
      view => published.push(view),
      jest.fn().mockRejectedValue(new Error('the shim would not die')),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    await coordinator.goOffline();
    await flushPromises();

    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.unknown');
    expect(latest.sendBlocked).toBe(true);
  });

  it('never reconnects an Offline session whose tunnel refused to stop', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(
      startTransport,
      view => published.push(view),
      jest.fn().mockRejectedValue(new Error('the shim would not die')),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    await coordinator.goOffline();
    await flushPromises();
    await jest.advanceTimersByTimeAsync(RECONNECT_MAX_MILLIS * 2);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.unknown');
    expect(latest.reconnecting).toBe(false);
  });

  it('leaves the new tunnel alone when the session returns Online during the disable', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    let releaseDisable!: (payload: string) => void;
    mockedBridge.disableMixnet.mockReturnValue(
      new Promise<string>(resolve => {
        releaseDisable = resolve;
      }),
    );
    const stopTransport = jest.fn().mockResolvedValue(undefined);
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(
      jest.fn().mockResolvedValue(transportBinding),
      view => published.push(view),
      stopTransport,
    );

    const goingOffline = coordinator.goOffline();
    await coordinator.ensureForConnectedSession();
    await flushPromises();
    releaseDisable(statusPayload('off'));
    await goingOffline;
    await flushPromises();

    expect(stopTransport).not.toHaveBeenCalled();
    expect(published[published.length - 1].statusKey).toBe(
      'mixnet.status.ready',
    );
    coordinator.stop();
  });

  // The launch-Offline case: nothing was ever armed, and the header still has
  // to report where nym stands.
  it('lands off on a session that never armed a transport', async () => {
    const startTransport = jest.fn();
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(
      startTransport,
      view => published.push(view),
      jest.fn().mockResolvedValue(undefined),
    );

    await coordinator.goOffline();
    await flushPromises();

    expect(startTransport).not.toHaveBeenCalled();
    expect(published[published.length - 1].statusKey).toBe('mixnet.status.off');
  });

  // The regression this whole change exists for: no timer may dial the mixnet
  // once the session has gone Offline.
  it('cancels a pending reconnect instead of dialing after going offline', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('died'));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const published: MixnetView[] = [];
    const coordinator = coordinatorFor(
      startTransport,
      view => published.push(view),
      jest.fn().mockResolvedValue(undefined),
    );

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
    expect(published[published.length - 1].statusKey).toBe('mixnet.status.off');
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
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('bootstrapping'));
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
      statusPayload('bootstrapping'),
    );
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const coordinator = coordinatorFor(startTransport, () => {});

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
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('bootstrapping'));
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
      statusPayload('bootstrapping'),
    );
    let releaseStart!: (binding: MixnetTransportBinding) => void;
    const startTransport = jest
      .fn()
      .mockReturnValueOnce(
        new Promise<MixnetTransportBinding>(resolve => {
          releaseStart = resolve;
        }),
      )
      .mockResolvedValue(transportBinding);
    const coordinator = coordinatorFor(startTransport, () => {});

    coordinator.ensureForConnectedSession();
    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS * 2);
    expect(startTransport).toHaveBeenCalledTimes(1);

    releaseStart(transportBinding);
    await flushPromises();
    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(2);
    coordinator.stop();
  });

  it('leaves a draw that proves itself in time alone', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const coordinator = coordinatorFor(startTransport, () => {});

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
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('bootstrapping'));
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
      statusPayload('bootstrapping'),
    );
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const coordinator = coordinatorFor(startTransport, () => {});

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
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('bootstrapping'));
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
      statusPayload('bootstrapping'),
    );
    mockedBridge.disableMixnet.mockResolvedValue(statusPayload('off'));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const coordinator = coordinatorFor(
      startTransport,
      () => {},
      jest.fn().mockResolvedValue(undefined),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    await coordinator.goOffline();
    await flushPromises();

    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS * 2);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
  });

  it('never draws again once the coordinator is stopped', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('bootstrapping'));
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
      statusPayload('bootstrapping'),
    );
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const coordinator = coordinatorFor(startTransport, () => {});

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    coordinator.stop();

    await jest.advanceTimersByTimeAsync(BOOTSTRAP_DEADLINE_MILLIS * 2);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
  });
});
