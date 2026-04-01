import * as RNFS from 'react-native-fs';

import {
  GlobalConst,
  SecurityType,
  ServerType,
  SettingsFileClass,
  SettingsNameEnum,
} from '../../app/AppState';

export default class SettingsFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/settings.json';
  }

  // Write the server setting
  static async writeSettings(
    name: SettingsNameEnum,
    value: string | boolean | ServerType | SecurityType,
  ) {
    const fileName = await this.getFileName();
    const settings = await this.readSettings();
    const newSettings: SettingsFileClass = { ...settings, [name]: value };

    //console.log(' settings write', newSettings);

    RNFS.writeFile(fileName, JSON.stringify(newSettings), GlobalConst.utf8)
      .then(() => {
        //console.log('FILE WRITTEN!')
      })
      .catch(err => {
        console.log('settings write file:', err.message);
      });
  }

  // Read the server setting
  static async readSettings(): Promise<SettingsFileClass> {
    try {
      const fileName = await this.getFileName();
      const fileExits: boolean = await RNFS.exists(fileName);
      if (!fileExits) {
        console.log('settings read file: The file does not exists');
        const settings: SettingsFileClass = {
          firstInstall: true,
          version: null,
        } as SettingsFileClass;
        return settings;
      }

      const settings: SettingsFileClass = await JSON.parse(
        (await RNFS.readFile(fileName, GlobalConst.utf8)).toString(),
      );

      return settings;
    } catch (err) {
      // The File doesn't exist, so return nothing
      // Here I know 100% it is a fresh install or the user cleaned the device staorage
      console.log('settings read file:', err);
      const settings: SettingsFileClass = {
        firstInstall: true,
        version: null,
      } as SettingsFileClass;
      return settings;
    }
  }
}
