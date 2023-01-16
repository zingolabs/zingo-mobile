import * as RNFS from 'react-native-fs';

import { backgroundType } from '../../app/AppState';

export default class BackgroundFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/background.json';
  }

  // Write the server background
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

  // [{"batches": "622", "date": "1673817518.324613" }]

  // Read the server background
  static async readBackground(): Promise<backgroundType> {
    const fileName = await this.getFileName();

    try {
      //const b = await RNFS.readFile(fileName, 'utf8');
      //console.log('background file', b);
      //console.log('background parse', JSON.parse((await RNFS.readFile(fileName, 'utf8')).toString()) as backgroundType);
      return JSON.parse((await RNFS.readFile(fileName, 'utf8')).toString()) as backgroundType;
    } catch (err) {
      // File probably doesn't exist, so return nothing
      //console.log(err);
      return { batches: 0, date: 0 } as backgroundType;
    }
  }
}
