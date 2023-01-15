import * as RNFS from 'react-native-fs';

import { backgroundType } from '../../app/AppState';

export default class BackgroundFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/background.json';
  }

  // Write the server setting
  static async reset() {
    const fileName = await this.getFileName();
    const newBackground: backgroundType = { batches: 0, date: 0 };

    RNFS.writeFile(fileName, JSON.stringify(newBackground), 'utf8')
      .then(() => {
        //console.log('FILE WRITTEN!')
      })
      .catch(() => {
        //console.log(err.message)
      });
  }

  // Read the server setting
  static async readSettings(): Promise<backgroundType> {
    const fileName = await this.getFileName();

    try {
      return JSON.parse((await RNFS.readFile(fileName, 'utf8')).toString()) as backgroundType;
    } catch (err) {
      // File probably doesn't exist, so return nothing
      //console.log(err);
      return { batches: 0, date: 0 } as backgroundType;
    }
  }
}
