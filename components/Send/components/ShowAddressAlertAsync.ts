import { Alert } from 'react-native';
import { TranslateType } from '../../../app/AppState';

const ShowAddressAlertAsync = (translate: (key: string) => TranslateType): Promise<void> => {
  return new Promise((resolve, reject) => {
    Alert.alert(
      translate('send.lose-address-title') as string,
      translate('send.lose-address-alert') as string,
      [
        {
          text: translate('confirm') as string,
          onPress: () => resolve(),
        },
        {
          text: translate('cancel') as string,
          style: 'cancel',
          onPress: () => reject(),
        },
      ],
      { cancelable: false, userInterfaceStyle: 'light' },
    );
  });
};

export default ShowAddressAlertAsync;
