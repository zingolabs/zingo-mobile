// this code was for react-native-keychain v10
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';
import { GlobalConst, WalletType } from './AppState';

const service = GlobalConst.serviceKeyChain;

const buildSetOptions = async (): Promise<Keychain.SetOptions> => {
  const biometrics = await Keychain.getSupportedBiometryType();

  const iosPart = Platform.OS === 'ios'
    ? {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        accessControl: biometrics
          ? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
          : Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
      }
    : {};

  const androidPart = Platform.OS === 'android'
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

  const iosPart = Platform.OS === 'ios'
    ? {
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
  return {
    service,
  };
};

export const saveRecoveryWalletInfo = async (keys: WalletType): Promise<void> => {
  if (!keys.seed && !keys.ufvk) {
    console.log('no seed or ufvk to store');
    return;
  }
  try {
    await Keychain.setGenericPassword(
      GlobalConst.keyKeyChain,
      JSON.stringify(keys),
      await buildSetOptions()
    );
  } catch (error) {
    console.log('Error saving keys', error);
  }
};

export const getRecoveryWalletInfo = async (): Promise<WalletType> => {
  try {
    const credentials = await Keychain.getGenericPassword(await buildGetOptions());
    if (credentials) {
      if (credentials.username === GlobalConst.keyKeyChain && credentials.service === service) {
        return JSON.parse(credentials.password) as WalletType;
      } else {
        console.log('no match the key');
      }
    } else {
      console.log('Error no keys stored');
    }
  } catch (error) {
    console.log('Error getting keys:', error);
  }
  return {} as WalletType;
};

export const hasRecoveryWalletInfo = async (): Promise<boolean> => {
  return await Keychain.hasGenericPassword(await buildBaseOptions());
};

export const createUpdateRecoveryWalletInfo = async (keys: WalletType): Promise<void> => {
  await saveRecoveryWalletInfo(keys);
};

export const removeRecoveryWalletInfo = async (): Promise<void> => {
  if (await hasRecoveryWalletInfo()) {
    const removed = await Keychain.resetGenericPassword(await buildBaseOptions());
    if (!removed) {
      console.log('error removing keys');
    } else {
      console.log('keys removed');
    }
  } else {
    console.log('no keys to remove');
  }
};
