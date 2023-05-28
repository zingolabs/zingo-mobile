import * as RNFS from 'react-native-fs';

import { SettingsFileClass } from '../../app/AppState';

export default class SettingsFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/settings.json';
  }

  // Write the server setting
  static async writeSettings(
    name: 'server' | 'currency' | 'language' | 'sendAll' | 'privacy',
    value: string | boolean,
  ) {
    const fileName = await this.getFileName();
    const settings = await this.readSettings();
    const newSettings: SettingsFileClass = { ...settings, [name]: value };

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
      //const b = await RNFS.readFile(fileName, 'utf8');
      //console.log('settings file', b);
      // TODO verify that JSON don't fail.
      return JSON.parse((await RNFS.readFile(fileName, 'utf8')).toString()) as SettingsFileClass;
    } catch (err) {
      // File probably doesn't exist, so return nothing
      //console.log(err);
      return {} as SettingsFileClass;
    }
  }
}
