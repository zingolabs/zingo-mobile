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
 * Filtering is deliberately minimal:
 *
 *   - **Provider filter.** Only tokens from buckets whose provider routes ZEC
 *     are kept (Maya / NEAR / Flashnet) — the providers we have executors for.
 *     `ZEC.ZEC` itself is excluded since ZEC is the fixed side of every swap in
 *     this wallet. Tokens are then deduped by `identifier` (first wins).
 *
 * We do NOT validate token shape (address format per chain, `<CHAIN>.<CHAIN>`
 * identifiers, required `name`/`symbol`). An earlier "integrity guard" that did
 * so kept dropping perfectly valid assets: SwapKit ships fields inconsistently
 * (TON.TON with `name` undefined, buckets omitting `symbol`, TON Jettons with
 * `EQ…` addresses that failed a naive EVM/UTXO heuristic). The REAL gate on
 * whether an asset is swappable is the routability intersection against SwapKit
 * `/swapTo` & `/swapFrom` (see `listRoutableTokens`); anything the app actually
 * offers has already passed that. So the catalog trusts the upstream entries
 * and only skips ones missing the two fields it structurally needs
 * (`identifier`, `chain`).
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

function popularityRank(token: TokenEntryType): number {
  const sym = (token.symbol ?? '').toUpperCase();
  if (sym && POPULAR_RANK[sym] !== undefined) return POPULAR_RANK[sym];
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
    // Case-insensitive match, consistent with the dedupe key. SwapKit ships
    // the same asset with different identifier casing across endpoints — NEAR
    // sends lowercase in `/tokens` (e.g. `near.near`) while `/swapTo` &
    // `/swapFrom` return the canonical uppercase (`NEAR.NEAR`). An exact
    // `.has()` here silently dropped every NEAR-Intents asset from the picker
    // even though it routes fine. The stored `identifier` is left untouched so
    // the casing the provider expects still flows through to `/v3/quote`.
    return tokens.filter(t => filterSet.has(t.identifier.toLowerCase()));
  }

  /** Drop the cached list. Next `listTokens()` will refetch. */
  invalidate(): void {
    this.cache = null;
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
      // Lowercased so the match in `listRoutableTokens` is case-insensitive.
      this.routableOutbound = new Set(
        swapToResult.value.map(id => id.toLowerCase()),
      );
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
      // Lowercased so the match in `listRoutableTokens` is case-insensitive.
      this.routableInbound = new Set(
        swapFromResult.value.map(id => id.toLowerCase()),
      );
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

    const byIdentifier = new Map<string, TokenEntryType>();
    for (const bucket of response) {
      if (!ZEC_ROUTING_PROVIDERS.has(bucket.provider)) continue;
      for (const token of bucket.tokens) {
        // Minimal structural guard: we only need `identifier` (dedupe key,
        // routability match, and the asset id sent to `/v3/quote`) and `chain`
        // (chain badge + display). We deliberately do NOT validate address
        // formats per chain or require `symbol`/`name` — SwapKit ships those
        // inconsistently (TON.TON arrives with `name` undefined; some buckets
        // omit `symbol`; TON Jettons carry `EQ…` addresses our old EVM/UTXO
        // heuristic wrongly rejected). The REAL routability gate is the
        // `/swapTo` & `/swapFrom` intersection below, so any extra format
        // second-guessing here only drops valid, swappable assets.
        if (
          !token ||
          typeof token.identifier !== 'string' ||
          typeof token.chain !== 'string'
        ) {
          continue;
        }
        if (token.identifier === ZEC_IDENTIFIER) continue;
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
      const nameA = a.name ?? '';
      const nameB = b.name ?? '';
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return a.chain.localeCompare(b.chain);
    });
  }
}
