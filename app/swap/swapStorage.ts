import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The key-value store behind `SwapStore`.
 *
 * Plain `AsyncStorage`: the records are swap-tracking metadata, and they rest
 * in the app sandbox beside the wallet file, which the platform already keeps
 * out of backups. `getItem` resolves `null` for a key never written, which
 * `SwapStore` reads as an empty bucket. Every other failure rejects, so a
 * store that cannot read its records never looks like a store with none.
 */
const swapStorage = {
  getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },

  setItem(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  },

  removeItem(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  },
};

export default swapStorage;
