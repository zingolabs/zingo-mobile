import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import {
  MixnetCoordinator,
  RECONNECT_BASE_MILLIS,
  STEADY_POLL_MILLIS,
} from '@app/walletBackend/modules/MixnetCoordinator';
import { deriveMixnetView } from '@app/walletBackend/transforms/mixnetView';
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

const noopStop = () => Promise.resolve();

const transportBinding = {
  socks5Addr: '127.0.0.1:1080',
  exitNode: 'test-exit',
};

describe('deriveMixnetView', () => {
  const noDetail = null;

  it('blocks sending in every state except off and ready', () => {
    const blocked = (view: MixnetView) => view.sendBlocked;
    expect(
      blocked(
        deriveMixnetView(
          {
            kind: 'status',
            indicator: RPCMixnetIndicatorEnum.off,
            socks5Addr: null,
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

describe('MixnetCoordinator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('forced-on: starts the transport, attaches, and publishes the view', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('bootstrapping'));
    mockedBridge.mixnetBootstrapDetailInfo.mockResolvedValue(
      JSON.stringify({ detail: 'attempt 1/10' }),
    );
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
    expect(mockedBridge.attachMixnet).toHaveBeenCalledWith(
      '127.0.0.1:1080',
      'test-exit',
    );
    // The first view is the start. The second view comes from the wallet
    // and has the detail line.
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
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );

    coordinator.ensureForConnectedSession();

    expect(published).toHaveLength(1);
    expect(published[0].statusKey).toBe('mixnet.status.bootstrapping');
    expect(published[0].sendBlocked).toBe(true);
    expect(published[0].recovery).toBe('wait');
    expect(published[0].reconnecting).toBe(false);
    // The wallet is not attached yet. The coordinator does not ask it for
    // a detail line.
    expect(mockedBridge.mixnetBootstrapDetailInfo).not.toHaveBeenCalled();
    coordinator.stop();
  });

  it('a transport-start failure publishes the failure view and offers re-enable, never clearnet', async () => {
    const startTransport = jest
      .fn()
      .mockRejectedValue(new Error('shim missing'));
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
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
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
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

  it('keeps sends blocked when the first poll after a transport failure reports off (#1226)', async () => {
    const startTransport = jest
      .fn()
      .mockRejectedValue(new Error('shim missing'));
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );
    await coordinator.ensureForConnectedSession();
    await flushPromises();

    // The wallet was never attached, so its default mode is `off` — the
    // same string a deliberate disable produces. The poll must not read
    // it as consent.
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(statusPayload('off'));
    jest.advanceTimersByTime(STEADY_POLL_MILLIS);
    await flushPromises();

    const latest = published[published.length - 1];
    expect(latest.sendBlocked).toBe(true);
    expect(latest.recovery).toBe('reenable');
    coordinator.stop();
  });

  it('a stale bootstrapping publication cannot overwrite a newer view (#1228)', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('bootstrapping'));
    // The narration fetch hangs until the test releases it, modeling a
    // slow native call racing a user action.
    let releaseNarration!: (payload: string) => void;
    mockedBridge.mixnetBootstrapDetailInfo.mockReturnValue(
      new Promise<string>(resolve => {
        releaseNarration = resolve;
      }),
    );
    mockedBridge.disableMixnet.mockResolvedValue(statusPayload('off'));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await coordinator.disable();
    await flushPromises();
    releaseNarration(JSON.stringify({ detail: 'connecting to a gateway' }));
    await flushPromises();

    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.off');
    expect(latest.sendBlocked).toBe(false);
    coordinator.stop();
  });

  it('a poll reporting off after a deliberate disable keeps clearnet consent (#1226)', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    mockedBridge.disableMixnet.mockResolvedValue(statusPayload('off'));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );
    await coordinator.ensureForConnectedSession();
    await coordinator.disable();
    await flushPromises();

    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(statusPayload('off'));
    jest.advanceTimersByTime(STEADY_POLL_MILLIS);
    await flushPromises();

    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.off');
    expect(latest.sendBlocked).toBe(false);
    coordinator.stop();
  });

  it('disable publishes the deliberate off, with sending unblocked as consent', async () => {
    mockedBridge.disableMixnet.mockResolvedValue(statusPayload('off'));
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
      noopStop,
      view => published.push(view),
    );

    await coordinator.disable();
    await flushPromises();

    // The first view is the off view. The second view is the wallet's confirmation.
    expect(published).toHaveLength(2);
    expect(published[0].statusKey).toBe('mixnet.status.off');
    expect(published[0].sendBlocked).toBe(false);
    expect(published[1]).toEqual(published[0]);
    coordinator.stop();
  });

  it('disable publishes the off view immediately, before the wallet answers', () => {
    mockedBridge.disableMixnet.mockReturnValue(new Promise(() => {}));
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
      noopStop,
      view => published.push(view),
    );

    coordinator.disable();

    expect(published).toHaveLength(1);
    expect(published[0].statusKey).toBe('mixnet.status.off');
    expect(published[0].sendBlocked).toBe(false);
    coordinator.stop();
  });

  it('disable tears down the platform transport', async () => {
    mockedBridge.disableMixnet.mockResolvedValue(statusPayload('off'));
    const stopTransport = jest.fn().mockResolvedValue(undefined);
    const coordinator = new MixnetCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
      stopTransport,
      () => {},
    );

    await coordinator.disable();
    await flushPromises();

    expect(stopTransport).toHaveBeenCalledTimes(1);
    coordinator.stop();
  });

  it('polls while running and never overlaps a slow poll', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    // A status poll that never settles: the lock must swallow later ticks.
    mockedBridge.mixnetIndicatorInfo.mockReturnValue(new Promise(() => {}));
    const coordinator = new MixnetCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
      noopStop,
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
    const coordinator = new MixnetCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
      noopStop,
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
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(published[published.length - 1].statusKey).toBe(
      'mixnet.status.died',
    );

    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();

    // The transport was restarted without the user touching anything.
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
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    // The transport died, so the cycle is active: reconnecting, not settled.
    expect(published[published.length - 1].reconnecting).toBe(true);

    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();
    // Recovered to ready: the cycle ends.
    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.ready');
    expect(latest.reconnecting).toBe(false);
    coordinator.stop();
  });

  it('a deliberate disable stops the auto-reconnect loop', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('died'));
    mockedBridge.disableMixnet.mockResolvedValue(statusPayload('off'));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    await coordinator.disable();
    await flushPromises();

    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS * 4);
    await flushPromises();

    // Only the initial start; disabling cancelled the pending reconnect.
    expect(startTransport).toHaveBeenCalledTimes(1);
    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.off');
    expect(latest.sendBlocked).toBe(false);
    coordinator.stop();
  });

  it('backs off exponentially while the transport stays down', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(statusPayload('died'));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const coordinator = new MixnetCoordinator(
      startTransport,
      noopStop,
      () => {},
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(1);

    // First retry at the base delay.
    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(2);

    // The next retry is at 2x base, so another base tick alone fires nothing.
    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();
    expect(startTransport).toHaveBeenCalledTimes(3);
    coordinator.stop();
  });
});
