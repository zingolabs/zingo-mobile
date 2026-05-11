import * as RNFS from 'react-native-fs';

import { BackgroundType, GlobalConst } from '../../app/AppState';

export default class BackgroundFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/background.json';
  }

  // Write the server setting
  static async writeBackground(data: BackgroundType) {
    const fileName = await this.getFileName();
    const newBackground: BackgroundType = data;

    //console.log(' background write', newBackground);

    await RNFS.writeFile(
      fileName,
      JSON.stringify(newBackground),
      GlobalConst.utf8,
    );
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
      //console.log('background string', rStr);
      const r = JSON.parse(rStr) as BackgroundType;
      //console.log('background json', r);
      return r;
    } catch (err) {
      // File probably doesn't exist, so return nothing
      //console.log('background json Error', err);
      return { batches: 0, message: '', date: 0, dateEnd: 0 } as BackgroundType;
    }
  }
}
