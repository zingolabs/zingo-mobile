import { BackgroundType } from '@app/AppState';
import { readAppFile } from '@app/services/appFiles';

const EMPTY_BACKGROUND: BackgroundType = {
  batches: 0,
  message: '',
  date: 0,
  dateEnd: 0,
};

export default class BackgroundFileImpl {
  // [{"batches": "622", "date": "1673817518.324613" }]

  // Read the server background
  static async readBackground(): Promise<BackgroundType> {
    try {
      const file = await readAppFile('background.json');
      if (file.kind === 'missing') {
        console.log('background read file: The file does not exists');
        return { ...EMPTY_BACKGROUND };
      }
      return JSON.parse(file.text) as BackgroundType;
    } catch {
      // File probably doesn't exist, so return nothing
      return { ...EMPTY_BACKGROUND };
    }
  }
}
