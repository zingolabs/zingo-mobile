/**
 * The go-online / go-offline moment (zingo-mobile#1427): the mixnet's lifetime
 * follows the session's connectivity, never the app's own lifetime. An Offline
 * session — the empty server URI — holds no tunnel, and the transitions in
 * both directions land on `configure`, the one place every caller already goes
 * through after changing the server.
 *
 * zingo-cli gates its own driver call the same way, on
 * `Communications::Online`: "Offline sessions never transmit and skip the
 * driver entirely."
 */
import { ServerType } from '@app/AppState';
import {
  mockOfflineServer as OFFLINE,
  mockServer as ONLINE,
} from '../__mocks__/dataMocks/mockServer';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';
import { WalletBackendConfig } from '@app/walletBackend/config/WalletBackendConfig';
import WalletBackend from '@app/walletBackend/WalletBackend';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

// The sync side is out of scope here: this suite judges the connectivity
// decision alone, so the coordinator that would dial an indexer is inert.
jest.mock('@app/walletBackend/modules/SyncCoordinator', () => ({
  SyncCoordinator: class {
    async configure(): Promise<void> {}
    async clearTimers(): Promise<void> {}
  },
}));

import RPCModule from '@app/RPCModule';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

type Harness = {
  backend: WalletBackend;
  start: jest.Mock;
  stop: jest.Mock;
  published: MixnetView[];
};

function harness(server: ServerType, mixnetSupported: boolean = true): Harness {
  const start = jest
    .fn()
    .mockResolvedValue({ socks5Addr: '127.0.0.1:1080', exitNode: 'exit' });
  const stop = jest.fn().mockResolvedValue(undefined);
  const published: MixnetView[] = [];
  const config = {
    onBalanceChanged: jest.fn(),
    onValueTransfersChanged: jest.fn(),
    onMessagesChanged: jest.fn(),
    onAddressesChanged: jest.fn(),
    onInfoChanged: jest.fn(),
    onSyncStatusChanged: jest.fn(),
    onZingolibVersionChanged: jest.fn(),
    onBirthdayChanged: jest.fn(),
    onError: jest.fn(),
    onMixnetViewChanged: (view: MixnetView) => published.push(view),
    startMixnetTransport: start,
    stopMixnetTransport: stop,
    mixnetSupported,
    keepAwake: jest.fn(),
    readOnly: false,
    server,
    performanceLevel: RPCPerformanceLevelEnum.Medium,
  } as unknown as WalletBackendConfig;
  return { backend: new WalletBackend(config), start, stop, published };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('the mixnet follows the session connectivity', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockedBridge.attachMixnet.mockResolvedValue(
      JSON.stringify({
        mixnet_indicator: 'ready',
        socks5_addr: '127.0.0.1:1080',
      }),
    );
    mockedBridge.disableMixnet.mockResolvedValue(
      JSON.stringify({ mixnet_indicator: 'off' }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // The bug this suite exists for: Offline used to arm the transport anyway,
  // so a session with no server still bootstrapped a mixnet client.
  it('never arms a transport for a session that launches Offline', async () => {
    const { backend, start, stop, published } = harness(OFFLINE);

    await backend.configure();
    await flushPromises();

    expect(start).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
    expect(published[published.length - 1].statusKey).toBe('mixnet.status.off');
    backend.stopMixnetPolling();
  });

  it('arms it once for a connected session', async () => {
    const { backend, start, stop } = harness(ONLINE);

    await backend.configure();
    await flushPromises();
    // A second configure — a foreground return, a reconnect — must not
    // restart a transport that is already up.
    await backend.configure();
    await flushPromises();

    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
    backend.stopMixnetPolling();
  });

  it('tears the tunnel down when the session goes Offline', async () => {
    const { backend, start, stop, published } = harness(ONLINE);

    await backend.configure();
    await flushPromises();
    expect(start).toHaveBeenCalledTimes(1);

    backend.setServer(OFFLINE);
    await backend.configure();
    await flushPromises();

    expect(stop).toHaveBeenCalledTimes(1);
    expect(published[published.length - 1].statusKey).toBe('mixnet.status.off');
    backend.stopMixnetPolling();
  });

  it('arms it at the moment the session goes back Online', async () => {
    const { backend, start, published } = harness(OFFLINE);

    await backend.configure();
    await flushPromises();
    expect(start).not.toHaveBeenCalled();

    backend.setServer(ONLINE);
    await backend.configure();
    await flushPromises();

    expect(start).toHaveBeenCalledTimes(1);
    expect(published[published.length - 1].statusKey).toBe(
      'mixnet.status.ready',
    );
    backend.stopMixnetPolling();
  });

  // An Offline re-enable would dial behind the mode's back, so it settles
  // back at off instead.
  it('refuses a re-enable while Offline', async () => {
    const { backend, start, published } = harness(OFFLINE);

    await backend.configure();
    await flushPromises();
    await backend.reenableMixnet();
    await flushPromises();

    expect(start).not.toHaveBeenCalled();
    expect(published[published.length - 1].statusKey).toBe('mixnet.status.off');
    backend.stopMixnetPolling();
  });

  it('leaves the transport alone where the platform has none', async () => {
    const { backend, start, stop, published } = harness(OFFLINE, false);

    await backend.configure();
    await flushPromises();

    expect(start).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
    expect(published).toHaveLength(0);
    backend.stopMixnetPolling();
  });
});
