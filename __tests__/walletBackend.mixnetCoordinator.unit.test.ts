import { RPCMixnetModeEnum } from '@app/walletBackend/enums/RPCMixnetModeEnum';
import {
  MixnetCoordinator,
  RECONNECT_BASE_MILLIS,
  STEADY_POLL_MILLIS,
} from '@app/walletBackend/modules/MixnetCoordinator';
import { deriveMixnetView } from '@app/walletBackend/transforms/mixnetPresenter';
import { MixnetView } from '@app/walletBackend/transforms/mixnetPresenter';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

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

describe('deriveMixnetView', () => {
  const noDetail = null;

  it('blocks sending in every state except off and ready', () => {
    const blocked = (view: MixnetView) => view.sendBlocked;
    expect(
      blocked(
        deriveMixnetView(
          { kind: 'status', mode: RPCMixnetModeEnum.off, socks5Addr: null },
          noDetail,
        ),
      ),
    ).toBe(false);
    expect(
      blocked(
        deriveMixnetView(
          {
            kind: 'status',
            mode: RPCMixnetModeEnum.ready,
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
            mode: RPCMixnetModeEnum.bootstrapping,
            socks5Addr: null,
          },
          noDetail,
        ),
      ),
    ).toBe(true);
    expect(
      blocked(
        deriveMixnetView(
          { kind: 'status', mode: RPCMixnetModeEnum.died, socks5Addr: null },
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
        { kind: 'status', mode: RPCMixnetModeEnum.died, socks5Addr: null },
        noDetail,
      ).recovery,
    ).toBe('reenable');
    expect(
      deriveMixnetView(
        {
          kind: 'status',
          mode: RPCMixnetModeEnum.bootstrapping,
          socks5Addr: null,
        },
        noDetail,
      ).recovery,
    ).toBe('wait');
    expect(
      deriveMixnetView(
        {
          kind: 'status',
          mode: RPCMixnetModeEnum.ready,
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
          mode: RPCMixnetModeEnum.bootstrapping,
          socks5Addr: null,
        },
        narration,
      ).narration,
    ).toBe('attempt 2/10');
    expect(
      deriveMixnetView(
        {
          kind: 'status',
          mode: RPCMixnetModeEnum.ready,
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
    const startTransport = jest.fn().mockResolvedValue('127.0.0.1:1080');
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
    expect(mockedBridge.attachMixnet).toHaveBeenCalledWith('127.0.0.1:1080');
    expect(published).toHaveLength(1);
    expect(published[0].statusKey).toBe('mixnet.status.bootstrapping');
    expect(published[0].narration).toBe('attempt 1/10');
    expect(published[0].sendBlocked).toBe(true);
    coordinator.stop();
  });

  it('a transport-start failure publishes the failure view and offers re-enable, never clearnet', async () => {
    const startTransport = jest
      .fn()
      .mockRejectedValue(new Error('shim missing'));
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    expect(published).toHaveLength(1);
    expect(published[0].statusKey).toBe('mixnet.status.unknown');
    expect(published[0].sendBlocked).toBe(true);
    expect(published[0].recovery).toBe('reenable');
    expect(mockedBridge.attachMixnet).not.toHaveBeenCalled();
    coordinator.stop();
  });

  it('keeps sends blocked when the first poll after a transport failure reports off (#1226)', async () => {
    const startTransport = jest
      .fn()
      .mockRejectedValue(new Error('shim missing'));
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, view =>
      published.push(view),
    );
    await coordinator.ensureForConnectedSession();
    await flushPromises();

    // The wallet was never attached, so its default mode is `off` — the
    // same string a deliberate disable produces. The poll must not read
    // it as consent.
    mockedBridge.mixnetModeInfo.mockResolvedValue(statusPayload('off'));
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
    const startTransport = jest.fn().mockResolvedValue('127.0.0.1:1080');
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, view =>
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
    const startTransport = jest.fn().mockResolvedValue('127.0.0.1:1080');
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, view =>
      published.push(view),
    );
    await coordinator.ensureForConnectedSession();
    await coordinator.disable();
    await flushPromises();

    mockedBridge.mixnetModeInfo.mockResolvedValue(statusPayload('off'));
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
      jest.fn().mockResolvedValue('127.0.0.1:1080'),
      view => published.push(view),
    );

    await coordinator.disable();
    await flushPromises();

    expect(published).toHaveLength(1);
    expect(published[0].statusKey).toBe('mixnet.status.off');
    expect(published[0].sendBlocked).toBe(false);
    coordinator.stop();
  });

  it('polls while running and never overlaps a slow poll', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    // A status poll that never settles: the lock must swallow later ticks.
    mockedBridge.mixnetModeInfo.mockReturnValue(new Promise(() => {}));
    const coordinator = new MixnetCoordinator(
      jest.fn().mockResolvedValue('127.0.0.1:1080'),
      () => {},
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    await jest.advanceTimersByTimeAsync(30_000);
    await jest.advanceTimersByTimeAsync(30_000);
    await jest.advanceTimersByTimeAsync(30_000);
    expect(mockedBridge.mixnetModeInfo).toHaveBeenCalledTimes(1);
    coordinator.stop();
  });

  it('stop() halts polling', async () => {
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    mockedBridge.mixnetModeInfo.mockResolvedValue(
      statusPayload('ready', '127.0.0.1:1080'),
    );
    const coordinator = new MixnetCoordinator(
      jest.fn().mockResolvedValue('127.0.0.1:1080'),
      () => {},
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();
    coordinator.stop();

    await jest.advanceTimersByTimeAsync(120_000);
    expect(mockedBridge.mixnetModeInfo).not.toHaveBeenCalled();
  });

  it('auto-reconnects after the transport dies, with no user action', async () => {
    mockedBridge.attachMixnet
      .mockResolvedValueOnce(statusPayload('died'))
      .mockResolvedValueOnce(statusPayload('ready', '127.0.0.1:1080'));
    const startTransport = jest.fn().mockResolvedValue('127.0.0.1:1080');
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, view =>
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
    const startTransport = jest.fn().mockResolvedValue('127.0.0.1:1080');
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, view =>
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
    const startTransport = jest.fn().mockResolvedValue('127.0.0.1:1080');
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, view =>
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
    const startTransport = jest.fn().mockResolvedValue('127.0.0.1:1080');
    const coordinator = new MixnetCoordinator(startTransport, () => {});

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
