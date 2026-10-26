/**
 * A swap-tradable asset, in the canonical SwapKit representation.
 *
 * SwapKit identifies assets as a `<chain>.<symbol>[-<contract>]` string in its
 * REST API (e.g. `ZEC.ZEC`, `BTC.BTC`, `ETH.USDC-0xA0b86991...`). We keep that
 * string verbatim under `swapKitId` for transport, plus pre-parsed convenience
 * fields for display and provider routing.
 *
 * `chainId` matches what SwapKit accepts in the `/track` request body's
 * `chainId` field (lowercase for non-EVM chains, decimal EVM chain id for
 * EVMs, e.g. `"zcash"`, `"bitcoin"`, `"1"`).
 *
 * `decimals` is required when converting between human-decimal strings (used
 * by SwapKit) and base units (used by zingolib for ZEC and by EVMs for ERC20).
 */
export type SwapAssetType = {
  /** Verbatim SwapKit asset identifier. Primary transport form. */
  swapKitId: string;
  /** Short chain symbol shown to the user (e.g. `"ZEC"`, `"ETH"`, `"BTC"`). */
  chain: string;
  /** Token symbol — the catalog-precise form (e.g. `"BTC-nbtc.bridge.near"`
   *  when the entry came from NEAR's bucket, `"USDC-<contract>"` for ERC20
   *  variants). Kept verbatim so anything that needs to disambiguate the
   *  on-chain variant (post-commit success row showing what the user will
   *  actually receive) can do so. UI surfaces that mean "the asset the
   *  user picked from the picker" should prefer `ticker`. */
  symbol: string;
  /** Optional clean short symbol (e.g. `"BTC"`, `"USDC"`) when SwapKit's
   *  catalog gives us one. Falls back to `symbol` when absent. Used by the
   *  deposit-instructions exact-amount row and other display surfaces where
   *  the long catalog symbol would be noise rather than signal. */
  ticker?: string;
  /** Optional contract address for ERC20-like tokens. */
  contractAddress?: string;
  /** ChainId as required by SwapKit `/track`. Lowercase or numeric string. */
  chainId: string;
  /** Number of decimals for human ↔ base-units conversion. */
  decimals: number;
};
