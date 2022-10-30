import * as RNFS from 'react-native-fs';

import { SettingsFileEntry } from '../app/AppState';

export default class SettingsFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/settings.json';
  }

  // Write the server setting
  static async writeSettings(ss: SettingsFileEntry[]) {
    const fileName = await this.getFileName();

    RNFS.writeFile(fileName, JSON.stringify(ss), 'utf8')
      .then(() => {
        // console.log('FILE WRITTEN!')
      })
      .catch(() => {
        // console.log(err.message)
      });
  }

  // Read the address book
  static async readSettings(): Promise<SettingsFileEntry> {
    const fileName = await this.getFileName();

    try {
      return JSON.parse((await RNFS.readFile(fileName, 'utf8')).toString());
    } catch (err) {
      // File probably doesn't exist, so return nothing
      // console.log(err);
      return {};
    }
  }
}
