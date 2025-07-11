import { GlobalConst, TranslateType } from './AppState';

import ReactNativeBiometrics from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';

type simpleBiometricsProps = {
  translate: (key: string) => TranslateType;
};

const simpleBiometrics = async (props: simpleBiometricsProps) => {
  const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

  const { available, biometryType, error } = await rnBiometrics.isSensorAvailable();

  console.log(available, biometryType, error);

  if (!available) {
    // in iOS when the Authentication screen shows up
    // the App interpret that it is in background...
    // here we need to restore the correct value
    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
    console.log('******* NOT available bio auth -> background NO');
    return true;
  }

  try {
    const result = await rnBiometrics.simplePrompt({
      promptMessage: props.translate('biometrics-message') as string,
      fallbackPromptMessage: props.translate('biometrics-message-ios') as string,
    });
    if (result.success) {
      console.log('Biometric auth success');
      return true;
    } else {
      console.log('Biometric auth cancelled or failed');
      return false;
    }
  } catch (e) {
    // Code to handle authentication failure
    console.log(e);
    return false;
  } finally {
    // in iOS when the Authentication screen shows up
    // the App interpret that it is in background...
    // here we need to restore the correct value
    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
    console.log('******* FINALLY bio auth -> background NO');
  }
};

export default simpleBiometrics;
