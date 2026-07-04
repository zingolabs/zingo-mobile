import { SwapKitClient } from './SwapKitClient';
import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import { TokenEntryType } from './types/TokensResponseType';

/**
 * In-memory cache for the SwapKit token catalog.
 *
 * `/tokens` returns ~1 MB across 13 provider buckets. We refetch at most once
 * per app session (or on explicit `invalidate()`) and keep the deduped,
 * filtered result in memory. Consumers (asset pickers) await `listTokens()`
 * which either returns the cached value, joins an in-flight fetch, or kicks
 * off the first fetch.
 *
 * Filtering happens in two stages:
 *
 *   1. **Provider filter.** Only tokens from buckets whose provider routes
 *      ZEC are kept (Maya / NEAR / Flashnet). `ZEC.ZEC` itself is excluded
 *      since ZEC is the fixed side of every swap in this wallet. Tokens are
 *      then deduped by `identifier` (first occurrence wins).
 *
 *   2. **Per-chain integrity guard.** Each surviving entry is validated
 *      against its chain's expected token shape:
 *        - EVM chains require `address` to match `/^0x[0-9a-fA-F]{40}$/`.
 *        - Solana requires base58 (length >= 32, no `0x`, no `.`).
 *        - UTXO / Cardano / Sui / TON / XRP / Stellar chains are gas-token-
 *          only — any contract address is treated as malformed and rejected.
 *        - Native tokens (no `address`) must follow the canonical
 *          `<CHAIN>.<CHAIN>` identifier shape.
 *        - Other chains pass through unchanged (lenient default).
 *      This catches upstream entries with empty/garbled addresses that
 *      would otherwise be silently coerced into the wrong asset slot.
 *
 * Sorting projects popular tokens to the top (so the user sees BTC, ETH,
 * USDC… first instead of the long alphabetic tail) and then falls back to
 * a stable alphabetic order so the picker does not jitter between rebuilds.
 */

/**
 * Providers that route ZEC in/out of SwapKit. Sourced from `/providers`.
 * supportedChainIds (verified to contain `"zcash"`). Update this set when a
 * new provider adds ZEC support.
 */
const ZEC_ROUTING_PROVIDERS: ReadonlySet<string> = new Set<string>([
  SwapKitProviderEnum.MayachainStreaming,
  SwapKitProviderEnum.Near,
  SwapKitProviderEnum.Flashnet,
]);

const ZEC_IDENTIFIER = 'ZEC.ZEC';

/**
 * Chains that follow the EVM contract-address convention.
 * The set covers what SwapKit currently routes ZEC against plus common
 * sidechains; missing entries fall through to the lenient default.
 */
const EVM_CHAINS: ReadonlySet<string> = new Set([
  'ARB',
  'AVAX',
  'BASE',
  'BERA',
  'BSC',
  'CRO',
  'ETH',
  'FTM',
  'GNOSIS',
  'KAVA',
  'LINEA',
  'MATIC',
  'MNT',
  'OP',
  'POL',
  'XLAYER',
]);

/**
 * Chains with no smart-contract layer. A token that arrives with a non-empty
 * `address` on these chains is by definition malformed.
 */
const UTXO_OR_NATIVE_ONLY: ReadonlySet<string> = new Set([
  'ADA',
  'BCH',
  'BTC',
  'DASH',
  'DOGE',
  'LTC',
  'SUI',
  'TON',
  'XLM',
  'XRP',
  'ZEC',
]);

/**
 * Popularity ranks for the assets that cover ~99% of user swaps. Anything
 * not listed receives `RANK_TAIL` and is sorted alphabetically among itself.
 * Lower number = higher in the picker.
 */
const POPULAR_RANK: Readonly<Record<string, number>> = {
  BTC: 1,
  ETH: 2,
  USDC: 3,
  USDT: 4,
  SOL: 5,
  NEAR: 6,
  BNB: 7,
  DOGE: 8,
  AVAX: 9,
  POL: 10,
  MATIC: 10,
  LTC: 11,
  BCH: 12,
  ADA: 13,
  DOT: 14,
  ATOM: 15,
  XRP: 16,
  SUI: 17,
  TON: 18,
  ARB: 19,
  OP: 20,
  BASE: 21,
  TRX: 22,
  DASH: 23,
};
const RANK_TAIL = 1000;

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
// base58: alphanumeric minus 0/O/I/l, no `0x`, no `.`
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,}$/;

function isValidAddressForChain(
  chain: string,
  address: string | undefined,
): boolean {
  const c = chain.toUpperCase();

  if (!address || address.length === 0) {
    return true; // native — separate native check covers it
  }
  if (UTXO_OR_NATIVE_ONLY.has(c)) {
    return false; // any contract on a non-contract chain is malformed
  }
  if (EVM_CHAINS.has(c)) {
    return EVM_ADDRESS_RE.test(address);
  }
  if (c === 'SOL' || c === 'SOLANA') {
    return BASE58_RE.test(address);
  }
  // Unknown chain: be lenient rather than reject legitimate entries.
  return true;
}

