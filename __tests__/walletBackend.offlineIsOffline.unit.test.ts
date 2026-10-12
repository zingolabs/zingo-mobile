/**
 * Offline is offline, asserted over the composed backend (zingo-mobile#1427).
 *
 * The branch's whole promise is that a session with no server reaches no
 * network, and until now that promise rested on three softer things: a reading
 * of the code, one measured device session, and per-module unit tests. Each
 * offline leak this branch fixed was in a different module — the sync tick, the
 * value-transfer fetch that asked for a server height first, the mixnet
 * transport, the Settings registry — so per-module tests are exactly the shape
 * that misses the next one.
 *
 * This drives the real object graph. `WalletBackend` composes the sync
 * coordinator, the data service and the mixnet coordinator, so one harness
 * covers all three at once: run connectivity scripts through it and assert that
 * nothing which touches a server is ever called while the session is Offline.
 *
 * The classification FAILS CLOSED. A bridge method is allowed Offline only by
 * appearing in `WALLET_LOCAL` below, so a new call added anywhere under
 * `walletBackend` fails this test until someone classifies it deliberately.
 * That is the point: the check outlives the four leaks that prompted it.
 *
 * Checked by putting each of this branch's Offline gates back the way it was,
 * and confirming this suite fails. Every leak this branch fixed is covered:
 *
 *   removed gate                              caught by the call
 *   ----------------------------------------  -----------------------------
 *   the mixnet arms while Offline             startMixnetTransport, attachMixnet
 *   the sync poll and its launch              pollSyncInfo
 *   the value transfers ask a server height   getLatestBlockServerInfo
 *   the server info asks the server           infoServerInfo
 *
 * The launch gate alone is redundant with the poll gate — `refreshSync` is only
 * reached through `fetchSyncPoll` — so only removing both is a valid probe. A
 * mutation that does not change behaviour must not fail a suite.
 *
 * Two of this harness's own first findings were bugs in the harness, not the
 * product: an Online phase's transport start judged in the next Offline phase,
 * and a previous script's 5 s tick firing inside the next one. Both are why the
 * mutation table above exists rather than a green run.
 */
import { ChainNameEnum, offlineServer, remoteServer } from '@app/AppState';
import WalletBackend from '@app/walletBackend';
import { mockWalletBackendConfig } from '../__mocks__/dataMocks/mockWalletBackendConfig';

const mockCalls: string[] = [];

jest.mock('@app/RPCModule', () => {
  const members: Record<PropertyKey, jest.Mock> = {};
  return {
    __esModule: true,
    default: new Proxy(members, {
      get: (target, prop) => {
        const name = String(prop);
        return (target[prop] ??= jest.fn().mockImplementation(() => {
          // Recorded before the answer, so a rejecting call counts too.
          mockCalls.push(name);
          return Promise.resolve(mockAnswers[name] ?? '{}');
        }));
      },
    }),
  };
});

// Answers shaped enough that the callers parse them; the test judges WHICH
// mockCalls happen, not what they return.
const mockAnswers: Record<string, string> = {
  getValueTransfersList: JSON.stringify({ value_transfers: [] }),
  getMessagesInfo: JSON.stringify({ value_transfers: [] }),
  getLatestBlockWallet: JSON.stringify({ height: 100 }),
  getWalletSaveRequired: JSON.stringify({ save_required: false }),
  mixnetIndicatorInfo: JSON.stringify({ mixnet_indicator: 'off' }),
  mixnetBootstrapDetailInfo: JSON.stringify({ detail: '' }),
  disableMixnet: JSON.stringify({ mixnet_indicator: 'off' }),
  getConfigWalletPerformance: JSON.stringify({ performance: 'High' }),
  pollSyncInfo: 'Sync task has not been launched.',
};

/**
 * Every bridge member an Offline session may legitimately reach: the wallet on
 * disk and the wallet's own bookkeeping. Nothing here opens a socket.
 *
 * `disableMixnet` belongs here because it only vacates the wallet's transport
 * slot, and `mixnetIndicatorInfo` / `mixnetBootstrapDetailInfo` because both
 * read state the wallet already holds.
 */
