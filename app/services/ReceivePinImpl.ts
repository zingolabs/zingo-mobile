import AsyncStorage from '@react-native-async-storage/async-storage';
import { readOpenWalletId } from '@app/walletBackend/utils/walletStore';

/**
 * The address the user pinned in Receive, one per wallet. It lives in the
 * app's key-value store under the wallet's id, like the swap
 * records, so another wallet on the device never opens on it.
 */
export const RECEIVE_PIN_KEY_PREFIX = 'receive:pin:';

const keyFor = (walletId: string) => RECEIVE_PIN_KEY_PREFIX + walletId;

/** The pinned address of the loaded wallet, or '' when none is pinned. */
export async function readPinnedAddress(): Promise<string> {
  const walletId = await readOpenWalletId();
  if (!walletId) {
    return '';
  }
  return (await AsyncStorage.getItem(keyFor(walletId))) ?? '';
}

/** Pins `address` for the loaded wallet; '' unpins. */
export async function writePinnedAddress(address: string): Promise<void> {
  const walletId = await readOpenWalletId();
  if (!walletId) {
    return;
  }
  if (address) {
    await AsyncStorage.setItem(keyFor(walletId), address);
  } else {
    await AsyncStorage.removeItem(keyFor(walletId));
  }
}
