jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {
    getFreeDiskStorage: jest.fn(() => Promise.resolve(3 * 1024 ** 3)),
    getUsedMemory: jest.fn(() => Promise.reject(new Error('unsupported'))),
    getPowerState: jest.fn(() => Promise.resolve({ lowPowerMode: true })),
  },
}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(() =>
      Promise.resolve({ type: 'wifi', isInternetReachable: null }),
    ),
  },
}));

import 'react-native';
import {
  ChainNameEnum,
  SelectServerEnum,
  offlineServer,
  remoteServer,
} from '@app/AppState';
import {
  INITIAL,
  Served,
  diskBucket,
  memoryBucket,
  privateHosts,
  publishReport,
  reportDiagnostics,
  syncLine,
} from '@app/services/reportDiagnostics';
import { RPCSyncScanRangePriorityStatusEnum } from '@app/walletBackend/enums/RPCSyncScanRangePriorityStatusEnum';
import {
  ABSENT_MIXNET_VIEW,
  INITIAL_MIXNET_VIEW,
} from '@app/walletBackend/transforms/mixnetView';

const translate = (k: string) => k;

const chosen = (
  uri: string,
  selectServer: SelectServerEnum,
): Extract<Served, { kind: 'chosen' }> => ({
  kind: 'chosen',
  server: remoteServer(uri, ChainNameEnum.mainChainName),
  selectServer,
});

beforeEach(() => publishReport(INITIAL));

test('Tests that the report names the server, the wallet and the sync when a wallet is open on a public server', async () => {
  publishReport({
    served: chosen('https://zec.rocks:443', SelectServerEnum.auto),
    session: {
      kind: 'open',
      chain: ChainNameEnum.mainChainName,
      readOnly: true,
      lastError: '',
      mixnetView: { ...INITIAL_MIXNET_VIEW, statusKey: 'mixnet.status.ready' },
      sync: {
        percentage_total_outputs_scanned: 87.25,
        scan_ranges: [
          {
            priority: RPCSyncScanRangePriorityStatusEnum.Scanned,
            start_block: 0,
            end_block: 900,
          },
          {
            priority: RPCSyncScanRangePriorityStatusEnum.Historic,
            start_block: 900,
            end_block: 1000,
          },
        ],
      },
    },
  });
  const out = await reportDiagnostics(translate);
  expect(out).toContain(
    `Server: https://zec.rocks:443 (${ChainNameEnum.mainChainName}, auto)`,
  );
  expect(out).toContain(
    `Wallet: view-only, ${ChainNameEnum.mainChainName}, matches server: yes`,
  );
  expect(out).toContain('Network: wifi, internet: unknown');
  expect(out).toContain('Mixnet: mixnet.status.ready');
  expect(out).toContain('Sync: 87.3%, 100 blocks left');
  expect(out).toContain('Last error: none');
  expect(out).toContain('Power saving: on');
  expect(out).toContain('Free disk: 1-5 GB, app memory: unknown');
  expect(out).toMatch(/Time \(UTC\): \d{4}-\d\d-\d\dT/);
});

test('Tests that the report describes the server without its name when a custom server is off the published list', async () => {
  const uri = 'https://node.alice.home:9067';
  const served = chosen(uri, SelectServerEnum.custom);
  publishReport({ served });
  const out = await reportDiagnostics(translate);
  expect(out).not.toContain('alice');
  expect(out).toContain(
    `Server: custom, https, onion: no (${ChainNameEnum.mainChainName})`,
  );
  expect(privateHosts(served, translate)).toEqual([uri, 'node.alice.home']);
});

test('Tests that the hosts carry the bracketed literal when a custom server is an IPv6 address', () => {
  const uri = 'http://[::1]:9067';
  expect(privateHosts(chosen(uri, SelectServerEnum.custom), translate)).toEqual(
    [uri, '[::1]'],
  );
});

test('Tests that the report reads offline and not open when the server is offline and no wallet is open', async () => {
  publishReport({
    served: {
      kind: 'chosen',
      server: offlineServer(ChainNameEnum.testChainName),
      selectServer: SelectServerEnum.custom,
    },
  });
  const out = await reportDiagnostics(translate);
  expect(out).toContain(`Server: offline (${ChainNameEnum.testChainName})`);
  expect(out).toContain('Wallet: not open');
  expect(out).not.toContain('Mixnet:');
});

test('Tests that the mixnet reads absent when a session is open without a transport', async () => {
  publishReport({
    session: {
      kind: 'open',
      chain: ChainNameEnum.mainChainName,
      readOnly: false,
      lastError: 'boom',
      mixnetView: ABSENT_MIXNET_VIEW,
      sync: {},
    },
  });
  const out = await reportDiagnostics(translate);
  expect(out).toContain(
    `Wallet: seed, ${ChainNameEnum.mainChainName}, matches server: unknown`,
  );
  expect(out).toContain('Mixnet: absent');
  expect(out).toContain('Sync: no status');
  expect(out).toContain('Last error: boom');
});

test('Tests that the sync line falls back to the block percentage when the output percentage is NaN', () => {
  expect(
    syncLine({
      percentage_total_outputs_scanned: NaN,
      percentage_total_blocks_scanned: 42.5,
      scan_ranges: [],
    }),
  ).toBe('42.5%, 0 blocks left');
});

test('Tests that amounts go out as ranges when a report states disk and memory', () => {
  expect(diskBucket(-1)).toBe('unknown');
  expect(diskBucket(512 * 1024 ** 2)).toBe('< 1 GB');
  expect(diskBucket(10 * 1024 ** 3)).toBe('> 5 GB');
  expect(memoryBucket(0)).toBe('unknown');
  expect(memoryBucket(100 * 1024 ** 2)).toBe('< 256 MB');
  expect(memoryBucket(900 * 1024 ** 2)).toBe('> 512 MB');
});

test('Tests that an amount on a range edge goes to the upper range when it equals the edge', () => {
  expect(diskBucket(1024 ** 3)).toBe('1-5 GB');
  expect(diskBucket(5 * 1024 ** 3)).toBe('> 5 GB');
  expect(memoryBucket(256 * 1024 ** 2)).toBe('256-512 MB');
});

test('Tests that the report still renders when a native call throws before it returns a promise', async () => {
  const DeviceInfo = require('react-native-device-info').default;
  DeviceInfo.getPowerState.mockImplementationOnce(() => {
    throw new Error('native module missing');
  });
  const out: string = await reportDiagnostics(translate);
  expect(out).toContain('Power saving: unknown');
  expect(out).toContain('Free disk: 1-5 GB');
});
