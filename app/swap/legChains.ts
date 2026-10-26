/**
 * The chain a `/track` leg runs on, from the id SwapKit names it by.
 *
 * Legs carry a lowercase chain id ("zcash", "near", "solana"), while asset
 * ids and the explorer table use the short symbol ("ZEC", "NEAR", "SOL"). The
 * two are not a case change apart exactly where it matters: "solana" upper-
 * cased is not "SOL", and "zcash" is not "ZEC".
 *
 * Only ids seen on real responses are listed. An unknown id still gets a
 * usable fallback, the id itself, so a new chain shows its hash under its own
 * name rather than disappearing; it gets an explorer link once it is added.
 */
const LEG_CHAINS: Record<string, { symbol: string; name: string }> = {
  zcash: { symbol: 'ZEC', name: 'Zcash' },
  bitcoin: { symbol: 'BTC', name: 'Bitcoin' },
  near: { symbol: 'NEAR', name: 'NEAR' },
  solana: { symbol: 'SOL', name: 'Solana' },
};

export function legChain(chainId: string): { symbol: string; name: string } {
  return (
    LEG_CHAINS[chainId.toLowerCase()] ?? {
      symbol: chainId.toUpperCase(),
      name: chainId,
    }
  );
}
