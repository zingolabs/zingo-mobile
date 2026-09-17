import { MixnetIndicator, MixnetStatus, ZingoError } from 'zingo-ffi';
import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import {
  MixnetCoordinator,
  RECONNECT_BASE_MILLIS,
  STEADY_POLL_MILLIS,
} from '@app/walletBackend/modules/MixnetCoordinator';
import { deriveMixnetView } from '@app/walletBackend/transforms/mixnetView';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';
import { installMockWallet, MockWallet } from '../__mocks__/mockWallet';

function status(
  indicator: MixnetIndicator,
  socks5Addr?: string,
  bootstrapDetail?: string,
): MixnetStatus {
  return { indicator, socks5Addr, bootstrapDetail };
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
  const report = (
    indicator: RPCMixnetIndicatorEnum,
    socks5Addr?: string,
  ) => ({ kind: 'status' as const, indicator, socks5Addr, bootstrapDetail: '' });

  test('Tests that sending is blocked in every state except off and ready', () => {
    const blocked = (view: MixnetView) => view.sendBlocked;
    expect(
      blocked(deriveMixnetView(report(RPCMixnetIndicatorEnum.off), noDetail)),
    ).toBe(false);
    expect(
      blocked(
        deriveMixnetView(
          report(RPCMixnetIndicatorEnum.ready, '127.0.0.1:1080'),
          noDetail,
        ),
      ),
    ).toBe(false);
    expect(
      blocked(
        deriveMixnetView(report(RPCMixnetIndicatorEnum.bootstrapping), noDetail),
      ),
    ).toBe(true);
    expect(
      blocked(deriveMixnetView(report(RPCMixnetIndicatorEnum.died), noDetail)),
    ).toBe(true);
    expect(
      blocked(
        deriveMixnetView(
          {
            kind: 'failure',
            failure: {
              reason: 'nativeRejection',
              error: { tag: 'Host', detail: 'gone' },
            },
          },
          noDetail,
        ),
      ),
    ).toBe(true);
  });

  test('Tests that the right recovery is offered per state', () => {
    expect(
      deriveMixnetView(report(RPCMixnetIndicatorEnum.died), noDetail).recovery,
    ).toBe('reenable');
    expect(
      deriveMixnetView(report(RPCMixnetIndicatorEnum.bootstrapping), noDetail)
        .recovery,
    ).toBe('wait');
    expect(
      deriveMixnetView(report(RPCMixnetIndicatorEnum.ready, '127.0.0.1:1'), noDetail)
        .recovery,
    ).toBe('none');
  });

  test('Tests that the narration surfaces only while bootstrapping', () => {
    const narration = { kind: 'detail' as const, detail: 'attempt 2/10' };
    expect(
      deriveMixnetView(report(RPCMixnetIndicatorEnum.bootstrapping), narration)
        .narration,
    ).toBe('attempt 2/10');
    expect(
      deriveMixnetView(report(RPCMixnetIndicatorEnum.ready, '127.0.0.1:1'), narration)
        .narration,
    ).toBeNull();
  });
});