const WALLET_LOCAL = new Set([
  // Wallet state on disk, read or written in place.
  'getValueTransfersList',
  'getMessagesInfo',
  'getBalanceInfo',
  'getSpendableBalanceTotalInfo',
  'getSpendableBalanceWithAddressInfo',
  'getTotalMemobytesToAddressInfo',
  'getTotalSpendsToAddressInfo',
  'getTotalValueToAddressInfo',
  'getUnifiedAddressesInfo',
  'getTransparentAddressesInfo',
  'createNewUnifiedAddressProcess',
  'createNewTransparentAddressProcess',
  'getLatestBlockWalletInfo',
  'getSeedInfo',
  'getUfvkInfo',
  'walletKindInfo',
  'getVersionInfo',
  'getWalletVersionInfo',
  'getWalletSaveRequiredInfo',
  'doSave',
  'getConfigWalletPerformanceInfo',
  'setConfigWalletToProdProcess',
  'getOptionWalletInfo',
  'setOptionWalletProcess',
  'removeTransactionProcess',
  'checkMyAddressInfo',
  'parseAddressInfo',
  'parseUfvkInfo',
  'getDonationAddress',
  'getZenniesDonationAddress',
  'walletExists',
  'walletBackupExists',
  'walletFileDiagnosisInfo',
  'walletFileRecoveryInfo',
  // The sync task's own state, not the indexer's: inspecting it and stopping
  // it are local.
  'statusSyncInfo',
  'pauseSyncProcess',
  // The wallet's transport bookkeeping. `disableMixnet` only vacates the slot,
  // and the two reads answer from state the wallet already holds.
  'disableMixnet',
  'mixnetIndicatorInfo',
  'mixnetBootstrapDetailInfo',
  // ZIP 318 classification reads what the wallet recorded. The acts that
  // transmit are not here, and must not be.
  'migrationStatusProcess',
  'reconcileMigrationProcess',
  'drainStatusProcess',
  'splitStatusProcess',
  'executeDuePartsStatusProcess',
  'windowTimelineProcess',
  'setBroadcastCandidates',
  'initLogging',
]);

const OFFLINE = offlineServer(ChainNameEnum.noneChainName);

const ONLINE = remoteServer(
  'https://zec.rocks:443',
  ChainNameEnum.mainChainName,
);

type Act = 'offline' | 'online' | 'tick';

// The scripts a session can walk. Length three over the three acts, which
// covers every launch state, every transition and a tick on either side of one.
function scripts(): Act[][] {
  const acts: Act[] = ['offline', 'online', 'tick'];
  const built: Act[][] = [];
  for (const first of acts) {
    for (const second of acts) {
      built.push([first, second]);
      for (const third of acts) {
        built.push([first, second, third]);
      }
    }
  }
  return built.filter(script => script.includes('offline'));
}

const SYNC_TICK_MILLIS = 5_000;

type Breach = {
  script: string;
  call: string;
  transport: boolean;
};

async function walk(script: readonly Act[]): Promise<Breach[]> {
  // Each script gets its own clock. A previous script left an Online backend
  // behind, and its 5 s tick would otherwise fire inside this one and be read
  // as this session dialling.
  jest.clearAllTimers();
  mockCalls.length = 0;
  const startMixnetTransport = jest.fn().mockResolvedValue({
    socks5Addr: '127.0.0.1:1080',
    exitNode: 'exit',
  });
  const config = mockWalletBackendConfig({
    server: OFFLINE,
    mixnetSupported: true,
    startMixnetTransport,
  });
  const backend = new WalletBackend(config);
  const breaches: Breach[] = [];
  let offline = true;

  const judge = (): void => {
    if (!offline) {
      // An Online phase is allowed everything, so its calls are forgotten
      // rather than carried into the next judgement.
      mockCalls.length = 0;
      startMixnetTransport.mockClear();
      return;
    }
    for (const call of mockCalls.splice(0)) {
      if (!WALLET_LOCAL.has(call)) {
        breaches.push({ script: script.join('>'), call, transport: false });
      }
    }
    if (startMixnetTransport.mock.calls.length > 0) {
      startMixnetTransport.mockClear();
      breaches.push({
        script: script.join('>'),
        call: 'startMixnetTransport',
        transport: true,
      });
    }
  };

  for (const act of script) {
    if (act === 'tick') {
      await jest.advanceTimersByTimeAsync(SYNC_TICK_MILLIS);
    } else {
      offline = act === 'offline';
      backend.setServer(offline ? OFFLINE : ONLINE);
      await backend.configure();
    }
    await Promise.resolve();
    await Promise.resolve();
    judge();
  }

  await backend.clearTimers();
  backend.stopMixnetPolling();
  return breaches;
}

describe('an Offline session reaches no network', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('walks a space that includes every transition', () => {
    const all = scripts();
    expect(all.length).toBeGreaterThan(20);
    expect(all.some(s => s[0] === 'online' && s.includes('offline'))).toBe(
      true,
    );
    expect(all.some(s => s[0] === 'offline' && s.includes('online'))).toBe(
      true,
    );
    expect(all.some(s => s.filter(a => a === 'tick').length > 1)).toBe(true);
  });

  it('never touches a server, whatever the session did before', async () => {
    const breaches: Breach[] = [];
    for (const script of scripts()) {
      breaches.push(...(await walk(script)));
    }
    // Each breach names the script that produced it and the call that broke the
    // promise. A call missing from WALLET_LOCAL shows up here too, which is the
    // reminder to classify it rather than a licence to add it.
    expect(breaches.slice(0, 5)).toEqual([]);
    expect(breaches).toHaveLength(0);
  }, 120_000);
});
