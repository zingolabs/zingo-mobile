import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { GlobalConst, TranslateType } from './AppState';
import { SnackbarDurationEnum } from './AppState/enums/SnackbarDurationEnum';
import { sanitizePaths } from './utils/sanitizePaths';
import { showConfirm } from './showConfirm';

export const createAlert = async (
  setBackgroundError: (title: string, error: string) => void,
  addLastSnackbar: (message: string, duration?: SnackbarDurationEnum) => void,
  title: string,
  error: string,
  toast: boolean,
  translate: (key: string) => TranslateType,
  sendEmail?: (
    translate: (key: string) => TranslateType,
    z: string,
    s?: string,
    b?: string,
  ) => void,
  zingolibVersion?: string,
) => {
  // Sanitize the error string up-front so every downstream branch (snackbar,
  // alert, confirm dialog, email body) gets the anonymized version. Errors
  // bubbling up from rust or the native layer can include absolute paths
  // baked into stack traces; we strip the username segment so support
  // reports don't leak it.
  const sanitizedError = sanitizePaths(error);
  const background = await AsyncStorage.getItem(GlobalConst.background);
  if (background === GlobalConst.yes) {
    setBackgroundError(title, sanitizedError);
  } else {
    if (toast) {
      setTimeout(() => {
        addLastSnackbar(sanitizedError);
      }, 1 * 1000);
    } else {
      if (sendEmail) {
        // with email button
        Alert.alert(
          title,
          sanitizedError,
          [
            {
              text: translate('support') as string,
              onPress: async () =>
                sendEmail(
                  translate,
                  zingolibVersion ? zingolibVersion : '',
                  title,
                  sanitizedError,
                ),
            },
            { text: translate('cancel') as string, style: 'cancel' },
          ],
          { cancelable: false },
        );
      } else {
        // no email button — use the BottomSheet-based confirm dialog
        showConfirm({
          title,
          message: sanitizedError,
          buttons: [{ text: translate('close') as string }],
        });
      }
    }
  }
};
