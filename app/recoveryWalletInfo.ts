import * as Keychain from 'react-native-keychain';
import { GlobalConst, WalletType } from './AppState';
import { isEqual } from 'lodash';

const options = (biometrics: Keychain.BIOMETRY_TYPE | null): Keychain.Options => {
  return {
    service: GlobalConst.serviceKeyChain,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE, // for both
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY, // for both
    authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS, // for both
    rules: Keychain.SECURITY_RULES.NONE, // for both
    // with biometrics in the device -> SECURE HARDWARE
    securityLevel: biometrics ? Keychain.SECURITY_LEVEL.SECURE_HARDWARE : Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
    // with biometrics in the device -> RSA
    storage: biometrics ? Keychain.STORAGE_TYPE.RSA : Keychain.STORAGE_TYPE.AES,
  } as Keychain.Options;
};

export const saveRecoveryWalletInfo = async (keys: WalletType): Promise<void> => {
  if (!keys.seed) {
    console.log('no seed to store');
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

    // let's check if everything is correct
    const storedKeys = await getRecoveryWalletInfo();
    if (!isEqual(keys, storedKeys)) {
      // removing just in case
      console.log('Error checking stored keys - removing keys');
      await removeRecoveryWalletInfo();
    }
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

export const getStorageRecoveryWalletInfo = async (): Promise<string> => {
  try {
    const credentials = await Keychain.getGenericPassword(options(await Keychain.getSupportedBiometryType()));
    if (credentials) {
      console.log('keys read correctly', credentials);
      if (credentials.username === GlobalConst.keyKeyChain && credentials.service === GlobalConst.serviceKeyChain) {
        return credentials.storage;
      } else {
        console.log('no match the key');
      }
    } else {
      console.log('Error no keys stored');
    }
  } catch (error) {
    console.log('Error getting keys:', error);
  }
  return '';
};

export const hasRecoveryWalletInfo = async (): Promise<boolean> => {
  const keys: WalletType = await getRecoveryWalletInfo();
  if (keys.seed) {
    return true;
  } else {
    return false;
  }
};

export const createUpdateRecoveryWalletInfo = async (keys: WalletType): Promise<void> => {
  if (await hasRecoveryWalletInfo()) {
    // have Wallet Keys
    const oldKeys: WalletType = await getRecoveryWalletInfo();
    if (!isEqual(keys, oldKeys)) {
      // if different update
      console.log('updating keys');
      await removeRecoveryWalletInfo();
      await saveRecoveryWalletInfo(keys);
    }
  } else {
    // have not Wallet Keys
    console.log('creating keys');
    await saveRecoveryWalletInfo(keys);
  }
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
