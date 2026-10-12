jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {
    getFreeDiskStorage: jest.fn(() => Promise.resolve(3 * 1024 ** 3)),
    getUsedMemory: jest.fn(() => Promise.resolve(300 * 1024 ** 2)),
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
  diskBucket,
  memoryBucket,
  privateHosts,
  reportDiagnostics,
  resetReportStateForTests,
  updateReportState,
} from '@app/services/reportDiagnostics';
import { RPCSyncScanRangePriorityStatusEnum } from '@app/walletBackend/enums/RPCSyncScanRangePriorityStatusEnum';

const translate = (k: string) => k;

beforeEach(() => resetReportStateForTests());

test('a wallet on a public server reports where it is and how far', async () => {
  updateReportState({
    server: remoteServer('https://zec.rocks:443', ChainNameEnum.mainChainName),
    selectServer: SelectServerEnum.auto,
    walletChain: ChainNameEnum.mainChainName,
    readOnly: true,
    mixnetStatus: 'mixnet.status.ready',
    syncingStatus: {
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
  expect(out).toContain('Power saving: on');
  expect(out).toContain('Free disk: 1-5 GB, app memory: 256-512 MB');
  expect(out).toMatch(/Time \(UTC\): \d{4}-\d\d-\d\dT/);
});

test('a custom server is described, never named', async () => {
  const uri = 'https://node.alice.home:9067';
  updateReportState({
    server: remoteServer(uri, ChainNameEnum.mainChainName),
    selectServer: SelectServerEnum.custom,
  });
  const out = await reportDiagnostics(translate);
  expect(out).not.toContain('alice');
  expect(out).toContain('Server: custom, https, onion: no');
  expect(privateHosts(translate)).toEqual([uri, 'node.alice.home']);
});

test('offline and no wallet read plainly', async () => {
  updateReportState({ server: offlineServer(ChainNameEnum.testChainName) });
  const out = await reportDiagnostics(translate);
  expect(out).toContain(`Server: offline (${ChainNameEnum.testChainName})`);
  expect(out).toContain('Wallet: not open');
  expect(privateHosts(translate)).toEqual([]);
});

test('amounts go out as ranges', () => {
  expect(diskBucket(-1)).toBe('unknown');
  expect(diskBucket(512 * 1024 ** 2)).toBe('< 1 GB');
  expect(diskBucket(10 * 1024 ** 3)).toBe('> 5 GB');
  expect(memoryBucket(0)).toBe('unknown');
  expect(memoryBucket(100 * 1024 ** 2)).toBe('< 256 MB');
  expect(memoryBucket(900 * 1024 ** 2)).toBe('> 512 MB');
});