function isValidNativeIdentifier(token: TokenEntryType): boolean {
  // Native (no address) tokens follow `<CHAIN>.<X>` per SwapKit's convention.
  // Most chains use `<CHAIN>.<CHAIN>` (BTC.BTC, ETH.ETH, NEAR.NEAR), but L2s
  // typically inherit their parent's gas token: BASE.ETH, OP.ETH, ARB.ETH,
  // BSC.BNB, XLAYER.OKB, etc. We accept any single-dot identifier whose
  // chain prefix matches.
  const c = token.chain.toUpperCase();
  const parts = token.identifier.toUpperCase().split('.');
  return parts.length === 2 && parts[0] === c && parts[1].length > 0;
}

function isValidToken(token: TokenEntryType): boolean {
  if (!token.address || token.address.length === 0) {
    return isValidNativeIdentifier(token);
  }
  return isValidAddressForChain(token.chain, token.address);
}

function popularityRank(token: TokenEntryType): number {
  const sym = token.symbol.toUpperCase();
  if (POPULAR_RANK[sym] !== undefined) return POPULAR_RANK[sym];
  const ticker = token.ticker?.toUpperCase();
  if (ticker && POPULAR_RANK[ticker] !== undefined) {
    return POPULAR_RANK[ticker];
  }
  return RANK_TAIL;
}

/**
 * SwapKit asset id we treat as "ZEC" for the routability filter — same
 * canonical identifier the rest of the swap module uses (e.g. for
 * Maya / THORChain memos and `/v3/quote` bodies). Hardcoded because
 * this app is ZEC-centric by definition; if we ever support routing
 * starting from a different chain, this becomes a parameter.
 */
const ZEC_ASSET_ID = 'ZEC.ZEC';

export class TokenCatalog {
  private readonly client: SwapKitClient;
  private cache: TokenEntryType[] | null = null;
  private inFlight: Promise<TokenEntryType[]> | null = null;
  /**
   * Map from `chain.toUpperCase()` to the canonical chain badge logo URI,
   * derived from each chain's native token in the raw `/tokens` response.
   * Built alongside `cache` during `fetchAndProcess`. Replaces the previous
   * hardcoded `NATIVE_TICKER_OF_CHAIN` map in `TokenLogo`.
   */
  private chainLogoMap: Map<string, string> = new Map();

  /**
   * Routability filters fetched once per session from SwapKit `/swapTo` and
   * `/swapFrom`. Trim the catalog to assets that genuinely route to/from
   * ZEC at fetch time, so the picker does not surface choices that fail at
   * `/v3/quote` time. `null` means "not yet fetched" OR "fetch failed" —
   * the picker degrades to the full catalog in both cases. Session-scoped
   * intentionally: SwapKit recomposes the routable set as providers go up
   * and down; a fresh app launch picks up the new state.
   */
  private routableOutbound: Set<string> | null = null;
  private routableInbound: Set<string> | null = null;

  constructor(client: SwapKitClient) {
    this.client = client;
  }

  /**
   * Return the canonical chain logo URI for the given chain code (e.g.
   * `"BASE"` → `https://…/base.eth.png`). `undefined` when the catalog has
   * not yet been fetched, or the chain has no native token in the response.
   */
  chainLogoUri(chain: string): string | undefined {
    return this.chainLogoMap.get(chain.toUpperCase());
  }

  /**
   * Return the deduped, ZEC-pairable token list. Cached on first success.
   * Concurrent callers join the same in-flight request rather than firing
   * parallel fetches.
   */
  async listTokens(): Promise<TokenEntryType[]> {
    if (this.cache !== null) return this.cache;
    if (this.inFlight !== null) return this.inFlight;

    this.inFlight = this.fetchAndProcess();
    try {
      const result = await this.inFlight;
      this.cache = result;
      return result;
    } finally {
      this.inFlight = null;
    }
  }

  /**
   * Return the deduped, ZEC-pairable token list, additionally trimmed to
   * the set SwapKit reports as routable in the given direction at the time
   * of catalog fetch. Used by the swap-form asset picker so the user only
   * sees options that can actually be quoted.
   *
   * Fallback policy: if the routability fetch failed (cache is `null`),
   * the method returns the full `listTokens()` result — preferring "user
   * sees too much" over "user sees nothing". The provider mismatch is
   * still a possibility if SwapKit adds new ZEC-aware providers we have
   * not integrated, but that already happens with `listTokens()` today.
   */
  async listRoutableTokens(
    direction: 'outbound' | 'inbound',
  ): Promise<TokenEntryType[]> {
    const tokens = await this.listTokens();
    const filterSet =
      direction === 'outbound' ? this.routableOutbound : this.routableInbound;
    if (filterSet === null) return tokens;
    return tokens.filter(t => filterSet.has(t.identifier));
  }