describe('MixnetCoordinator', () => {
  let wallet: MockWallet;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    wallet = installMockWallet().wallet;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Tests that the transport starts, the wallet attaches and the view carries the narration when enabling', async () => {
    wallet.attachMixnet.mockResolvedValue(
      status(MixnetIndicator.Bootstrapping, undefined, 'attempt 1/10'),
    );
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(1);
    expect(wallet.attachMixnet).toHaveBeenCalledWith(
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

  test('Tests that the bootstrapping view publishes immediately when the transport has not answered', () => {
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
    expect(wallet.attachMixnet).not.toHaveBeenCalled();
    coordinator.stop();
  });

  test('Tests that a transport-start failure publishes the failure view and offers re-enable when the shim rejects', async () => {
    const startTransport = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('shim missing'), { code: 'Host' }),
      );
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    expect(published).toHaveLength(2);
    expect(published[1].statusKey).toBe('mixnet.status.unknown');
    expect(published[1].sendBlocked).toBe(true);
    expect(published[1].recovery).toBe('reenable');
    expect(wallet.attachMixnet).not.toHaveBeenCalled();
    coordinator.stop();
  });

  test('Tests that no poll runs while a re-enable is in progress', async () => {
    wallet.attachMixnet.mockResolvedValue(status(MixnetIndicator.Died));
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

    expect(wallet.mixnetStatus).not.toHaveBeenCalled();
    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.bootstrapping');
    expect(latest.reconnecting).toBe(true);
    coordinator.stop();
  });

  test('Tests that sends stay blocked when the first poll after a transport failure reports off', async () => {
    const startTransport = jest
      .fn()
      .mockRejectedValue(new Error('shim missing'));
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );
    await coordinator.ensureForConnectedSession();
    await flushPromises();

    wallet.mixnetStatus.mockResolvedValue(status(MixnetIndicator.Off));
    jest.advanceTimersByTime(STEADY_POLL_MILLIS);
    await flushPromises();

    const latest = published[published.length - 1];
    expect(latest.sendBlocked).toBe(true);
    expect(latest.recovery).toBe('reenable');
    coordinator.stop();
  });

  test('Tests that a late attach answer cannot overwrite the off view when the user disabled meanwhile', async () => {
    let releaseAttach!: (value: MixnetStatus) => void;
    wallet.attachMixnet.mockReturnValue(
      new Promise<MixnetStatus>(resolve => {
        releaseAttach = resolve;
      }),
    );
    wallet.disableMixnet.mockResolvedValue(undefined);
    wallet.mixnetStatus.mockResolvedValue(status(MixnetIndicator.Off));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );

    coordinator.ensureForConnectedSession();
    await flushPromises();
    await coordinator.disable();
    await flushPromises();
    releaseAttach(
      status(MixnetIndicator.Bootstrapping, undefined, 'connecting to a gateway'),
    );
    await flushPromises();

    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.off');
    expect(latest.sendBlocked).toBe(false);
    coordinator.stop();
  });

  test('Tests that a poll reporting off keeps clearnet consent when the user disabled deliberately', async () => {
    wallet.attachMixnet.mockResolvedValue(
      status(MixnetIndicator.Ready, '127.0.0.1:1080'),
    );
    wallet.disableMixnet.mockResolvedValue(undefined);
    wallet.mixnetStatus.mockResolvedValue(status(MixnetIndicator.Off));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(startTransport, noopStop, view =>
      published.push(view),
    );
    await coordinator.ensureForConnectedSession();
    await coordinator.disable();
    await flushPromises();

    wallet.mixnetStatus.mockResolvedValue(status(MixnetIndicator.Off));
    jest.advanceTimersByTime(STEADY_POLL_MILLIS);
    await flushPromises();

    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.off');
    expect(latest.sendBlocked).toBe(false);
    coordinator.stop();
  });

  test('Tests that disable publishes the off view immediately and the wallet confirmation after', async () => {
    wallet.disableMixnet.mockResolvedValue(undefined);
    wallet.mixnetStatus.mockResolvedValue(status(MixnetIndicator.Off));
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
      noopStop,
      view => published.push(view),
    );

    const disabling = coordinator.disable();
    expect(published).toHaveLength(1);
    expect(published[0].statusKey).toBe('mixnet.status.off');
    expect(published[0].sendBlocked).toBe(false);
    await disabling;
    await flushPromises();

    expect(published).toHaveLength(2);
    expect(published[1]).toEqual(published[0]);
    coordinator.stop();
  });

  test('Tests that disable tears down the platform transport when the user consents to clearnet', async () => {
    wallet.disableMixnet.mockResolvedValue(undefined);
    wallet.mixnetStatus.mockResolvedValue(status(MixnetIndicator.Off));
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

  test('Tests that a slow poll is never overlapped when the interval fires again', async () => {
    wallet.attachMixnet.mockResolvedValue(
      status(MixnetIndicator.Ready, '127.0.0.1:1080'),
    );
    wallet.mixnetStatus.mockReturnValue(new Promise(() => {}));
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
    expect(wallet.mixnetStatus).toHaveBeenCalledTimes(1);
    coordinator.stop();
  });

  test('Tests that polling halts when the coordinator stops', async () => {
    wallet.attachMixnet.mockResolvedValue(
      status(MixnetIndicator.Ready, '127.0.0.1:1080'),
    );
    wallet.mixnetStatus.mockResolvedValue(
      status(MixnetIndicator.Ready, '127.0.0.1:1080'),
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
    expect(wallet.mixnetStatus).not.toHaveBeenCalled();
  });

  test('Tests that the transport auto-reconnects and the view flags the cycle when it dies', async () => {
    wallet.attachMixnet
      .mockResolvedValueOnce(status(MixnetIndicator.Died))
      .mockResolvedValueOnce(status(MixnetIndicator.Ready, '127.0.0.1:1080'));
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
    expect(published[published.length - 1].reconnecting).toBe(true);

    await jest.advanceTimersByTimeAsync(RECONNECT_BASE_MILLIS);
    await flushPromises();

    expect(startTransport).toHaveBeenCalledTimes(2);
    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.ready');
    expect(latest.sendBlocked).toBe(false);
    expect(latest.reconnecting).toBe(false);
    coordinator.stop();
  });

  test('Tests that a deliberate disable stops the auto-reconnect loop when the transport died', async () => {
    wallet.attachMixnet.mockResolvedValue(status(MixnetIndicator.Died));
    wallet.disableMixnet.mockResolvedValue(undefined);
    wallet.mixnetStatus.mockResolvedValue(status(MixnetIndicator.Off));
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

    expect(startTransport).toHaveBeenCalledTimes(1);
    const latest = published[published.length - 1];
    expect(latest.statusKey).toBe('mixnet.status.off');
    expect(latest.sendBlocked).toBe(false);
    coordinator.stop();
  });

  test('Tests that the reconnect delay doubles while the transport stays down', async () => {
    wallet.attachMixnet.mockResolvedValue(status(MixnetIndicator.Died));
    const startTransport = jest.fn().mockResolvedValue(transportBinding);
    const coordinator = new MixnetCoordinator(
      startTransport,
      noopStop,
      () => {},
    );

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

  test('Tests that a wallet refusal on attach publishes the failure view when the mixnet cannot attach', async () => {
    wallet.attachMixnet.mockRejectedValue(
      new ZingoError.MixnetEnableFailed({ detail: 'proxy refused' }),
    );
    const published: MixnetView[] = [];
    const coordinator = new MixnetCoordinator(
      jest.fn().mockResolvedValue(transportBinding),
      noopStop,
      view => published.push(view),
    );

    await coordinator.ensureForConnectedSession();
    await flushPromises();

    expect(published[published.length - 1].statusKey).toBe(
      'mixnet.status.unknown',
    );
    coordinator.stop();
  });
});
