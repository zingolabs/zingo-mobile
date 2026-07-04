import { ChainNameEnum } from '../AppState/enums/ChainNameEnum';
import { SwapOperationEnum } from './enums/SwapErrorCategoryEnum';
import { SwapKitHttpError, SwapKitNetworkError } from './errors';
import { QuoteResponseType } from './types/QuoteResponseType';
import { SwapResponseType } from './types/SwapResponseType';
import { TokensResponseType } from './types/TokensResponseType';
import { TrackResponseType } from './types/TrackResponseType';

/**
 * Thin typed wrapper over SwapKit's REST v3 API.
 *
 * Responsibilities (kept narrow on purpose):
 *   - Hold the API key and base URL.
 *   - Build requests for `/v3/quote`, `/v3/swap`, and `/track`.
 *   - Apply per-operation timeouts via `AbortController`.
 *   - Wrap transport failures in `SwapKitNetworkError` and non-2xx responses in
 *     `SwapKitHttpError` — never return raw fetch errors.
 *
 * Non-responsibilities (live elsewhere):
 *   - Building deposit instructions from a `/v3/swap` response — that is the
 *     job of each `ProviderExecutor`, since the response shape is provider-
 *     specific.
 *   - Polling cadence and dedupe — `SwapPoller` owns that.
 *   - Persisting records — `SwapStore` owns that.
 *
 * The client refuses to construct on anything other than mainnet: SwapKit has
 * no testnet routing for any of the providers we use, so the only way to
 * exercise this code is mainnet. Defensive guard against UI gating regressions.
 *
 * Timeouts: quote/swap have a longer budget because the provider sometimes
 * needs to allocate a deposit address (NEAR Intents) or rotate a vault
 * (Mayachain). Track is the hot path called on every poller tick, so the
 * shorter timeout protects against a slow `/track` blocking the poller.
 *
 * URL encoding: query params are encoded with `URLSearchParams`; the SwapKit
 * `asset` strings contain `.` and `-` which are URL-safe, but contracts that
 * include `=` or `?` would not be — `URLSearchParams` handles all of these.
 */

const SWAPKIT_BASE_URL = 'https://api.swapkit.dev';
const QUOTE_TIMEOUT_MS = 15_000;
const SWAP_TIMEOUT_MS = 15_000;
const TRACK_TIMEOUT_MS = 10_000;
// `/tokens` returns ~1 MB; allow a generous budget for slow mobile networks.
const TOKENS_TIMEOUT_MS = 20_000;

/**
 * Inputs to `/v3/quote`. Fields map 1:1 to the JSON body SwapKit accepts.
 * The endpoint is POST + JSON; we send `slippage` as a percentage number
 * (e.g. `2` for 2%), not basis points or a string.
 */
export type SwapKitQuoteParams = {
  /** Source asset SwapKit identifier (e.g. `"ZEC.ZEC"`). */
  sellAsset: string;
  /** Destination asset SwapKit identifier. */
  buyAsset: string;
  /** Amount to sell in source-asset display units (string). */
  sellAmount: string;
  /** Source-chain address (transparent ZEC address for outbound). Used by
   *  SwapKit for AML pre-screening and threaded through to provider-specific
   *  refund routing. Matches the v3 schema field name `sourceAddress`. */
  sourceAddress: string;
  /** Destination-chain address. */
  destinationAddress: string;
  /** Slippage tolerance as a percentage number (e.g. `2` = 2%). */
  slippage?: number;
};

/** Inputs to `/v3/swap`. */
export type SwapKitSwapParams = {
  /** Per-route opaque identifier from the chosen `QuoteRouteType` (NOT the
   *  top-level `quoteId`; SwapKit's schema rejects the latter with
   *  `body/routeId Invalid input`). */
  routeId: string;
  /** Source-chain address from the quote. */
  sourceAddress: string;
  /** Destination-chain address from the quote. */
  destinationAddress: string;
  /**
   * Tell SwapKit to skip balance precheck — required because we fund the
   * source address ourselves between quote and broadcast. Defaults to `true`;
   * no reasonable caller in this app would set it to `false`.
   */
  disableBalanceCheck?: boolean;
  /**
   * We build the deposit tx in zingolib (Path B); do not return a PSBT.
   * Defaults to `true` for the same reason as `disableBalanceCheck`.
   */
  disableBuildTx?: boolean;
  /**
   * Skip provider-side security checks (AML preliminary screens, flagged
   * account filters, etc.). Defaults to `undefined` so SwapKit's server-side
   * security layer runs as configured. Set to `true` only for testing or
   * recovery flows where the user has explicitly accepted the risk.
   */
  disableSecurityChecks?: boolean;
};

/** Inputs to `/track`. */
export type SwapKitTrackParams = {
  /** Lowercase chain id (e.g. `"zcash"`, `"bitcoin"`) or numeric EVM chain id. */
  chainId: string;
  /** Either the inbound vault address or our deposit tx hash, depending on
   * provider semantics. Both are accepted by `/track`. */
  hash?: string;
  depositAddress?: string;
};

export class SwapKitClient {
  private readonly apiKey: string;

