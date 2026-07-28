import { RPCMixnetModeEnum } from '../app/walletBackend/enums/RPCMixnetModeEnum';
import { MixnetCoordinator } from '../app/walletBackend/modules/MixnetCoordinator';
import { deriveMixnetView } from '../app/walletBackend/transforms/mixnetPresenter';
import { MixnetView } from '../app/walletBackend/transforms/mixnetPresenter';

jest.mock('../app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '../app/RPCModule';

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

  it('names every death-evidence state: reported, unreported, and notDied', () => {
    const cause = {
      stage: 'remote-tls',
      target: 'gateway.example:443',
      causeChain: ['handshake eof'],
    };
    const report = { kind: 'died' as const, ageMillis: 12_000, death: cause };
    const died = {
      kind: 'status' as const,
      mode: RPCMixnetModeEnum.died,
      socks5Addr: null,
    };
    expect(deriveMixnetView(died, noDetail, report).death).toEqual({
      kind: 'reported',
      ageMillis: 12_000,
      detail: cause,
    });
    // A causeless death still reports its age.
    expect(
      deriveMixnetView(died, noDetail, {
        kind: 'died',
        ageMillis: 7_000,
        death: null,
      }).death,
    ).toEqual({ kind: 'reported', ageMillis: 7_000, detail: null });
    // A failed or absent report is the named bare verdict, never nulls.
    expect(deriveMixnetView(died, noDetail, null).death).toEqual({
      kind: 'unreported',
    });
    expect(
      deriveMixnetView(died, noDetail, {
        kind: 'failure',
        failure: { reason: 'nativeRejection', message: 'gone' },
      }).death,
    ).toEqual({ kind: 'unreported' });
    // Evidence never leaks out of the died status.
    expect(
      deriveMixnetView(
        {
          kind: 'status',
          mode: RPCMixnetModeEnum.ready,
          socks5Addr: '127.0.0.1:1',
        },
        noDetail,
        report,
      ).death,
    ).toEqual({ kind: 'notDied' });
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
    mockedBridge.attachMixnet.mockResolvedValue(
      statusPayload('bootstrapping'),
    );
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
});
