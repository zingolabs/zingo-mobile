import { DeviceEventEmitter, Platform } from 'react-native';

import { GlobalConst, TranslateType } from './AppState';

import ReactNativeBiometrics from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';

type simpleBiometricsProps = {
  translate: (key: string) => TranslateType;
};

// Emitted with a boolean payload (true=show, false=hide) so a root-level
// overlay can cover the activity while the system BiometricPrompt is up.
// Audit Issue C: on Android the prompt does not cover the whole screen and
// sensitive content stays visible behind it. iOS already gets this from the
// SceneDelegate privacyWindow (LocalAuthentication triggers willResignActive).
export const BIOMETRIC_BLANKING_EVENT = 'biometric-blanking';

const simpleBiometrics = async (
  props: simpleBiometricsProps,
): Promise<boolean | undefined> => {
  const rnBiometrics = new ReactNativeBiometrics({
    allowDeviceCredentials: true,
  });

  if (Platform.OS === 'android') {
    DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, true);
    // Yield one frame so the overlay paints before the system prompt opens.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }

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
    if (Platform.OS === 'android') {
      DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, false);
    }
    // iOS interprets the auth prompt as the app going to background;
    // restore the foreground flag so background-state handling doesn't trip.
    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
  }
};

export default simpleBiometrics;
