import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { GlobalConst, TranslateType } from './AppState';
import { SnackbarDurationEnum } from './AppState/enums/SnackbarDurationEnum';
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
  const background = await AsyncStorage.getItem(GlobalConst.background);
  if (background === GlobalConst.yes) {
    setBackgroundError(title, error);
  } else {
    if (toast) {
      setTimeout(() => {
        addLastSnackbar(error);
      }, 1 * 1000);
    } else {
      if (sendEmail) {
        // with email button
        Alert.alert(
          title,
          error,
          [
            {
              text: translate('support') as string,
              onPress: async () =>
                sendEmail(
                  translate,
                  zingolibVersion ? zingolibVersion : '',
                  title,
                  error,
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
          message: error,
          buttons: [{ text: translate('close') as string }],
        });
      }
    }
  }
};
