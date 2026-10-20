let mockFile: string | null = null;

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/settings-test',
  exists: jest.fn(async () => mockFile !== null),
  readFile: jest.fn(async () => mockFile as string),
  writeFile: jest.fn(async (_path: string, contents: string) => {
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
});

test('Tests that settings.json stores an empty uri and the offline selection when the app writes an offline server. The native background sync reads the empty uri as offline.', async () => {
  await SettingsFileImpl.writeServer(
    offlineServer(ChainNameEnum.testChainName),
    SelectServerEnum.list,
  );

  expect(stored().server).toEqual({ uri: '', chainName: 'test' });
  expect(stored().selectServer).toBe('offline');
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

test('Tests that a legacy offline file decodes to an offline server when it carries the offline selection.', async () => {
  mockFile = JSON.stringify({
    server: { uri: '', chainName: '' },
    selectServer: 'offline',
  });

  const settings = await SettingsFileImpl.readSettings();
  expect(settings.server).toEqual(offlineServer(ChainNameEnum.noneChainName));
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
