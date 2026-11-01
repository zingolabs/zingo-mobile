import AsyncStorage from '@react-native-async-storage/async-storage';
import { readCurrentWalletFingerprint } from '@app/swap';

/**
 * Whether the Ironwood notice on Home was hidden, one per wallet, under the
 * wallet's fingerprint like the pinned Receive address. It keeps the Orchard
 * balance at the moment of the X: more than that in Orchard brings the
 * notice back.
 */
export const IRONWOOD_HIDDEN_KEY_PREFIX = 'ironwood:hidden:';

export type IronwoodNoticeHide =
  { kind: 'shown' } | { kind: 'hidden'; orchard: number };

const keyFor = (fingerprint: string) =>
  IRONWOOD_HIDDEN_KEY_PREFIX + fingerprint;

export async function readIronwoodNoticeHide(): Promise<IronwoodNoticeHide> {
  const fingerprint = await readCurrentWalletFingerprint();
  const stored = fingerprint
    ? await AsyncStorage.getItem(keyFor(fingerprint))
    : null;
  const orchard = Number(stored);
  return stored !== null && Number.isFinite(orchard)
    ? { kind: 'hidden', orchard }
    : { kind: 'shown' };
}

export async function writeIronwoodNoticeHide(
  hide: IronwoodNoticeHide,
): Promise<void> {
  const fingerprint = await readCurrentWalletFingerprint();
  if (!fingerprint) {
    return;
  }
  if (hide.kind === 'hidden') {
    await AsyncStorage.setItem(keyFor(fingerprint), String(hide.orchard));
  } else {
    await AsyncStorage.removeItem(keyFor(fingerprint));
  }
}
