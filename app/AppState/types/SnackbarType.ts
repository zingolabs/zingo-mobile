import { SnackbarDurationEnum } from '../enums/SnackbarDurationEnum';

export default interface SnackbarType {
  message: string;
  duration?: SnackbarDurationEnum;
  screenName?: string;

  // eslint-disable-next-line semi
}
