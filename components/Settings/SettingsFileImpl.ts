import * as RNFS from 'react-native-fs';

import { SecurityType, ServerType, SettingsFileClass } from '../../app/AppState';
import { serverUris } from '../../app/uris';
import { isEqual } from 'lodash';

export default class SettingsFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/settings.json';
  }

  // Write the server setting
  static async writeSettings(
    name:
      |
      | 'server'
     
      | 'currency'
     
      | 'language'
     
      | 'sendAll'
     
      | 'privacy'
     
      | 'mode'
     
      | 'firstInstall'
     
      | 'basicFirstViewSeed'
      | 'version'
      | 'security'
      | 'debugMode'
      | 'firstDebugMode',
    value: string | boolean | ServerType | SecurityType,
  ) {
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
      if (settings.server) {
        if (typeof settings.server === 'string') {
          const ss: ServerType = { uri: settings.server, chain_name: 'main' };
          const standard = serverUris().find((s: ServerType) => isEqual(s, ss));
          if (standard) {
            settings.server = ss;
          } else {
            // here probably the user have a cumtom server, but we don't know
            // what is the chain_name -> we assign the default server.
            settings.server = serverUris()[0];
          }
        } else {
          if (!settings.server.uri || !settings.server.chain_name) {
            // if one or both field/s don't have valid value -> we assign the default server.
            settings.server = serverUris()[0];
          }
        }
      }
      if (!settings.hasOwnProperty('basicFirstViewSeed')) {
        // by default we assume the user saw the seed,
        // only if the user is basic and is creating a new wallet -> false.
        // this means when the user have funds, the seed screen will show up.
        settings.basicFirstViewSeed = true;
      }
      if (!settings.hasOwnProperty('version')) {
        // here we know the user is updating the App, for sure.
        // from some version before.
        settings.version = '';
      }
      if (!settings.hasOwnProperty('security')) {
        // this is the first time the App implemented
        // screen security. Default values.
        settings.security = {
          startApp: true,
          foregroundApp: true,
          sendConfirm: true,
          seedScreen: true,
          ufvkScreen: true,
          rescanScreen: true,
          settingsScreen: true,
          changeWalletScreen: true,
          restoreWalletBackupScreen: true,
        };
      }
      if (!settings.hasOwnProperty('debugMode')) {
        // if this property doesn't exists, the App need to know
        // about the user choice of debug mode.
        settings.firstDebugMode = true;
      }
      return settings;
    } catch (err) {
      // The File doesn't exist, so return a flag saying if this is a first install.
      // Here I know 100% it is a fresh install or the user cleaned the device storage
      console.log('settings read file:', err);
      const settings: SettingsFileClass = { firstInstall: true, version: null } as SettingsFileClass;
      return settings;
    }
  }
}
