import { SnackbarDurationEnum } from '../enums/SnackbarDurationEnum';

export default interface SnackbarType {
  message: string;
  duration?: SnackbarDurationEnum;

  // eslint-disable-next-line semi
}
