/**
 * The reminder the App owes a wallet it created: show the seed again the
 * first time funds arrive. The flag lives in settings.json, one file for
 * every wallet, so what matters is who ends up armed.
 *
 * @format
 */

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/tmp',
  exists: jest.fn(async () => true),
  readFile: jest.fn(async () => '{}'),
  writeFile: jest.fn(async () => {}),
}));

// the App graph SettingsFileImpl pulls in reaches the native modules
import 'react-native';
import * as RNFS from 'react-native-fs';

import SettingsFileImpl from '@app/services/SettingsFileImpl';
import { SettingsNameEnum } from '@app/AppState';

const mockedRNFS = RNFS as jest.Mocked<typeof RNFS>;

const settingsFile = (settings: object) => {
  mockedRNFS.readFile.mockResolvedValue(JSON.stringify(settings));
};

describe('the seed reminder flag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRNFS.exists.mockResolvedValue(true as never);
  });

  test('a wallet that predates the reminder is not armed by the update', async () => {
    // an older settings.json: no flag of ours in it
    settingsFile({ version: '2.0.24', firstInstall: false });

    const settings = await SettingsFileImpl.readSettings();

    expect(settings.seedReminderPending).toBe(false);
  });

  test('the flag the old basic mode wrote does not arm anything', async () => {
    // `basicFirstViewSeed` was spelled the other way round — false meant the
    // seed was still owed — so carrying it over would arm the wrong wallets.
    settingsFile({ version: '2.0.24', basicFirstViewSeed: false });

    const settings = await SettingsFileImpl.readSettings();

    expect(settings.seedReminderPending).toBe(false);
    expect(settings).not.toHaveProperty('basicFirstViewSeed');
  });

  test('an armed wallet stays armed until something spends it', async () => {
    settingsFile({ version: '2.0.24', seedReminderPending: true });

    const settings = await SettingsFileImpl.readSettings();

    expect(settings.seedReminderPending).toBe(true);
  });

  test('a fresh install starts unarmed: creating the wallet is what arms it', async () => {
    mockedRNFS.exists.mockResolvedValue(false as never);

    const settings = await SettingsFileImpl.readSettings();

    expect(settings.seedReminderPending).toBeFalsy();
  });

  test('spending the flag writes it back as false', async () => {
    settingsFile({ version: '2.0.24', seedReminderPending: true });

    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.seedReminderPending,
      false,
    );

    expect(mockedRNFS.writeFile).toHaveBeenCalledTimes(1);
    const written = JSON.parse(
      (mockedRNFS.writeFile.mock.calls[0] as unknown as string[])[1],
    );
    expect(written.seedReminderPending).toBe(false);
  });
});
