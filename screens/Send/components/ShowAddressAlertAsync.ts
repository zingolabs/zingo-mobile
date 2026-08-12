import { TranslateType } from '../../../app/AppState';
import { showConfirm } from '../../../app/services/showConfirm';

const ShowAddressAlertAsync = (
  translate: (key: string) => TranslateType,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    showConfirm({
      title: translate('send.lose-address-title') as string,
      message: translate('send.lose-address-alert') as string,
      buttons: [
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
    });
  });
};

export default ShowAddressAlertAsync;
