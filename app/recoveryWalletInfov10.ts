// this code was for react-native-keychain v10
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';
import { GlobalConst, WalletType } from './AppState';

const service = GlobalConst.serviceKeyChain;

const buildSetOptions = async (): Promise<Keychain.SetOptions> => {
  const biometrics = await Keychain.getSupportedBiometryType();

  const iosPart =
    Platform.OS === 'ios'
      ? {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          accessControl: biometrics
            ? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
            : Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        }
      : {};

  // On Android, AES_GCM requires biometric auth specifically (not PIN/password).
  // When no biometrics are enrolled, use AES_GCM_NO_AUTH so the entry is still
  // encrypted in the Keystore but doesn't gate access behind a biometric prompt.
  const androidPart =
    Platform.OS === 'android'
      ? {
          securityLevel: biometrics
            ? Keychain.SECURITY_LEVEL.SECURE_HARDWARE
            : Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
          storage: biometrics
            ? Keychain.STORAGE_TYPE.RSA
            : Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
        }
      : {};

  return { service, ...iosPart, ...androidPart };
};

const buildGetOptions = async (): Promise<Keychain.GetOptions> => {
  const biometrics = await Keychain.getSupportedBiometryType();

  const iosPart =
    Platform.OS === 'ios'
      ? {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          accessControl: biometrics
            ? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
            : Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        }
      : {};

  return {
    service,
    ...iosPart,
    authenticationPrompt: { title: 'Authentication', cancel: 'Cancel' },
  };
};

const buildBaseOptions = async (): Promise<Keychain.BaseOptions> => {
  const biometrics = await Keychain.getSupportedBiometryType();

  const iosPart =
    Platform.OS === 'ios'
      ? {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          accessControl: biometrics
            ? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
            : Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        }
      : {};

  const androidPart =
    Platform.OS === 'android'
      ? {
          securityLevel: biometrics
            ? Keychain.SECURITY_LEVEL.SECURE_HARDWARE
            : Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
          storage: biometrics
            ? Keychain.STORAGE_TYPE.RSA
            : Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
        }
      : {};

  return { service, ...iosPart, ...androidPart };
};

export const saveRecoveryWalletInfo = async (
  keys: WalletType,
): Promise<void> => {
  if (!keys.seed && !keys.ufvk) {
    console.log('no seed or ufvk to store');
    return;
  }
  const password = JSON.stringify(keys);
  const setOptions = await buildSetOptions();
  try {
    await Keychain.setGenericPassword(
      GlobalConst.keyKeyChain,
      password,
      setOptions,
    );
  } catch (error) {
    // Save failed — typically because an existing entry uses an incompatible
    // cipher (e.g. RSA saved when biometrics were enrolled, now they're not).
    // Deleting a Keystore entry never requires auth, so reset and retry.
    console.log('Error saving keys, resetting and retrying:', error);
    try {
      await Keychain.resetGenericPassword({ service });
      await Keychain.setGenericPassword(
        GlobalConst.keyKeyChain,
        password,
        setOptions,
      );
    } catch (retryError) {
      console.log('Error saving keys after reset:', retryError);
    }
  }
};

export const getRecoveryWalletInfo = async (): Promise<WalletType> => {
  try {
    const credentials = await Keychain.getGenericPassword(
      await buildGetOptions(),
    );
    if (credentials) {
      if (
        credentials.username === GlobalConst.keyKeyChain &&
        credentials.service === service
      ) {
        return JSON.parse(credentials.password) as WalletType;
      } else {
        console.log('no match the key');
      }
    } else {
      console.log('Error no keys stored');
    }
  } catch (error) {
    // If the stored entry uses an incompatible cipher we cannot decrypt it.
    // Remove it so future saves start with a clean key instead of hitting
    // the same incompatibility again.
    console.log('Error getting keys, removing incompatible entry:', error);
    try {
      await Keychain.resetGenericPassword({ service });
    } catch (_) {
      // best-effort cleanup
    }
  }
  return {} as WalletType;
};

export const hasRecoveryWalletInfo = async (): Promise<boolean> => {
  return await Keychain.hasGenericPassword(await buildBaseOptions());
};

export const createUpdateRecoveryWalletInfo = async (
  keys: WalletType,
): Promise<void> => {
  await saveRecoveryWalletInfo(keys);
};

export const removeRecoveryWalletInfo = async (): Promise<void> => {
  if (await hasRecoveryWalletInfo()) {
    const removed = await Keychain.resetGenericPassword(
      await buildBaseOptions(),
    );
    if (!removed) {
      console.log('error removing keys');
    } else {
      console.log('keys removed');
    }
  } else {
    console.log('no keys to remove');
  }
};
