import RNBiometrics from 'react-native-simple-biometrics';
import { TranslateType } from './AppState';

import ReactNativeBiometrics from 'react-native-biometrics';

type simpleBiometricsProps = {
  translate: (key: string) => TranslateType;
};

const simpleBiometrics = async (props: simpleBiometricsProps) => {
  const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

  const { available, biometryType, error } = await rnBiometrics.isSensorAvailable();

  console.log(available, biometryType, error);

  if (!available) {
    return true;
  }

  try {
    await RNBiometrics.requestBioAuth(
      props.translate('biometrics-title') as string,
      props.translate('biometrics-message') as string,
    );
    // Code to execute when authenticated
    return true;
  } catch (e) {
    // Code to handle authentication failure
    console.log(e);
    return false;
  }
};

export default simpleBiometrics;
