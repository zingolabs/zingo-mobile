import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import SnackbarType from './AppState/types/SnackbarType';
import { GlobalConst } from './AppState';

export const createAlert = async (
  setBackgroundError: (title: string, error: string) => void,
  addLastSnackbar: (snackbar: SnackbarType) => void,
  title: string,
  error: string,
  toast?: boolean,
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
      Alert.alert(title, error);
    }
  }
};
