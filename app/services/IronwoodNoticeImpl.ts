import AsyncStorage from '@react-native-async-storage/async-storage';
import { readOpenWalletId } from '@app/walletBackend/utils/walletStore';

/**
 * Whether the Ironwood notice on Home was hidden, one per wallet, under the
 * wallet's id like the pinned Receive address. It keeps the Orchard
 * balance at the moment of the X: more than that in Orchard brings the
 * notice back.
 */
export const IRONWOOD_HIDDEN_KEY_PREFIX = 'ironwood:hidden:';

export type IronwoodNoticeHide =
  { kind: 'shown' } | { kind: 'hidden'; orchard: number };

const keyFor = (walletId: string) => IRONWOOD_HIDDEN_KEY_PREFIX + walletId;

export async function readIronwoodNoticeHide(): Promise<IronwoodNoticeHide> {
  const walletId = await readOpenWalletId();
  const stored = walletId ? await AsyncStorage.getItem(keyFor(walletId)) : null;
  const orchard = Number(stored);
  return stored !== null && Number.isFinite(orchard)
    ? { kind: 'hidden', orchard }
    : { kind: 'shown' };
}

export async function writeIronwoodNoticeHide(
  hide: IronwoodNoticeHide,
): Promise<void> {
  const walletId = await readOpenWalletId();
  if (!walletId) {
    return;
  }
  if (hide.kind === 'hidden') {
    await AsyncStorage.setItem(keyFor(walletId), String(hide.orchard));
  } else {
    await AsyncStorage.removeItem(keyFor(walletId));
  }
}
