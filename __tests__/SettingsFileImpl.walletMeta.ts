/**
 * With a wallet active, the server and the seed backup flags are that
 * wallet's: they live in its meta, and a file written by a single-wallet
 * build hands its flags to the wallet once.
 */

let mockFile: string | null = null;
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
    { uri: 'https://mainnet.example:9067', chainName: 'main' },
    { uri: 'https://testnet.example:9067', chainName: 'test' },
  ],
}));

jest.mock('@app/walletBackend/utils/walletStore', () => ({
  activeWalletEntry: jest.fn(async () => ({
    kind: 'wallet',
    wallet: { id: 'w1', hasFile: true, meta: mockMeta },
  })),
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
  SettingsNameEnum,
  remoteServer,
} from '@app/AppState';

const file = (): Record<string, unknown> => JSON.parse(mockFile as string);

beforeEach(() => {
  mockFile = JSON.stringify({
    server: { uri: 'https://mainnet.example:9067', chainName: 'main' },
    selectServer: 'auto',
  });
  mockMeta = { v: 1, id: 'w1', order: 1, createdAt: 0, name: 'Wallet 1' };
});

test('Tests that a seed flag lands in the wallet meta and not in the file when a wallet is active.', async () => {
  await SettingsFileImpl.writeSettings(SettingsNameEnum.seedBackedUp, true);

  expect(mockMeta.seedBackedUp).toBe(true);
  expect(file()).not.toHaveProperty('seedBackedUp');
  expect((await SettingsFileImpl.readSettings()).seedBackedUp).toBe(true);
});

test('Tests that a wallet without flags reads the defaults when its meta has none.', async () => {
  const settings = await SettingsFileImpl.readSettings();

  expect(settings.seedBackedUp).toBe(false);
  expect(settings.seedBackedUpAt).toBe(0);
  expect(settings.viewOnlyNoticeDismissed).toBe(false);
});

test('Tests that a server choice lands in the meta and in the file when a wallet is active.', async () => {
  await SettingsFileImpl.writeServer(
    remoteServer('https://testnet.example:9067', ChainNameEnum.testChainName),
    SelectServerEnum.list,
  );

  expect(mockMeta.server).toEqual({
    uri: 'https://testnet.example:9067',
    chainName: 'test',
  });
  expect(mockMeta.selectServer).toBe('list');
  expect(file().selectServer).toBe('list');
});

test("Tests that the wallet's server wins over the file's when both exist.", async () => {
  mockMeta.server = { uri: 'https://testnet.example:9067' };
  mockMeta.chain = 'test';
  mockMeta.selectServer = 'list';

  const settings = await SettingsFileImpl.readSettings();

  expect(settings.server).toEqual(
    remoteServer('https://testnet.example:9067', ChainNameEnum.testChainName),
  );
  expect(settings.selectServer).toBe(SelectServerEnum.list);
});

test('Tests that the flags a single-wallet file holds move into the active wallet once when it is read.', async () => {
  mockFile = JSON.stringify({
    ...file(),
    seedBackedUp: true,
    seedBackedUpAt: 42,
    viewOnlyNoticeDismissed: true,
  });

  const settings = await SettingsFileImpl.readSettings();

  expect(settings.seedBackedUp).toBe(true);
  expect(mockMeta.seedBackedUpAt).toBe(42);
  expect(file()).not.toHaveProperty('seedBackedUp');
  expect(file()).not.toHaveProperty('viewOnlyNoticeDismissed');
});

test('Tests that a moved flag never overwrites the one the wallet already has when both exist.', async () => {
  mockMeta.seedBackedUp = false;
  mockFile = JSON.stringify({ ...file(), seedBackedUp: true });

  const settings = await SettingsFileImpl.readSettings();

  expect(settings.seedBackedUp).toBe(false);
  expect(file()).not.toHaveProperty('seedBackedUp');
});
