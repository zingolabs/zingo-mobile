import * as RNFS from 'react-native-fs';

import { ServerType, SettingsFileClass } from '../../app/AppState';
import { serverUris } from '../../app/uris';
import { isEqual } from 'lodash';

export default class SettingsFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/settings.json';
  }

  // Write the server setting
  static async writeSettings(
    name:
      | 'server'
      | 'currency'
      | 'language'
      | 'sendAll'
      | 'privacy'
      | 'mode'
      | 'firstInstall'
      | 'basicFirstViewSeed'
      | 'customFee',
    value: string | boolean | ServerType,
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
      // TODO verify that JSON don't fail.
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
      return settings;
    } catch (err) {
      // The File doesn't exist, so return nothing
      // Here I know 100% it is a fresh install or the user cleaned the device staorage
      //console.log('settings read file:', err);
      const settings: SettingsFileClass = { firstInstall: true } as SettingsFileClass;
      return settings;
    }
  }
}
