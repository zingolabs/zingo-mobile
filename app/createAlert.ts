import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import Toast from 'react-native-simple-toast';

export const createAlert = async (
  setBackgroundError: (title: string, error: string) => void,
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
        Toast.show(error, Toast.LONG);
      }, 1000);
    } else {
      Alert.alert(title, error);
    }
  }
};
