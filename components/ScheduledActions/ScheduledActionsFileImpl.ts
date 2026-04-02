import * as RNFS from 'react-native-fs';

import { ScheduledActionType, GlobalConst } from '../../app/AppState';

export default class ScheduledActionsFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/scheduledActions.json';
  }

  static async writeSA(newFile: ScheduledActionType[]) {
    const fileName = await this.getFileName();

    RNFS.writeFile(fileName, JSON.stringify(newFile), GlobalConst.utf8)
      .then(() => {
        //console.log('FILE WRITTEN!');
      })
      .catch(err => {
        console.log('Scheduled Actions write file:', err.message);
      });
  }

  static async resetSA() {
    const empty: ScheduledActionType[] = [];

    this.writeSA(empty);
  }

  static async listSA(): Promise<ScheduledActionType[]> {
    try {
      const fileName = await this.getFileName();
      const fileExits: boolean = await RNFS.exists(fileName);
      if (!fileExits) {
        console.log('Scheduled Actions  read file: The file does not exists');
        return [] as ScheduledActionType[];
      }

      const rStr = (await RNFS.readFile(fileName, GlobalConst.utf8)).toString();
      const r = JSON.parse(rStr) as ScheduledActionType[];
      return r;
    } catch (err) {
      // File probably doesn't exist, so return nothing
      console.log(err);
      return [] as ScheduledActionType[];
    }
  }

  static async addSA(
    item: ScheduledActionType,
  ): Promise<ScheduledActionType[]> {
    try {
      const list: ScheduledActionType[] = await this.listSA();
      const maxId = list.length > 0 ? Math.max(...list.map(a => a.id)) : 0;
      let newItem: ScheduledActionType = item;
      newItem.id = maxId + 1;
      list.push(newItem);
      this.writeSA(list);
      return list;
    } catch (err) {
      console.log(err);
      return [] as ScheduledActionType[];
    }
  }

  static async removeSA(id: number): Promise<ScheduledActionType[]> {
    try {
      const list: ScheduledActionType[] = await this.listSA();
      const newList: ScheduledActionType[] = list.filter(i => i.id !== id);
      this.writeSA(newList);
      return newList;
    } catch (err) {
      console.log(err);
      return [] as ScheduledActionType[];
    }
  }
}
