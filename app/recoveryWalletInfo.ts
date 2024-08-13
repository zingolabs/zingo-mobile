import * as Keychain from 'react-native-keychain';
import { TranslateType, WalletType } from './AppState';
import { isEqual } from 'lodash';

export const saveRecoveryWalletInfo = async (
  keys: WalletType,
  translate: (key: string) => TranslateType,
): Promise<void> => {
  if (!keys.seed) {
    console.log('no seed to store');
    return;
  }
  try {
    await Keychain.setGenericPassword(translate('zingo') as string, JSON.stringify(keys));
    console.log('keys saved correctly');
    //console.log('key:', translate('zingo') as string);
    //console.log('value:', keys);
  } catch (error) {
    console.log('Error saving keys', error);
  }
};

export const getRecoveryWalletInfo = async (translate: (key: string) => TranslateType): Promise<WalletType> => {
  try {
    const credentials = await Keychain.getGenericPassword();
    if (credentials) {
      console.log('keys read correctly');
      //console.log('key:', credentials.username);
      //console.log('value:', credentials.password);
      if (credentials.username === (translate('zingo') as string)) {
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

export const hasRecoveryWalletInfo = async (translate: (key: string) => TranslateType): Promise<boolean> => {
  const keys: WalletType = await getRecoveryWalletInfo(translate);
  if (keys.seed) {
    return true;
  } else {
    return false;
  }
};

export const createUpdateRecoveryWalletInfo = async (
  keys: WalletType,
  translate: (key: string) => TranslateType,
): Promise<void> => {
  if (await hasRecoveryWalletInfo(translate)) {
    // have Wallet Keys
    const oldKeys: WalletType = await getRecoveryWalletInfo(translate);
    if (!isEqual(keys, oldKeys)) {
      // if different update
      console.log('updating keys');
      await saveRecoveryWalletInfo(keys, translate);
    }
  } else {
    // have not Wallet Keys
    console.log('creating keys');
    await saveRecoveryWalletInfo(keys, translate);
  }
};

export const removeRecoveryWalletInfo = async (translate: (key: string) => TranslateType): Promise<void> => {
  if (await hasRecoveryWalletInfo(translate)) {
    // have Wallet Keys
    const removed: boolean = await Keychain.resetGenericPassword();
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
