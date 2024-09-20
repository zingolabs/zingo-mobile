import * as Keychain from 'react-native-keychain';
import { GlobalConst, WalletType } from './AppState';
import { isEqual } from 'lodash';

const options = {
  service: GlobalConst.serviceKeyChain,
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
  securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
  rules: Keychain.SECURITY_RULES.NONE,
};

export const saveRecoveryWalletInfo = async (keys: WalletType): Promise<void> => {
  if (!keys.seed) {
    console.log('no seed to store');
    return;
  }
  try {
    await Keychain.setGenericPassword(GlobalConst.keyKeyChain, JSON.stringify(keys), options);
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
    const credentials = await Keychain.getGenericPassword({ service: GlobalConst.serviceKeyChain });
    if (credentials) {
      console.log('keys read correctly');
      //console.log('key:', credentials.username);
      //console.log('value:', credentials.password);
      if (credentials.username === GlobalConst.keyKeyChain) {
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
    const removed: boolean = await Keychain.resetGenericPassword({ service: GlobalConst.serviceKeyChain });
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
