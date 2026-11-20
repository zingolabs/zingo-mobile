let mockFile: string | null = null;
let mockActive = true;
let mockMeta: Record<string, unknown> = {};

jest.mock('@app/services/appFiles', () => ({
  readAppFile: jest.fn(async () =>
    mockFile === null ? { kind: 'missing' } : { kind: 'text', text: mockFile },
  ),
  writeAppFile: jest.fn(async (_name: string, contents: string) => {
    mockFile = contents;
  }),
}));

jest.mock('@app/uris', () => ({
  serverUris: () => [
    {
      uri: 'https://mainnet.example:9067',
      chainName: 'main',
      default: true,
      obsolete: false,
    },
  ],
}));

// One wallet is active unless a test says none is: its server lives in its meta.
jest.mock('@app/walletBackend/utils/walletStore', () => ({
  activeWalletEntry: jest.fn(async () =>
    mockActive
      ? { kind: 'wallet', wallet: { id: 'w1', hasFile: true, meta: mockMeta } }
      : { kind: 'none' },
  ),
  updateWalletMeta: jest.fn(
    async (_id: string, patch: Record<string, unknown>) => {
      mockMeta = { ...mockMeta, ...patch };
      return { ok: true, value: mockMeta };
    },
  ),
}));

import SettingsFileImpl from '@app/services/SettingsFileImpl';
import {
  ChainNameEnum,
  SelectServerEnum,
  offlineServer,
  remoteServer,
} from '@app/AppState';

const stored = () => JSON.parse(mockFile as string);

beforeEach(() => {
  mockFile = null;
  mockActive = true;
  mockMeta = { v: 1, id: 'w1', order: 1, createdAt: 0, name: 'Wallet 1' };
});

test('Tests that the wallet meta stores an empty uri and the offline selection when the app writes an offline server. The native background sync reads the empty uri as offline.', async () => {
  await SettingsFileImpl.writeServer(
    offlineServer(ChainNameEnum.testChainName),
    SelectServerEnum.list,
  );

  expect(mockMeta.server).toEqual({ uri: '', chainName: 'test' });
  expect(mockMeta.selectServer).toBe('offline');
  expect(mockFile === null || !('server' in stored())).toBe(true);
  expect((await SettingsFileImpl.readSettings()).server).toEqual(
    offlineServer(ChainNameEnum.testChainName),
  );
});

test('Tests that a remote server and its mode read back unchanged when the app writes them.', async () => {
  const server = remoteServer(
    'https://other.example:443',
    ChainNameEnum.mainChainName,
  );
  await SettingsFileImpl.writeServer(server, SelectServerEnum.custom);

  const settings = await SettingsFileImpl.readSettings();
  expect(settings.server).toEqual(server);
  expect(settings.selectServer).toBe(SelectServerEnum.custom);
});

test('Tests that the server is not kept when no wallet is active. The onboarding holds its choice until the first wallet exists.', async () => {
  mockActive = false;
  await SettingsFileImpl.writeServer(
    remoteServer('https://other.example:443', ChainNameEnum.mainChainName),
    SelectServerEnum.custom,
  );

  expect(mockFile === null || !('server' in stored())).toBe(true);
});

test('Tests that a single-wallet file hands its server to the active wallet once and drops it when it is read.', async () => {
  mockFile = JSON.stringify({
    server: { uri: 'https://other.example:443', chainName: 'main' },
    selectServer: 'custom',
  });

  await SettingsFileImpl.readSettings();

  expect(mockMeta.server).toEqual({
    uri: 'https://other.example:443',
    chainName: 'main',
  });
  expect(mockMeta.selectServer).toBe('custom');
  expect('server' in stored()).toBe(false);
});

test('Tests that a legacy offline file decodes to an offline server when it carries the offline selection.', async () => {
  mockFile = JSON.stringify({
    server: { uri: '', chainName: '' },
    selectServer: 'offline',
  });

  const settings = await SettingsFileImpl.readSettings();
  expect(settings.server).toEqual(offlineServer(ChainNameEnum.mainChainName));
  expect(settings.selectServer).toBe(SelectServerEnum.auto);
});

test('Tests that a legacy file decodes to the default remote server when it pairs an empty uri with a remote mode.', async () => {
  mockFile = JSON.stringify({
    server: { uri: '', chainName: 'main' },
    selectServer: 'auto',
  });

  expect((await SettingsFileImpl.readSettings()).server).toEqual(
    remoteServer('https://mainnet.example:9067', ChainNameEnum.mainChainName),
  );
});

test('Tests that a legacy file decodes to an offline server when it has an empty uri and no selection.', async () => {
  mockFile = JSON.stringify({ server: { uri: '', chainName: 'test' } });

  expect((await SettingsFileImpl.readSettings()).server).toEqual(
    offlineServer(ChainNameEnum.testChainName),
  );
});
