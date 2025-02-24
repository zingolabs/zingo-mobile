import * as Keychain from 'react-native-keychain';
import { GlobalConst, WalletType } from './AppState';

const options = (biometrics: Keychain.BIOMETRY_TYPE | null): Keychain.BaseOptions => {
  return {
    service: GlobalConst.serviceKeyChain,
    accessControl: biometrics ? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE : Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY, // for both
    authenticationType: biometrics ? Keychain.AUTHENTICATION_TYPE.BIOMETRICS : Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
    rules: Keychain.SECURITY_RULES.NONE, // for both
    // with biometrics in the device -> SECURE HARDWARE
    securityLevel: biometrics ? Keychain.SECURITY_LEVEL.SECURE_HARDWARE : Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
    // with biometrics in the device -> RSA
    storage: biometrics ? Keychain.STORAGE_TYPE.RSA : Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  } as Keychain.BaseOptions;
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
      options(await Keychain.getSupportedBiometryType()),
    );
    console.log('keys saved correctly');
    //console.log('key:', GlobalConst.keyKeyChain);
    //console.log('value:', keys);
  } catch (error) {
    console.log('Error saving keys', error);
  }
};

export const getRecoveryWalletInfo = async (): Promise<WalletType> => {
  try {
    const credentials = await Keychain.getGenericPassword(options(await Keychain.getSupportedBiometryType()));
    if (credentials) {
      console.log('keys read correctly', credentials);
      console.log('biometrics', await Keychain.getSupportedBiometryType());
      //console.log('key:', credentials.username);
      //console.log('value:', credentials.password);
      if (credentials.username === GlobalConst.keyKeyChain && credentials.service === GlobalConst.serviceKeyChain) {
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
  //const keys: WalletType = await getRecoveryWalletInfo();
  return await Keychain.hasGenericPassword(options(await Keychain.getSupportedBiometryType()));
};

export const createUpdateRecoveryWalletInfo = async (keys: WalletType): Promise<void> => {
  // have not Wallet Keys
  console.log('creating keys');
  await saveRecoveryWalletInfo(keys);
};

export const removeRecoveryWalletInfo = async (): Promise<void> => {
  if (await hasRecoveryWalletInfo()) {
    // have Wallet Keys
    const removed: boolean = await Keychain.resetGenericPassword(options(await Keychain.getSupportedBiometryType()));
    if (!removed) {
      // error removing keys
      console.log('error removing keys');
    } else {
      console.log('keys removed');
    }
  } else {
    // have not Wallet Keys
    console.log('no keys to remove');
  }
};
