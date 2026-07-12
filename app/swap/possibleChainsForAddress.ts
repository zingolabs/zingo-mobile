import { ChainNameEnum } from '../AppState';
import { SWAP_ADDRESS_CHAINS } from './addressValidators';
import { validateAddressForChain } from './validateAddressForChain';

/**
 * The chains an address could plausibly belong to, for the address-book / swap
 * "chain" selector.
 *
 * - Empty address → every validatable chain (nothing to narrow by yet).
 * - Non-empty → only the chains whose validator accepts it (an EVM `0x…`
 *   address matches the whole EVM family; a BTC/SOL/ZEC address matches one).
 *
 * ZEC is checked by zingolib (against the given Zcash network); the rest by the
 * format-only regex validators — same dispatch as `validateAddressForChain`.
 * Order follows `SWAP_ADDRESS_CHAINS` (ZEC/BTC/ETH first).
 */
export async function possibleChainsForAddress(
  address: string,
  zcashChain: ChainNameEnum,
): Promise<string[]> {
  const addr = address.trim();
  if (!addr) {
    return [...SWAP_ADDRESS_CHAINS];
  }
  const checks = await Promise.all(
    SWAP_ADDRESS_CHAINS.map(async chain => ({
      chain,
      ok: await validateAddressForChain(chain, addr, zcashChain),
    })),
  );
  return checks.filter(c => c.ok).map(c => c.chain);
}
