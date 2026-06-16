import EncryptedStorage from 'react-native-encrypted-storage';
import * as RNFS from 'react-native-fs';

import {
  ChainNameEnum,
  CurrencyEnum,
  GlobalConst,
  SecurityType,
  SecurityTypeEnum,
  SelectServerEnum,
  ServerType,
  ServerUrisType,
  SettingsFileClass,
  SettingsNameEnum,
  BlockExplorerEnum,
} from '../../app/AppState';
import { serverUris } from '../../app/uris';
import { isEqual } from 'lodash';
import { RPCPerformanceLevelEnum } from '../../app/walletBackend/enums/RPCPerformanceLevelEnum';

// Audit Issue N: settings are persisted in EncryptedStorage instead of a
// plaintext JSON file. Android → EncryptedSharedPreferences (Jetpack Security,
// AES-256-GCM, key in Android Keystore). iOS → Keychain Services.
const STORAGE_KEY = 'settings';

export default class SettingsFileImpl {
  // Kept for the one-time migration path that reads the legacy plaintext file
  // from DocumentDirectory. Not used for writes anymore.
  static async getLegacyFileName() {
    return RNFS.DocumentDirectoryPath + '/settings.json';
  }

  // Write the server setting
  static async writeSettings(
    name: SettingsNameEnum,
    value: string | boolean | ServerType | SecurityType,
  ) {
    const settings = await this.readSettings();
    const newSettings: SettingsFileClass = { ...settings, [name]: value };

    await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  }

