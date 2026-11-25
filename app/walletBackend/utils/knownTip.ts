/**
 * The chain tip the app goes by: the server's while it gives one at or past
 * the wallet's, else the wallet's last known one, which zingolib keeps in the
 * wallet file from the last sync. 0 only when neither is known.
 */
export const knownTip = (serverHeight: number, walletHeight: number): number =>
  serverHeight > 0 && serverHeight >= walletHeight
    ? serverHeight
    : walletHeight;
