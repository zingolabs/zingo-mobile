export default interface SnackbarType {
  message: string;
  type: 'Primary';
  duration?: 'short' | 'long' | 'longer';

  // eslint-disable-next-line semi
}
