import { GlobalConst, TranslateType } from './AppState';

import ReactNativeBiometrics from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';

type simpleBiometricsProps = {
  translate: (key: string) => TranslateType;
};

const simpleBiometrics = async (
  props: simpleBiometricsProps,
): Promise<boolean | undefined> => {
  const rnBiometrics = new ReactNativeBiometrics({
    allowDeviceCredentials: true,
  });

  try {
    const result = await rnBiometrics.simplePrompt({
      promptMessage: props.translate('biometrics-message') as string,
      fallbackPromptMessage: props.translate(
        'biometrics-message-ios',
      ) as string,
    });
    return result.success === true;
  } catch (e) {
    // simplePrompt throws only when the device has no auth method at all
    // (no biometric enrolled AND no passcode). With allowDeviceCredentials
    // the OS already falls back to the passcode when biometry is missing,
    // so reaching this branch means there is truly nothing to prompt with —
    // returning undefined lets the caller proceed instead of locking the
    // user out of their own wallet.
    console.log('biometrics: no auth method available', e);
    return undefined;
  } finally {
    // iOS interprets the auth prompt as the app going to background;
    // restore the foreground flag so background-state handling doesn't trip.
    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
  }
};

export default simpleBiometrics;
