import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { GlobalConst, TranslateType, SnackbarType, ScreenEnum } from './AppState';

export const createAlert = async (
  setBackgroundError: (title: string, error: string) => void,
  addLastSnackbar: (snackbar: SnackbarType) => void,
  screenName: ScreenEnum,
  title: string,
  error: string,
  toast: boolean,
  translate: (key: string) => TranslateType,
  sendEmail?: (translate: (key: string) => TranslateType, z: string, s?: string, b?: string) => void,
  zingolibVersion?: string,
) => {
  const background = await AsyncStorage.getItem(GlobalConst.background);
  if (background === GlobalConst.yes) {
    setBackgroundError(title, error);
  } else {
    if (toast) {
      setTimeout(() => {
        addLastSnackbar({ message: error, screenName: screenName });
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
              onPress: async () => sendEmail(translate, zingolibVersion ? zingolibVersion : '', title, error),
            },
            { text: translate('cancel') as string, style: 'cancel' },
          ],
          { cancelable: false },
        );
      } else {
        // no email button
        Alert.alert(title, error);
      }
    }
  }
};
