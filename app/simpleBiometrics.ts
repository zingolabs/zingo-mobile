import { Platform } from 'react-native';
import RNBiometrics from 'react-native-simple-biometrics';
import { TranslateType } from './AppState';
import simplePasscode from './simplePasscode';

type simpleBiometricsProps = {
  translate: (key: string) => TranslateType;
};

const simpleBiometrics = async (props: simpleBiometricsProps) => {
  // Check if biometric authentication is available
  const can = await RNBiometrics.canAuthenticate();

  if (can) {
    try {
      await RNBiometrics.requestBioAuth(
        props.translate('biometrics-title') as string,
        props.translate('biometrics-message') as string,
      );
      // Code to execute when authenticated
      return true;
    } catch (error) {
      // Code to handle authentication failure
      return false;
    }
  }
  // if the biometric autehtication is not available for IOS
  // I'll try with the Passcode authentication
  // only for IOS
  if (Platform.OS === 'ios') {
    return await simplePasscode({ translate: props.translate });
  }
};

export default simpleBiometrics;
