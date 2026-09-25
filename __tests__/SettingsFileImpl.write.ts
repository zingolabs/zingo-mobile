/**
 * Settings writes are read-modify-writes of a single file. Two of them in
 * flight at once used to rebuild that file from the contents each had read
 * before either landed, so the one that finished last silently dropped the
 * other one's key — the first-launch path writes a setting and
 * `firstInstall` back to back, and the setting was the one lost.
 */

let mockFile: string | null = null;

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/settings-test',
  exists: jest.fn(async () => mockFile !== null),
  readFile: jest.fn(async () => mockFile as string),
  writeFile: jest.fn(async (_path: string, contents: string) => {
    // A real write does not land in the same tick the caller started it.
    await new Promise(resolve => setTimeout(resolve, 10));
    mockFile = contents;
  }),
}));

// SettingsFileImpl reaches @app/uris for the default server list, and that
// module pulls the native RPC bridge in behind it. The list itself is not
// what is under test here.
jest.mock('@app/uris', () => ({
  serverUris: () => [
    { uri: 'https://mainnet.example:9067', chainName: 'main' },
  ],
}));

import SettingsFileImpl from '@app/services/SettingsFileImpl';
import { LanguageEnum, SettingsNameEnum } from '@app/AppState';

describe('SettingsFileImpl.writeSettings', () => {
  beforeEach(() => {
    mockFile = null;
  });

  it('keeps both keys when two writes overlap', async () => {
    const language = SettingsFileImpl.writeSettings(
      SettingsNameEnum.language,
      LanguageEnum.es,
    );
    const firstInstall = SettingsFileImpl.writeSettings(
      SettingsNameEnum.firstInstall,
      false,
    );

    await Promise.all([language, firstInstall]);

    const settings = await SettingsFileImpl.readSettings();
    expect(settings.language).toBe(LanguageEnum.es);
    expect(settings.firstInstall).toBe(false);
  });

  it('resolves only once the write has landed', async () => {
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.language,
      LanguageEnum.pt,
    );

    expect(JSON.parse(mockFile as string).language).toBe(LanguageEnum.pt);
  });
});
