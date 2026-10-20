/**
 * The backup notice on History reads `seedBackedUp`. A file written before
 * the flag existed has no key and reads as not backed up.
 */

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
    { uri: 'https://mainnet.example:9067', chainName: 'main' },
  ],
}));

import SettingsFileImpl from '@app/services/SettingsFileImpl';
import { SettingsNameEnum } from '@app/AppState';

beforeEach(() => {
  mockFile = null;
});

test('Tests that seedBackedUp reads false when the settings file has no such key.', async () => {
  mockFile = JSON.stringify({});
  const settings = await SettingsFileImpl.readSettings();
  expect(settings.seedBackedUp).toBe(false);
});

test('Tests that seedBackedUp reads back true when the backup flow writes it.', async () => {
  mockFile = JSON.stringify({ seedBackedUp: false });
  await SettingsFileImpl.writeSettings(SettingsNameEnum.seedBackedUp, true);
  const settings = await SettingsFileImpl.readSettings();
  expect(settings.seedBackedUp).toBe(true);
});

test('Tests that seedBackedUpAt reads 0 when the settings file has no such key.', async () => {
  mockFile = JSON.stringify({});
  const settings = await SettingsFileImpl.readSettings();
  expect(settings.seedBackedUpAt).toBe(0);
});
