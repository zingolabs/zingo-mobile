import type { TokenEntryType } from '@app/swap';

/**
 * The asset to point the chip at for a given chain: its native one where the
 * catalog has it, and otherwise the first thing it lists.
 *
 * A SwapKit identifier names a token by appending its contract to the chain
 * (`ETH.USDC-0x…`), so the entry without a suffix is the chain's own asset.
 * Taking the first match instead lands on whichever ERC-20 the catalog happens
 * to order first, which is nobody's idea of the default for "swap to this
 * Ethereum contact".
 */
export function pickChainAsset(
  tokens: TokenEntryType[],
  chain: string,
): TokenEntryType | undefined {
  const onChain = tokens.filter(
    t => (t.chain ?? '').toUpperCase() === chain.toUpperCase(),
  );
  return onChain.find(t => !(t.identifier ?? '').includes('-')) ?? onChain[0];
}
