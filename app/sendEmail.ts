import { Alert, Linking } from 'react-native';
import { TranslateType } from './AppState';

export const sendEmail = (translate: (key: string) => TranslateType, subject?: string, body?: string) => {
  const email: string = translate('email') as string;
  const subjectEmail: string = subject || (translate('subject') as string);
  const bodyEmail: string = body || (translate('body') as string);

  const url = `mailto:${email}?subject=${encodeURIComponent(subjectEmail)}&body=${encodeURIComponent(bodyEmail)}`;

  Linking.openURL(url)
    .then(() => {
      console.log('Email client opened', url);
    })
    .catch((err: any) => {
      console.error('Error opening email client:', err);
      Alert.alert(translate('loadedapp.email-error') as string, JSON.stringify(err));
    });
};
