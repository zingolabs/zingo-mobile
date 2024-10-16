import * as RNFS from 'react-native-fs';

import {
  ChainNameEnum,
  SecurityType,
  SecurityTypeEnum,
  SelectServerEnum,
  ServerType,
  ServerUrisType,
  SettingsFileClass,
  SettingsNameEnum,
} from '../../app/AppState';
import { serverUris } from '../../app/uris';
import { isEqual } from 'lodash';

export default class SettingsFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/settings.json';
  }

  // Write the server setting
  static async writeSettings(name: SettingsNameEnum, value: string | boolean | ServerType | SecurityType) {
    const fileName = await this.getFileName();
    const settings = await this.readSettings();
    const newSettings: SettingsFileClass = { ...settings, [name]: value };

    //console.log(' settings write', newSettings);

    RNFS.writeFile(fileName, JSON.stringify(newSettings), 'utf8')
      .then(() => {
        //console.log('FILE WRITTEN!')
      })
      .catch(() => {
        //console.log(err.message)
      });
  }

  // Read the server setting
  static async readSettings(): Promise<SettingsFileClass> {
    const fileName = await this.getFileName();

    try {
      const settings: SettingsFileClass = JSON.parse((await RNFS.readFile(fileName, 'utf8')).toString());
      // If server as string is found, I need to convert to: ServerType
      // if not, I'm losing the value
      if (!settings.hasOwnProperty(SettingsNameEnum.server)) {
        settings.server = {
          uri: serverUris(() => {})[0].uri,
          chainName: serverUris(() => {})[0].chainName,
        } as ServerType;
      } else {
        if (typeof settings.server === 'string') {
          const ss: ServerType = { uri: settings.server, chainName: ChainNameEnum.mainChainName };
          const standard = serverUris(() => {}).find((s: ServerUrisType) =>
            isEqual({ uri: s.uri, chainName: s.chainName } as ServerType, ss as ServerType),
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
            // if one or both field/s don't have valid value -> we assign the default server.
            settings.server = {
              uri: serverUris(() => {})[0].uri,
              chainName: serverUris(() => {})[0].chainName,
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
        // here just exists 5 options:
        // - lightwalletd (obsolete) -> auto
        // - zcash-infra (default) -> auto
        // - custom server -> mainnet (new - not default)
        // - custom server -> mainnet (not in the list)
        // - custom server -> testnet or regtest
        if (
          serverUris(() => {})
            .filter((s: ServerUrisType) => s.obsolete)
            .find((s: ServerUrisType) =>
              isEqual({ uri: s.uri, chainName: s.chainName } as ServerType, settings.server as ServerType),
            )
        ) {
          // obsolete servers -> auto - to make easier and faster UX to the user
          settings.selectServer = SelectServerEnum.auto;
        } else if (
          serverUris(() => {})
            .filter((s: ServerUrisType) => s.default)
            .find((s: ServerUrisType) =>
              isEqual({ uri: s.uri, chainName: s.chainName } as ServerType, settings.server as ServerType),
            )
        ) {
          // default servers -> auto - to make easier and faster UX to the user
          settings.selectServer = SelectServerEnum.auto;
        } else if (
          serverUris(() => {}).find((s: ServerUrisType) =>
            isEqual({ uri: s.uri, chainName: s.chainName } as ServerType, settings.server as ServerType),
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
              isEqual({ uri: s.uri, chainName: s.chainName } as ServerType, settings.server as ServerType),
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
      if (!settings.hasOwnProperty(SettingsNameEnum.recoveryWalletInfoOnDevice)) {
        // doing backup of seed & birthday in the device -> false by default.
        settings.recoveryWalletInfoOnDevice = false;
      }
      return settings;
    } catch (err) {
      // The File doesn't exist, so return nothing
      // Here I know 100% it is a fresh install or the user cleaned the device staorage
      console.log('settings read file:', err);
      const settings: SettingsFileClass = { firstInstall: true, version: null } as SettingsFileClass;
      return settings;
    }
  }
}
