import AsyncStorage from '@react-native-async-storage/async-storage';
import { readCurrentWalletFingerprint } from '@app/swap';

/**
 * The address the user pinned in Receive, one per wallet. It lives in the
 * app's key-value store under the wallet's fingerprint, like the swap
 * records, so another wallet on the device never opens on it.
 */
const keyFor = (fingerprint: string) => `receive:pin:${fingerprint}`;

/** The pinned address of the loaded wallet, or '' when none is pinned. */
export async function readPinnedAddress(): Promise<string> {
  const fingerprint = await readCurrentWalletFingerprint();
  if (!fingerprint) {
    return '';
  }
  return (await AsyncStorage.getItem(keyFor(fingerprint))) ?? '';
}

/** Pins `address` for the loaded wallet; '' unpins. */
export async function writePinnedAddress(address: string): Promise<void> {
  const fingerprint = await readCurrentWalletFingerprint();
  if (!fingerprint) {
    return;
  }
  if (address) {
    await AsyncStorage.setItem(keyFor(fingerprint), address);
  } else {
    await AsyncStorage.removeItem(keyFor(fingerprint));
  }
}
