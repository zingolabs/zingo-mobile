import type { SwapAssetType, TokenEntryType } from '@app/swap';

/**
 * ZEC as a catalog entry, so the fixed side of the swap goes through the same
 * `TokenLogo` as the asset the user picks and both sides get the same
 * composition treatment. The catalog itself excludes `ZEC.ZEC` — it lists what
 * ZEC can be swapped against — so this is written out rather than looked up.
 *
 * Same entry as the mobile wallet's `ZEC_TOKEN_ENTRY`, logo URL included.
 */
export const ZEC_TOKEN_ENTRY: TokenEntryType = {
  chain: 'ZEC',
  chainId: 'zcash',
  ticker: 'ZEC',
  identifier: 'ZEC.ZEC',
  symbol: 'ZEC',
  name: 'Zcash',
  decimals: 8,
  // No `logoURI`: the Zcash mark is bundled (see `chainIcons.ts`), so this chip
  // draws without a network round trip and without asking a third party for the
  // one logo in the picker that is ours to hold.
};

/** ZEC is the fixed side of every swap this wallet performs. */
export const ZEC_ASSET: SwapAssetType = {
  swapKitId: 'ZEC.ZEC',
  chain: 'ZEC',
  symbol: 'ZEC',
  ticker: 'ZEC',
  chainId: 'zcash',
  decimals: 8,
};

/**
 * The asset the user picked, in the shape the service quotes against.
 *
 * Both name forms are kept because they answer different questions. `symbol`
 * is the catalog's precise variant, `BTC-nbtc.bridge.near` for NEAR's wrapped
 * BTC, which is what the user will actually end up holding. `ticker` is the
 * short form the picker showed them. A surface that means "the asset you
 * chose" wants the second; one that means "the asset you will hold" wants the
 * first, and collapsing them would make one of the two lie.
 */
/**
 * Whether a catalog entry carries what a quote needs.
 *
 * `TokenEntryType` declares these fields as present and the live catalog ships
 * entries without them. An entry missing any of them cannot be quoted, so it
 * is dropped at the door rather than reaching the picker and failing later as
 * a malformed request.
 */
export function isQuotableToken(token: TokenEntryType): boolean {
  return (
    !!token.identifier &&
    !!token.chain &&
    !!token.symbol &&
    !!token.chainId &&
    Number.isFinite(token.decimals)
  );
}

/**
 * Whether a catalog entry is ZEC wearing another chain's clothes — the
 * wrapped forms SwapKit lists as `STRK.ZEC-…`, `SOL.ZEC-…` and
 * `NEAR.ZEC-…`.
 *
 * They belong on the source side and not on the destination side, and the
 * asymmetry is real rather than tidiness. Selling one to receive native ZEC is
 * a thing somebody wants: it is how ZEC held on Solana comes home. Buying one
 * with native ZEC is ZEC for ZEC, which is not a swap anyone means to make.
 *
 * It also read as broken. The picker offered them, the pick was taken, and the
 * chip then showed `ZEC` — because that is their ticker — next to the fixed
 * `ZEC` on the other side. Nothing appeared to have happened.
 *
 * Matched on the ticker rather than the identifier prefix, which is the chain
 * and varies. `ZEC.ZEC` never reaches this: the catalog lists what ZEC can be
 * swapped against, so it is excluded upstream. The chain test is here anyway,
 * so that if it ever does appear this says something true about it.
 */
export function isZecWrapper(token: TokenEntryType): boolean {
  return (
    token.ticker?.toUpperCase() === 'ZEC' &&
    token.chainId !== ZEC_TOKEN_ENTRY.chainId
  );
}

/**
 * The ids of the coins that share their chain and ticker with another entry, as
 * `NEAR.ETH-eth.bridge.near` and `NEAR.ETH-miden-…` do. Different tokens, and
 * the contract is the only thing the catalog says that tells them apart.
 */
export function repeatedCoins(tokens: TokenEntryType[]): Set<string> {
  const seen = new Map<string, TokenEntryType[]>();
  for (const token of tokens) {
    const key = `${token.chain}|${token.ticker || token.symbol}`.toUpperCase();
    seen.set(key, [...(seen.get(key) ?? []), token]);
  }
  return new Set(
    [...seen.values()]
      .filter(same => same.length > 1)
      .flat()
      .map(token => token.identifier),
  );
}

/** A contract short enough for one line: `miden-0x419f…omft.near`. */
export function shortContract(address: string): string {
  return address.length <= 24
    ? address
    : `${address.slice(0, 12)}…${address.slice(-9)}`;
}

/** The coins a contact saved under `chain` can swap with. */
export function chainCoins(
  tokens: TokenEntryType[],
  chain: string,
): TokenEntryType[] {
  return tokens.filter(
    token =>
      isQuotableToken(token) &&
      !isZecWrapper(token) &&
      token.chain.toUpperCase() === chain.toUpperCase(),
  );
}

/**
 * What a contact saved under `chain` swaps with by default: the chain's entry
 * with no contract, or its first token where it routes only tokens (USDC on
 * `HYPE`). Read from the catalog because this cannot be told from the chain
 * (TON pays in GRAM, Base in ETH) and SwapKit can change it. The catalog comes
 * sorted by popularity, so the first token is the likeliest one.
 */
export function chainCoin(
  tokens: TokenEntryType[],
  chain: string,
): TokenEntryType | undefined {
  const onChain = chainCoins(tokens, chain);
  return (
    onChain.find(token => !token.address && !token.identifier.includes('-')) ??
    onChain[0]
  );
}

export function tokenToSwapAsset(token: TokenEntryType): SwapAssetType {
  return {
    swapKitId: token.identifier,
    chain: token.chain,
    symbol: token.symbol,
    ticker: token.ticker,
    chainId: token.chainId,
    decimals: token.decimals,
  };
}

/**
 * A quoted asset as a catalog entry, for the logo. The catalog's own entry
 * carried a logo URL; a record keeps the asset alone, so the logo falls back
 * to the bundled chain mark or the lettered disc.
 */
export function tokenEntryOf(asset: SwapAssetType): TokenEntryType {
  return asset.swapKitId === ZEC_ASSET.swapKitId
    ? ZEC_TOKEN_ENTRY
    : {
        chain: asset.chain,
        chainId: asset.chainId,
        ticker: asset.ticker ?? asset.symbol,
        identifier: asset.swapKitId,
        symbol: asset.symbol,
        name: asset.ticker ?? asset.symbol,
        decimals: asset.decimals,
      };
}
