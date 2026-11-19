import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The last balance each wallet showed, kept so Wallets can list every
 * wallet's balance without opening it. One key per wallet id, holding the
 * total in ZEC across the pools.
 */
export const SAVED_BALANCE_KEY_PREFIX = 'wallet:balance:';

export type SavedBalance = { kind: 'none' } | { kind: 'saved'; total: number };

export async function writeSavedBalance(
  walletId: string,
  total: number,
): Promise<void> {
  await AsyncStorage.setItem(
    SAVED_BALANCE_KEY_PREFIX + walletId,
    String(total),
  );
}

/** The saved balance of each wallet id, none for a wallet that never showed one. */
export async function readSavedBalances(
  walletIds: string[],
): Promise<Record<string, SavedBalance>> {
  const stored = await Promise.all(
    walletIds.map(id => AsyncStorage.getItem(SAVED_BALANCE_KEY_PREFIX + id)),
  );
  const balances: Record<string, SavedBalance> = {};
  walletIds.forEach((id, i) => {
    const total = Number(stored[i]);
    balances[id] =
      stored[i] !== null && Number.isFinite(total)
        ? { kind: 'saved', total }
        : { kind: 'none' };
  });
  return balances;
}