  /** Drop the cached list. Next `listTokens()` will refetch. */
  invalidate(): void {
    this.cache = null;
    this.chainLogoMap = new Map();
    this.routableOutbound = null;
    this.routableInbound = null;
  }

  private async fetchAndProcess(): Promise<TokenEntryType[]> {
    // Fan out: `/tokens` is the heavy 1 MB catalog and is required for the
    // picker to work at all; `/swapTo` and `/swapFrom` are the lightweight
    // routability filters and are optional (we fall back to the full
    // catalog on failure). Run them concurrently with `allSettled` so a
    // 503 on the routability calls never blocks the picker from loading.
    const [tokensResult, swapToResult, swapFromResult] =
      await Promise.allSettled([
        this.client.tokens(),
        this.client.swapTo(ZEC_ASSET_ID),
        this.client.swapFrom(ZEC_ASSET_ID),
      ]);

    if (tokensResult.status === 'rejected') {
      // `/tokens` is the only one that is required — bubble its error to
      // the caller so the existing failure UX (snackbar in Swap.tsx) fires.
      throw tokensResult.reason;
    }
    const response = tokensResult.value;

    if (
      swapToResult.status === 'fulfilled' &&
      Array.isArray(swapToResult.value)
    ) {
      this.routableOutbound = new Set(swapToResult.value);
    } else if (swapToResult.status === 'rejected') {
      const msg =
        swapToResult.reason instanceof Error
          ? swapToResult.reason.message
          : String(swapToResult.reason);
      console.log(
        'TokenCatalog: /swapTo failed, falling back to full catalog:',
        msg,
      );
    }

    if (
      swapFromResult.status === 'fulfilled' &&
      Array.isArray(swapFromResult.value)
    ) {
      this.routableInbound = new Set(swapFromResult.value);
    } else if (swapFromResult.status === 'rejected') {
      const msg =
        swapFromResult.reason instanceof Error
          ? swapFromResult.reason.message
          : String(swapFromResult.reason);
      console.log(
        'TokenCatalog: /swapFrom failed, falling back to full catalog:',
        msg,
      );
    }

    // Build the chain logo map first, across ALL buckets (not just ZEC-routing
    // ones). Every chain SwapKit indexes has at least one native token, and
    // its `logoURI` is the canonical chain badge image — saves us from
    // synthesising `<chain>.<native>.png` URLs manually and getting L2s
    // wrong (BASE.ETH vs BASE.BASE).
    const chainLogos = new Map<string, string>();
    for (const bucket of response) {
      for (const token of bucket.tokens) {
        if (
          !token ||
          typeof token.chain !== 'string' ||
          typeof token.logoURI !== 'string' ||
          token.logoURI.length === 0
        ) {
          continue;
        }
        const hasAddress =
          typeof token.address === 'string' && token.address.length > 0;
        if (hasAddress) continue; // contract tokens carry the contract logo, not the chain logo
        const chainKey = token.chain.toUpperCase();
        if (!chainLogos.has(chainKey)) {
          chainLogos.set(chainKey, token.logoURI);
        }
      }
    }
    this.chainLogoMap = chainLogos;

    const byIdentifier = new Map<string, TokenEntryType>();
    for (const bucket of response) {
      if (!ZEC_ROUTING_PROVIDERS.has(bucket.provider)) continue;
      for (const token of bucket.tokens) {
        // Required-field guard: providers occasionally include malformed
        // entries (missing `identifier`, `symbol`, etc.). Skipping is safer
        // than crashing the whole catalog load.
        if (
          !token ||
          typeof token.identifier !== 'string' ||
          typeof token.symbol !== 'string' ||
          typeof token.chain !== 'string' ||
          typeof token.name !== 'string'
        ) {
          continue;
        }
        if (token.identifier === ZEC_IDENTIFIER) continue;
        if (!isValidToken(token)) continue;
        // Case-insensitive dedupe key: SwapKit returns the same on-chain
        // asset multiple times with different identifier casing (NEAR
        // ships lowercase; Maya/Flashnet ship EIP-55 checksum). On EVM
        // chains the address is case-insensitive by spec, so collapsing
        // them is correct; on other chains the chance of a genuine
        // case-only collision is astronomically low.
        const key = token.identifier.toLowerCase();
        if (!byIdentifier.has(key)) {
          byIdentifier.set(key, token);
        }
      }
    }

    return Array.from(byIdentifier.values()).sort((a, b) => {
      const rankA = popularityRank(a);
      const rankB = popularityRank(b);
      if (rankA !== rankB) return rankA - rankB;
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      return a.chain.localeCompare(b.chain);
    });
  }
}
