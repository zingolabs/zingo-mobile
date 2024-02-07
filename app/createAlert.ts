import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import SnackbarType from './AppState/types/SnackbarType';

export const createAlert = async (
  setBackgroundError: (title: string, error: string) => void,
  addLastSnackbar: (snackbar: SnackbarType) => void,
  title: string,
  error: string,
  toast?: boolean,
) => {
  const background = await AsyncStorage.getItem('@background');
  if (background === 'yes') {
    setBackgroundError(title, error);
  } else {
    if (toast) {
      setTimeout(() => {
        addLastSnackbar({ message: error, type: 'Primary' });
      }, 1000);
    } else {
      Alert.alert(title, error);
    }
  }
};
