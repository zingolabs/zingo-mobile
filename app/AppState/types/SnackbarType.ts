import { SnackbarDurationEnum } from '../enums/SnackbarDurationEnum';

export default interface SnackbarType {
  message: string;
  type: 'Primary';
  duration?: SnackbarDurationEnum;

  // eslint-disable-next-line semi
}
