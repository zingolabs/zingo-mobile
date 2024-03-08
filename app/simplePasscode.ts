import PasscodeAuth from 'react-native-passcode-auth';
import { TranslateType } from './AppState';

type simplePasscodeProps = {
  translate: (key: string) => TranslateType;
};

const simplePasscode = async (props: simplePasscodeProps) => {
  // Check if passcode authentication is available
  const can = await PasscodeAuth.isSupported();

  if (can) {
    try {
      await PasscodeAuth.authenticate(props.translate('biometrics-message') as string);
      // Code to execute when authenticated
      return true;
    } catch (error) {
      // Code to handle authentication failure
      return false;
    }
  }
};

export default simplePasscode;