  constructor(args: { apiKey: string; chainName: ChainNameEnum }) {
    if (args.chainName !== ChainNameEnum.mainChainName) {
      throw new Error(
        `SwapKitClient is mainnet-only; refused to construct for chain "${args.chainName}".`,
      );
    }
    if (!args.apiKey || args.apiKey === 'replace-me-with-real-key') {
      throw new Error('SwapKitClient: missing or placeholder API key.');
    }
    this.apiKey = args.apiKey;
  }

  async quote(params: SwapKitQuoteParams): Promise<QuoteResponseType> {
    return this.request<QuoteResponseType>({
      operation: SwapOperationEnum.Quote,
      method: 'POST',
      path: '/v3/quote',
      timeoutMs: QUOTE_TIMEOUT_MS,
      body: {
        sellAsset: params.sellAsset,
        buyAsset: params.buyAsset,
        sellAmount: params.sellAmount,
        sourceAddress: params.sourceAddress,
        destinationAddress: params.destinationAddress,
        ...(params.slippage !== undefined && { slippage: params.slippage }),
      },
    });
  }

  async swap(params: SwapKitSwapParams): Promise<SwapResponseType> {
    return this.request<SwapResponseType>({
      operation: SwapOperationEnum.Swap,
      method: 'POST',
      path: '/v3/swap',
      timeoutMs: SWAP_TIMEOUT_MS,
      body: {
        routeId: params.routeId,
        sourceAddress: params.sourceAddress,
        destinationAddress: params.destinationAddress,
        disableBalanceCheck: params.disableBalanceCheck ?? true,
        disableBuildTx: params.disableBuildTx ?? true,
        ...(params.disableSecurityChecks !== undefined && {
          disableSecurityChecks: params.disableSecurityChecks,
        }),
      },
    });
  }

  async track(params: SwapKitTrackParams): Promise<TrackResponseType> {
    if (!params.hash && !params.depositAddress) {
      throw new Error(
        'SwapKitClient.track: one of `hash` or `depositAddress` is required.',
      );
    }
    return this.request<TrackResponseType>({
      operation: SwapOperationEnum.Track,
      method: 'POST',
      path: '/track',
      timeoutMs: TRACK_TIMEOUT_MS,
      body: {
        chainId: params.chainId,
        ...(params.hash !== undefined && { hash: params.hash }),
        ...(params.depositAddress !== undefined && {
          depositAddress: params.depositAddress,
        }),
      },
    });
  }

  /**
   * Fetch the SwapKit token catalog. The response is large (~1 MB) and
   * changes infrequently; callers should cache it for the lifetime of a
   * session rather than refetching per screen.
   *
   * `/tokens` does not accept the swap `operation` semantics (no error
   * classification beyond transport), so its failures fall under the `Quote`
   * UX bucket — the most natural mapping since the token list is consumed
   * during the quote flow.
   */
  async tokens(): Promise<TokensResponseType> {
    return this.request<TokensResponseType>({
      operation: SwapOperationEnum.Quote,
      method: 'GET',
      path: '/tokens',
      timeoutMs: TOKENS_TIMEOUT_MS,
    });
  }

  /**
   * Fetch the list of assets you can SELL to obtain `buyAsset`. SwapKit
   * uses this as a routability filter — the result is the set of source
   * assets that have at least one provider route into `buyAsset` at
   * call time. Used to trim the swap picker so the user does not select
   * an asset only to discover at quote time that no route exists.
   *
   * Response: flat JSON array of SwapKit asset identifiers (e.g.
   * `["ARB.ETH", "BTC.BTC", ...]`). Verified empirically returns ~156
   * entries for `ZEC.ZEC` as of 2026-06-28 (vs ~1000 in `/tokens`).
   */
  async swapFrom(buyAsset: string): Promise<string[]> {
    return this.request<string[]>({
      operation: SwapOperationEnum.Quote,
      method: 'GET',
      path: `/swapFrom?buyAsset=${encodeURIComponent(buyAsset)}`,
      timeoutMs: TOKENS_TIMEOUT_MS,
    });
  }

  /**
   * Fetch the list of assets you can BUY given a sell asset. Mirror of
   * `swapFrom`. Same routability-filter semantics; used by the picker on
   * the outbound flow.
   */
  async swapTo(sellAsset: string): Promise<string[]> {
    return this.request<string[]>({
      operation: SwapOperationEnum.Quote,
      method: 'GET',
      path: `/swapTo?sellAsset=${encodeURIComponent(sellAsset)}`,
      timeoutMs: TOKENS_TIMEOUT_MS,
    });
  }

  private async request<T>(args: {
    operation: SwapOperationEnum;
    method: 'GET' | 'POST';
    path: string;
    timeoutMs: number;
    body?: unknown;
  }): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), args.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${SWAPKIT_BASE_URL}${args.path}`, {
        method: args.method,
        signal: controller.signal,
        headers: {
          'x-api-key': this.apiKey,
          Accept: 'application/json',
          ...(args.body !== undefined && {
            'Content-Type': 'application/json',
          }),
        },
        ...(args.body !== undefined && { body: JSON.stringify(args.body) }),
      });
    } catch (cause) {
      throw new SwapKitNetworkError(args.operation, cause);
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();

    if (!response.ok) {
      throw new SwapKitHttpError({
        operation: args.operation,
        httpStatus: response.status,
        body: text,
      });
    }

    try {
      return JSON.parse(text) as T;
    } catch (cause) {
      throw new SwapKitNetworkError(args.operation, cause);
    }
  }
}
