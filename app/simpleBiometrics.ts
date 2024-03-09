import RNBiometrics from 'react-native-simple-biometrics';
import { TranslateType } from './AppState';

type simpleBiometricsProps = {
  translate: (key: string) => TranslateType;
};

const simpleBiometrics = async (props: simpleBiometricsProps) => {
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
};

export default simpleBiometrics;
