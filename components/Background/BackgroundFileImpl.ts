import * as RNFS from 'react-native-fs';

import { BackgroundType } from '../../app/AppState';

export default class BackgroundFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/background.json';
  }

  // Write the server background
  static async reset() {
    const fileName = await this.getFileName();
    const newBackground: BackgroundType = { batches: 0, message: '', date: 0 };

    RNFS.writeFile(fileName, JSON.stringify(newBackground), 'utf8')
      .then(() => {
        //console.log('FILE WRITTEN!')
      })
      .catch(() => {
        //console.log(err.message)
      });
  }

  // [{"batches": "622", "date": "1673817518.324613" }]

  // Read the server background
  static async readBackground(): Promise<BackgroundType> {
    const fileName = await this.getFileName();

    try {
      const r = JSON.parse((await RNFS.readFile(fileName, 'utf8')).toString()) as BackgroundType;
      console.log('background json', r);
      return r;
    } catch (err) {
      // File probably doesn't exist, so return nothing
      console.log('background json Error', err);
      return { batches: 0, date: 0 } as BackgroundType;
    }
  }
}
