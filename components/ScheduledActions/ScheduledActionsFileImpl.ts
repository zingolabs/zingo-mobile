import * as RNFS from 'react-native-fs';

import { GlobalConst, ScheduledActionType } from '../../app/AppState';

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

  static async listActions(): Promise<ScheduledActionType[]> {
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

  static async addAction(
    action: ScheduledActionType,
  ): Promise<ScheduledActionType[]> {
    try {
      const actions: ScheduledActionType[] = await this.listActions();

      const maxId =
        actions.length > 0 ? Math.max(...actions.map(a => a.id)) : 0;
      let newItem: ScheduledActionType = action;
      newItem.id = maxId + 1;
      actions.push(newItem);

      this.writeSA(actions);
      return actions;
    } catch (err) {
      console.log(err);
      return [] as ScheduledActionType[];
    }
  }

  static async removeAction(id: number): Promise<ScheduledActionType[]> {
    try {
      const actions: ScheduledActionType[] = await this.listActions();
      const newActions: ScheduledActionType[] = actions.filter(
        i => i.id !== id,
      );

      this.writeSA(newActions);
      return newActions;
    } catch (err) {
      console.log(err);
      return [] as ScheduledActionType[];
    }
  }
}
