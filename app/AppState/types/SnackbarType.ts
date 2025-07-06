import { ScreenEnum } from '../enums/ScreenEnum';
import { SnackbarDurationEnum } from '../enums/SnackbarDurationEnum';

export default interface SnackbarType {
  message: string;
  screenName: ScreenEnum[];
  duration?: SnackbarDurationEnum;

  // eslint-disable-next-line semi
}
