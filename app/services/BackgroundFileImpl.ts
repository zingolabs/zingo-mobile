import * as RNFS from 'react-native-fs';

import { BackgroundType, GlobalConst } from '@app/AppState';

export default class BackgroundFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/background.json';
  }

  // [{"batches": "622", "date": "1673817518.324613" }]

  // Read the server background
  static async readBackground(): Promise<BackgroundType> {
    try {
      const fileName = await this.getFileName();
      const fileExits: boolean = await RNFS.exists(fileName);
      if (!fileExits) {
        console.log('background read file: The file does not exists');
        return {
          batches: 0,
          message: '',
          date: 0,
          dateEnd: 0,
        } as BackgroundType;
      }

      const rStr = (await RNFS.readFile(fileName, GlobalConst.utf8)).toString();
      const r = JSON.parse(rStr) as BackgroundType;
      return r;
    } catch (err) {
      // File probably doesn't exist, so return nothing
      return { batches: 0, message: '', date: 0, dateEnd: 0 } as BackgroundType;
    }
  }
}
