import { ChainNameEnum, GlobalConst } from '@app/AppState';
import Utils from '@app/utils';
import { isValidChainAddress } from './addressValidators';

/**
 * Validate an address for its chain.
 *
 * - ZEC is validated by zingolib (`Utils.isValidAddress`) against the given
 *   Zcash network (main/test/regtest) — the same check the Send/AddressBook
 *   fields already use.
 * - Every other chain uses the format-only regex validators in
 *   `addressValidators` (`isValidChainAddress`).
 *
 * Empty input validates (presence is the caller's separate concern), matching
 * `isValidChainAddress`. Async because the ZEC path parses via the native RPC.
 */
export async function validateAddressForChain(
  swapChain: string,
  address: string,
  zcashChain: ChainNameEnum = ChainNameEnum.mainChainName,
): Promise<boolean> {
  const trimmed = address.trim();
  if (trimmed.length === 0) {
    return true;
  }
  if (swapChain.toUpperCase() === GlobalConst.zecSwapChain) {
    const r = await Utils.isValidAddress(trimmed, zcashChain);
    return r.isValid;
  }
  return isValidChainAddress(swapChain, trimmed);
}