  // Read the server setting
  static async readSettings(): Promise<SettingsFileClass> {
    const defaults = (): SettingsFileClass =>
      ({ firstInstall: true, version: null }) as SettingsFileClass;

    let raw: string | null = null;

    // Step 1: read encrypted storage. On failure, fall through to legacy
    // recovery rather than masking as fresh install.
    try {
      raw = await EncryptedStorage.getItem(STORAGE_KEY);
    } catch (err) {
      console.log('settings: encrypted read failed, will try legacy:', err);
    }

    // Step 2: one-time migration from plaintext settings.json, or recovery
    // when encrypted storage is unreadable but the legacy file is still around.
    if (raw === null) {
      const legacyPath = await this.getLegacyFileName();
      let legacyExists = false;
      try {
        legacyExists = await RNFS.exists(legacyPath);
      } catch (_) {
        // best-effort
      }

      if (legacyExists) {
        let legacyRaw: string | null = null;
        try {
          legacyRaw = await RNFS.readFile(legacyPath, GlobalConst.utf8);
        } catch (err) {
          console.log('settings: legacy read failed:', err);
          return defaults();
        }

        // Commit to encrypted storage. If this fails we still use legacyRaw
        // for this session and retry the migration on the next launch.
        let migrated = false;
        try {
          await EncryptedStorage.setItem(STORAGE_KEY, legacyRaw);
          migrated = true;
        } catch (err) {
          console.log(
            'settings: migration write failed, using legacy this session:',
            err,
          );
        }

        raw = legacyRaw;

        // Only delete the legacy file once encrypted commit succeeded.
        // If unlink itself fails it is non-fatal: subsequent boots will read
        // from encrypted storage and skip this block entirely.
        if (migrated) {
          try {
            await RNFS.unlink(legacyPath);
          } catch (err) {
            console.log('settings: legacy unlink failed (non-fatal):', err);
          }
        }
      }
    }

    if (raw === null) {
      console.log('settings read: no stored settings, fresh install');
      return defaults();
    }

    let settings: SettingsFileClass;
    try {
      settings = JSON.parse(raw) as SettingsFileClass;
    } catch (err) {
      console.log(
        'settings: JSON parse failed, treating as fresh install:',
        err,
      );
      return defaults();
    }

    try {
      // If server as string is found, I need to convert to: ServerType
      // if not, I'm losing the value
      if (!settings.hasOwnProperty(SettingsNameEnum.server)) {
        settings.server = {
          uri: serverUris(() => {})[0].uri,
          chainName: serverUris(() => {})[0].chainName,
        } as ServerType;
      } else {
        if (typeof settings.server === 'string') {
          const ss: ServerType = {
            uri: settings.server,
            chainName: ChainNameEnum.mainChainName,
          };
          const standard = serverUris(() => {}).find((s: ServerUrisType) =>
            isEqual(
              { uri: s.uri, chainName: s.chainName } as ServerType,
              ss as ServerType,
            ),
          );
          if (standard) {
            settings.server = ss as ServerType;
          } else {
            // here probably the user have a cumtom server, but we don't know
            // what is the chainName -> we assign the default server.
            settings.server = {
              uri: serverUris(() => {})[0].uri,
              chainName: serverUris(() => {})[0].chainName,
            } as ServerType;
          }
        } else {
          if (!settings.server.uri || !settings.server.chainName) {
            // if one or both field/s don't have valid value -> we assign offline mode.
            // this is the most accurate decision since we have offline mode.
            settings.server = {
              uri: '',
              chainName: ChainNameEnum.mainChainName, // for now this is correct, in some future this have to be ''.
            } as ServerType;
          }
        }
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.basicFirstViewSeed)) {
        // by default we assume the user saw the seed,
        // only if the user is basic and is creating a new wallet -> false.
        // this means when the user have funds, the seed screen will show up.
        settings.basicFirstViewSeed = true;
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.version)) {
        // here we know the user is updating the App, for sure.
        // from some version before.
        settings.version = '';
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.security)) {
        // this is the first time the App implemented
        // screen security. Default values.
        settings.security = {
          startApp: true,
          foregroundApp: true,
          sendConfirm: true,
          seedUfvkScreen: true,
          rescanScreen: true,
          settingsScreen: true,
          changeWalletScreen: true,
          restoreWalletBackupScreen: true,
        };
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.selectServer)) {
        // this is the first time the App have selection server
        // here just exists 6 options:
        // - server empty -> offline
        // - lightwalletd (obsolete) -> auto
        // - zcash-infra (default) -> auto
        // - custom server -> mainnet (new - not default)
        // - custom server -> mainnet (not in the list)
        // - custom server -> testnet or regtest
        if (!settings.server.uri) {
          settings.selectServer = SelectServerEnum.offline;
        } else if (
          serverUris(() => {})
            .filter((s: ServerUrisType) => s.obsolete)
            .find((s: ServerUrisType) =>
              isEqual(
                { uri: s.uri, chainName: s.chainName } as ServerType,
                settings.server as ServerType,
              ),
            )
        ) {
          // obsolete servers -> auto - to make easier and faster UX to the user
          settings.selectServer = SelectServerEnum.auto;
        } else if (
          serverUris(() => {})
            .filter((s: ServerUrisType) => s.default)
            .find((s: ServerUrisType) =>
              isEqual(
                { uri: s.uri, chainName: s.chainName } as ServerType,
                settings.server as ServerType,
              ),
            )
        ) {
          // default servers -> auto - to make easier and faster UX to the user
          settings.selectServer = SelectServerEnum.auto;
        } else if (
          serverUris(() => {}).find((s: ServerUrisType) =>
            isEqual(
              { uri: s.uri, chainName: s.chainName } as ServerType,
              settings.server as ServerType,
            ),
          )
        ) {
          // new servers (not default & not obsolete) -> in the list - the user changed the default server in some point
          settings.selectServer = SelectServerEnum.list;
        } else {
          // new servers -> not in the list - the user changed the default server in some point to
          // another totally unknown or the user is using a non mainnet server.
          settings.selectServer = SelectServerEnum.custom;
        }
      } else {
        // this is not the first time, but I have to change the obsolete servers to `auto`.
        // do nothing if the user select a obsolte one as a custom server, this is user's choice.
        if (
          serverUris(() => {})
            .filter((s: ServerUrisType) => s.obsolete)
            .find((s: ServerUrisType) =>
              isEqual(
                { uri: s.uri, chainName: s.chainName } as ServerType,
                settings.server as ServerType,
              ),
            ) &&
          settings.selectServer !== SelectServerEnum.custom
        ) {
          // obsolete servers -> auto - to make easier and faster UX to the user
          settings.selectServer = SelectServerEnum.auto;
        }
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.donation)) {
        // this means the App shows up an Alert asking about the tip/donation new feature.
        settings.firstUpdateWithDonation = true;
      }
      // old security options that have to be removed and to add the new one.
      if (settings.hasOwnProperty(SettingsNameEnum.security)) {
        const sec: SecurityType = settings.security;
        // old security options
        if (
          sec.hasOwnProperty(SecurityTypeEnum.seedScreen) &&
          sec.hasOwnProperty(SecurityTypeEnum.ufvkScreen) &&
          !sec.hasOwnProperty(SecurityTypeEnum.seedUfvkScreen)
        ) {
          let numTrues: number = 0;
          if (sec.seedScreen) {
            numTrues += 1;
            delete sec.seedScreen;
          }
          if (sec.ufvkScreen) {
            numTrues += 1;
            delete sec.ufvkScreen;
          }
          if (numTrues >= 1) {
            sec.seedUfvkScreen = true;
          } else {
            sec.seedUfvkScreen = false;
          }
          settings.security = sec;
        }
      }
      if (
        !settings.hasOwnProperty(SettingsNameEnum.recoveryWalletInfoOnDevice)
      ) {
        // doing backup of seed & birthday in the device -> false by default.
        settings.recoveryWalletInfoOnDevice = false;
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.performanceLevel)) {
        // by default medium
        settings.performanceLevel = RPCPerformanceLevelEnum.Medium;
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.blockExplorer)) {
        // by default medium
        settings.blockExplorer = BlockExplorerEnum.Zcashexplorer;
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.nym)) {
        settings.nym = false;
      }
      // Silent migration: legacy "USDTOR" currency is dropped in favor of "USD".
      // Tor support has been removed; users on an older settings.json get rewritten transparently.
      if ((settings.currency as string) === 'USDTOR') {
        settings.currency = CurrencyEnum.USDCurrency;
      }
      return settings;
    } catch (err) {
      // Normalization failed on malformed data (e.g. a settings.server with
      // unexpected shape). Fall back to defaults rather than propagating.
      console.log('settings: normalization failed:', err);
      return defaults();
    }
  }
}
