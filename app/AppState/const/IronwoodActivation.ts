import InfoType from '@app/AppState/types/InfoType';

/**
 * True once the connected chain's tip has passed Ironwood (NU6.3) activation.
 *
 * Both halves come from the same `info` fetch, and neither is hardcoded here:
 * `ironwoodActivationHeight` is reported by the native layer from zingolib's
 * consensus parameters (mainnet/testnet delegate to `zcash_protocol`'s table,
 * regtest reports its own `ActivationHeights`), so the app is always on the
 * exact schedule the wallet backend transacts against.
 *
 * `latestBlock` is the SERVER's chain tip, not the wallet's sync height, so
 * this answers "does the Ironwood pool exist on this chain yet" independently
 * of how far the wallet has synced.
 *
 * False whenever the answer is not yet known — before the first info fetch, on
 * a fetch failure (which zeroes `latestBlock`), Offline, or against a native
 * lib built before it reported the height. Anything gated on this stays hidden
 * rather than flashing on with unknown chain state.
 */
export const isIronwoodActive = (info: InfoType | null): boolean => {
  if (!info?.ironwoodActivationHeight || !info.latestBlock) {
    return false;
  }
  return info.latestBlock >= info.ironwoodActivationHeight;
};
