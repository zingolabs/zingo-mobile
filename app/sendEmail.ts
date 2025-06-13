import { Alert, Linking } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { GlobalConst, TranslateType } from './AppState';

export const sendEmail = async (
  translate: (key: string) => TranslateType,
  zingolibVersion: string,
  subject?: string,
  body?: string,
) => {
  const email: string = translate('email') as string;
  const subjectEmail: string = subject || (translate('subject') as string);
  const bodyEmail: string = body || (translate('body') as string);
  const zingoVersionEmail: string = translate('version') as string;
  const zingolibVersionEmail: string = zingolibVersion;
  const systemName = DeviceInfo.getSystemName();
  const systemVersion = DeviceInfo.getSystemVersion();
  const manufacturer = await DeviceInfo.getManufacturer();
  const model = DeviceInfo.getModel();

  const url = `mailto:${email}?subject=${encodeURIComponent(subjectEmail)}&body=${encodeURIComponent(
    manufacturer +
      ' / ' +
      model +
      ' / ' +
      systemName +
      ' / ' +
      systemVersion +
      '\n' +
      zingoVersionEmail +
      '\n' +
      (zingolibVersionEmail ? GlobalConst.zingolib + ': ' + zingolibVersionEmail : '') +
      '\n\n' +
      bodyEmail,
  )}`;

  Linking.openURL(url)
    .then(() => {
      console.log('Email client opened', url);
    })
    .catch((err: unknown) => {
      console.log('Error opening email client:', err instanceof Error ? err.message : String(err));
      Alert.alert(
        translate('loadedapp.email-error-title') as string,
        translate('loadedapp.email-error-body') as string,
      );
    });
};
