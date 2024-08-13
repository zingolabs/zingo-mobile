import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import SnackbarType from './AppState/types/SnackbarType';
import { GlobalConst, TranslateType } from './AppState';

export const createAlert = async (
  setBackgroundError: (title: string, error: string) => void,
  addLastSnackbar: (snackbar: SnackbarType) => void,
  title: string,
  error: string,
  toast: boolean,
  translate: (key: string) => TranslateType,
  sendEmail?: (translate: (key: string) => TranslateType, s?: string, b?: string) => void,
) => {
  const background = await AsyncStorage.getItem(GlobalConst.background);
  if (background === GlobalConst.yes) {
    setBackgroundError(title, error);
  } else {
    if (toast) {
      setTimeout(() => {
        addLastSnackbar({ message: error });
      }, 1000);
    } else {
      if (sendEmail) {
        // with email button
        Alert.alert(
          title,
          error,
          [
            {
              text: translate('support') as string,
              onPress: async () => sendEmail(translate, title, error),
            },
            { text: translate('cancel') as string, style: 'cancel' },
          ],
          { cancelable: false, userInterfaceStyle: 'light' },
        );
      } else {
        // no email button
        Alert.alert(title, error);
      }
    }
  }
};
