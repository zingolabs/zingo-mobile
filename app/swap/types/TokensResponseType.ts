/**
 * Wire-level shape of SwapKit `/tokens`.
 *
 * The endpoint returns one bucket per provider, each carrying a `tokens[]`
 * array. Token entries are the per-provider token lists; the same logical
 * asset (e.g. `BTC.BTC`) may appear in multiple buckets (any provider that
 * routes it). Consumers typically dedupe by `identifier`.
 *
 * Only the fields the UI consumes are typed; everything else is left as
 * unknown so a future provider can extend the schema without forcing a code
 * change here.
 */

export type TokenEntryType = {
  /** Short chain symbol (e.g. `"BTC"`, `"ETH"`, `"ZEC"`). */
  chain: string;
  /** SwapKit chain id (lowercase for non-EVM, decimal for EVM). */
  chainId: string;
  ticker: string;
  /** SwapKit asset identifier (`<chain>.<symbol>[-<contract>]`). Primary key. */
  identifier: string;
  symbol: string;
  /** Human-readable token name (e.g. `"Bitcoin"`). */
  name: string;
  decimals: number;
  logoURI?: string;
  /**
   * Smart-contract address for ERC20-like tokens. Absent for native gas
   * tokens (BTC.BTC, ETH.ETH, etc.). `TokenCatalog` uses this to reject
   * upstream entries whose address format does not match the chain.
   */
  address?: string;
};

export type TokensProviderBucketType = {
  provider: string;
  name: string;
  /** ISO-8601 timestamp of the bucket's last refresh server-side. */
  timestamp?: string;
  count?: number;
  tokens: TokenEntryType[];
};

/** Top-level response: array of provider buckets. */
export type TokensResponseType = TokensProviderBucketType[];
