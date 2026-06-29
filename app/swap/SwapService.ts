import { ChainNameEnum } from '../AppState/enums/ChainNameEnum';
import { MidgardClient } from './MidgardClient';
import { SwapKitClient } from './SwapKitClient';
import { SwapPoller } from './SwapPoller';
import { SwapStore } from './SwapStore';
import { TokenCatalog } from './TokenCatalog';
import { BroadcastStatusEnum } from './enums/BroadcastStatusEnum';
import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import { SwapStatusEnum, isTerminalStatus } from './enums/SwapStatusEnum';
import {
  ProviderRegistry,
  createDefaultProviderRegistry,
} from './providers/ProviderRegistry';
import { DepositInstructionsType } from './types/DepositInstructionsType';
import { FiatValueBasisType } from './types/FiatValueBasisType';
import { QuoteResponseType, QuoteRouteType } from './types/QuoteResponseType';
import { RouteOptionType } from './types/RouteOptionType';
import { SwapAssetType } from './types/SwapAssetType';
import { SwapRecordType } from './types/SwapRecordType';
import { TokenEntryType } from './types/TokensResponseType';

/**
 * Top-level orchestrator that the UI layer interacts with.
 *
 * Responsibilities (kept explicit):
 *   - `quote(input)` — call /v3/quote, filter to supported providers, return
 *     the projected `RouteOptionType[]` and the raw response (so the caller
 *     can build the fiat-basis snapshot for the chosen route).
 *   - `commitRoute(args)` — call /v3/swap, run the provider executor to get
 *     `DepositInstructionsType`, build the initial `SwapRecord`, persist.
 *   - `markBroadcasted(args)` — flip the broadcast bookkeeping once zingolib
 *     reports its tx id. The UI thread is responsible for handing off the
 *     instructions to RPC; this service never touches zingolib directly.
 *   - `listRecords` / `getRecord` — convenience pass-throughs to the store.
 *   - `forceRefresh` — pull-to-refresh via the poller.
 *   - `startPolling` / `stopPolling` — explicit lifecycle, caller-owned.
 *   - `hasInflightDeposits` — guard for the account-deletion flow.
 *
 * The constructor takes pre-built dependencies; `createSwapService(args)` is
 * the production factory that wires them up from minimal config. Tests can
 * construct a service with mock executors and a mock client.
 */
export type SwapServiceArgs = {
  client: SwapKitClient;
  registry: ProviderRegistry;
  store: typeof SwapStore;
  poller: SwapPoller;
  tokenCatalog: TokenCatalog;
};

export type QuoteInput = {
  sellAsset: SwapAssetType;
  receiveAsset: SwapAssetType;
  sellAmountHumanDecimal: string;
  /** Source-chain wallet address. For outbound (ZEC source) this is the
   *  ephemeral ZIP-320 t-addr we reserve per swap; for inbound (non-ZEC
   *  source) this is the user's external chain address (refund destination). */
  sourceAddress: string;
  /** Destination-chain wallet address. For outbound this is the user's
   *  external address; for inbound it is the wallet-side ephemeral t-addr. */
  destinationAddress: string;
  /** Slippage tolerance in basis points. Defaults to 100 (1%) at SwapKit. */
  slippageBps?: number;
};

export type QuoteResult = {
  routes: RouteOptionType[];
  rawResponse: QuoteResponseType;
};

export type CommitRouteArgs = {
  quoteInput: QuoteInput;
  chosenRoute: RouteOptionType;
  direction: SwapDirectionEnum;
  fiatValueBasis: FiatValueBasisType;
};

export type CommitRouteResult = {
  record: SwapRecordType;
  instructions: DepositInstructionsType;
};

export type MarkBroadcastedArgs = {
  /** Locally-minted primary key returned by `commitRoute` on the record. */
  recordId: string;
  /** Deposit tx hash the provider observes. For a ZIP-320 two-hop send
   *  this is the LAST tx of the proposal (ephemeral → vault), not the
   *  shielded → ephemeral hop. */
  txId: string;
  /** Optional full list of broadcast txids in chronological order, when
   *  the proposal produced more than one tx. Persisted on the record so
   *  the activity history can render the full chronology later. Single-hop
   *  callers can omit this. */
  allTxIds?: string[];
};

export type SetObservedDepositTxHashArgs = {
  /** Locally-minted primary key returned by `commitRoute` on the record. */
  recordId: string;
  /** Source-chain tx hash the user pasted after paying the deposit from
   *  their external wallet. For Maya/THORChain inbound the provider keys
   *  `/track` observations by this hash, so until it lands on the record
   *  the poller has nothing to query. Format validation is intentionally
   *  loose here — SwapKit returns the authoritative error on /track. */
  hash: string;
};

export class SwapService {
  private readonly client: SwapKitClient;
  private readonly registry: ProviderRegistry;
  private readonly store: typeof SwapStore;
  private readonly poller: SwapPoller;
  private readonly tokenCatalog: TokenCatalog;

  constructor(args: SwapServiceArgs) {
    this.client = args.client;
    this.registry = args.registry;
    this.store = args.store;
    this.poller = args.poller;
    this.tokenCatalog = args.tokenCatalog;
  }

  /**
   * Return the ZEC-pairable token catalog. Cached on first success for the
   * lifetime of the session; UI screens can call this on every mount without
   * triggering a refetch.
   */
  async listTokens() {
    return this.tokenCatalog.listTokens();
  }

  /**
   * Routability-filtered token list. Delegates to TokenCatalog which
   * intersects the full catalog with SwapKit's `/swapTo` (outbound) or
   * `/swapFrom` (inbound) snapshot fetched once per session. Falls back
   * to the full list when the routability fetch failed.
   */
  async listRoutableTokens(
    direction: 'outbound' | 'inbound',
  ): Promise<TokenEntryType[]> {
    return this.tokenCatalog.listRoutableTokens(direction);
  }

  /** Drop the cached token list. Next `listTokens()` will refetch. */
  invalidateTokenCatalog() {
    this.tokenCatalog.invalidate();
  }

  /**
   * Canonical chain badge logo URI for the given chain code (e.g. `"BASE"`
   * resolves to the URL SwapKit hosts for the BASE native token, currently
   * `…/base.eth.png`). Returns `undefined` when the catalog has not been
   * fetched yet — UI consumers should fall back to a no-badge render in
   * that case rather than synthesise a URL by hand.
   */
  chainLogoUri(chain: string): string | undefined {
    return this.tokenCatalog.chainLogoUri(chain);
  }

  async quote(input: QuoteInput): Promise<QuoteResult> {
    // SwapKit applies the affiliate identifier and fee tier server-side based
    // on the API key, so we do not pass affiliate params explicitly. Trusting
    // the dashboard is intentional: passing stale values from the repo would
    // override the live config and silently break revenue capture.
    const response = await this.client.quote({
      sellAsset: input.sellAsset.swapKitId,
      buyAsset: input.receiveAsset.swapKitId,
      sellAmount: input.sellAmountHumanDecimal,
      sourceAddress: input.sourceAddress,
      destinationAddress: input.destinationAddress,
      // SwapKit expects slippage as a percentage number (e.g. `2` for 2%),
      // not basis points and not a string.
      slippage:
        input.slippageBps !== undefined ? input.slippageBps / 100 : undefined,
    });

    const routes = (response.routes ?? [])
      .map(route =>
        toRouteOption(
          route,
          input.sellAsset.swapKitId,
          input.receiveAsset.swapKitId,
          input.sellAmountHumanDecimal,
        ),
      )
      .filter((route): route is RouteOptionType => route !== null)
      .filter(route => this.registry.has(route.provider));

    return { routes, rawResponse: response };
  }

  async commitRoute(args: CommitRouteArgs): Promise<CommitRouteResult> {
    const { quoteInput, chosenRoute, direction, fiatValueBasis } = args;
    const executor = this.registry.get(chosenRoute.provider);

    const swapResponse = await this.client.swap({
      routeId: chosenRoute.routeId,
      sourceAddress: quoteInput.sourceAddress,
      destinationAddress: quoteInput.destinationAddress,
    });

    const instructions = executor.extractDepositInstructions({
      swapResponse,
      sellAsset: quoteInput.sellAsset,
      receiveAsset: quoteInput.receiveAsset,
      sellAmountHumanDecimal: quoteInput.sellAmountHumanDecimal,
      destinationAddress: quoteInput.destinationAddress,
      sourceAddress: quoteInput.sourceAddress,
    });

    const now = Date.now();
    const initialStatus =
      direction === SwapDirectionEnum.Outbound
        ? SwapStatusEnum.PendingDeposit
        : SwapStatusEnum.AwaitingExternalDeposit;

    const record: SwapRecordType = {
      recordId: await mintUniqueRecordId(this.store),
      depositAddress: instructions.depositAddress,
      provider: chosenRoute.provider,
      direction,
      routeId: chosenRoute.routeId,
      sellAsset: quoteInput.sellAsset,
      receiveAsset: quoteInput.receiveAsset,
      sellAmountHumanDecimal: quoteInput.sellAmountHumanDecimal,
      expectedReceiveAmount: chosenRoute.expectedReceiveAmount,
      minReceiveAmount: chosenRoute.minReceiveAmount,
      totalFeesInReceiveAsset: chosenRoute.totalFeesInReceiveAsset,
      feesRaw: chosenRoute.feesRaw,
      destinationAddress: quoteInput.destinationAddress,
      sourceAddress: quoteInput.sourceAddress,
      status: initialStatus,
      providerData: instructions.providerData,
      broadcast:
        direction === SwapDirectionEnum.Outbound
          ? { status: BroadcastStatusEnum.PendingBroadcast }
          : undefined,
      fiatValueBasis,
      createdAtMs: now,
      updatedAtMs: now,
    };

    await this.store.upsert(record);
    // A new non-terminal record exists; ensure the poller is awake. `start()`
    // is idempotent so this is a no-op if it is already running.
    this.poller.start();
    return { record, instructions };
  }

  async markBroadcasted(args: MarkBroadcastedArgs): Promise<SwapRecordType> {
    const { recordId, txId, allTxIds } = args;
    const record = await this.store.getByRecordId(recordId);
    if (!record) {
      throw new Error(`SwapService.markBroadcasted: no record for ${recordId}`);
    }
    if (record.direction !== SwapDirectionEnum.Outbound) {
      throw new Error(
        `SwapService.markBroadcasted: not an outbound record (${recordId})`,
      );
    }
    const now = Date.now();
    const updated: SwapRecordType = {
      ...record,
      status: SwapStatusEnum.Pending,
      broadcast: {
        status: BroadcastStatusEnum.Broadcasted,
        txId,
        // Default to `[txId]` when the caller did not supply the full
        // list — keeps the schema invariant `txId === allTxIds.at(-1)`
        // even for single-hop sends so downstream readers can rely on it.
        allTxIds: allTxIds ?? [txId],
        broadcastedAtMs: now,
      },
      updatedAtMs: now,
    };
    await this.store.upsert(updated);
    // Status transitioned from PendingDeposit to Pending; the poller now has
    // something concrete to track. Idempotent.
    this.poller.start();
    return updated;
  }

  /**
   * Inbound counterpart to `markBroadcasted`: the user has paid the deposit
   * from an external wallet (Maya/THORChain inbound flow) and pasted the
   * source-chain tx hash they got from that wallet. Persist it so the poller
   * can switch from "no hash → skip" to `/track?hash=…&chainId=…` and start
   * surfacing the swap's real progress.
   *
   * Why this exists rather than reusing `markBroadcasted`: that method
   * rejects non-outbound records and writes to the `broadcast` block, which
   * is reserved for our own zingolib broadcasts. Inbound has no broadcast
   * block — the user paid from outside — so we use the inbound-only
   * `observedDepositTxHash` slot that `buildTrackParams` already reads.
   *
   * Status transitions PendingDeposit / AwaitingExternalDeposit → Pending so
   * the History row stops showing "awaiting external" and starts showing
   * "swapping" as soon as the user confirms they paid; the poller then
   * promotes it to `Processing`/`Completed` based on `/track` responses.
   */
  async setObservedDepositTxHash(
    args: SetObservedDepositTxHashArgs,
  ): Promise<SwapRecordType> {
    const { recordId, hash } = args;
    const record = await this.store.getByRecordId(recordId);
    if (!record) {
      throw new Error(
        `SwapService.setObservedDepositTxHash: no record for ${recordId}`,
      );
    }
    if (record.direction !== SwapDirectionEnum.Inbound) {
      throw new Error(
        `SwapService.setObservedDepositTxHash: not an inbound record (${recordId})`,
      );
    }
    const now = Date.now();
    const updated: SwapRecordType = {
      ...record,
      observedDepositTxHash: hash,
      status: SwapStatusEnum.Pending,
      updatedAtMs: now,
    };
    await this.store.upsert(updated);
    // The poller previously short-circuited this record (Maya/THORChain
    // inbound with no hash); now it has a hash to query. Fire one immediate
    // tick instead of waiting for the idle interval so the History flips
    // to a real provider-reported status in seconds, not minutes.
    this.poller.tickOnce().catch(() => {
      // tickOnce already logs internally; we intentionally don't await.
    });
    return updated;
  }

  async listRecords(): Promise<SwapRecordType[]> {
    return this.store.readAll();
  }

  async getRecord(recordId: string): Promise<SwapRecordType | undefined> {
    return this.store.getByRecordId(recordId);
  }

  async forceRefresh(): Promise<void> {
    await this.poller.tickOnce();
  }

  /**
   * True when there is at least one outbound swap whose deposit tx we have
   * broadcast and that has not yet reached a terminal status. Consumed by the
   * account-deletion guard so we can warn the user before wiping data while a
   * swap deposit is still in flight on-chain.
   */
  async hasInflightDeposits(): Promise<boolean> {
    const all = await this.store.readAll();
    return all.some(
      r =>
        r.direction === SwapDirectionEnum.Outbound &&
        !isTerminalStatus(r.status) &&
        r.broadcast?.status === BroadcastStatusEnum.Broadcasted,
    );
  }

  startPolling(): void {
    this.poller.start();
  }

  stopPolling(): void {
    this.poller.stop();
  }
}

/**
 * Project a `QuoteRouteType` (wire shape) into the UI-facing
 * `RouteOptionType`. Returns `null` when the route has no usable provider
 * identifier — those are filtered out by `quote()` callers.
 *
 * `quoteId` lives on the top-level `/v3/quote` response (not per-route); we
 * pass it in so every projected `RouteOption` carries the value `/v3/swap`
 * later needs.
 *
 * The provider string is cast to the enum; if SwapKit returns a value we have
 * not modelled, the downstream registry-membership filter will drop it.
 */
function toRouteOption(
  route: QuoteRouteType,
  sellAssetId: string,
  receiveAssetId: string,
  sellAmountHumanDecimal: string,
): RouteOptionType | null {
  const providerString = route.providers?.[0];
  if (!providerString) return null;
  // Without a per-route id we cannot commit the route through `/v3/swap` —
  // drop the entry rather than carry it forward and fail at commit time.
  if (!route.routeId) return null;
  const provider = providerString as SwapKitProviderEnum;
  const estimatedSecondsTotal = route.estimatedTime?.total;
  const expirationSecs = route.expiration ? Number(route.expiration) : NaN;

  // Fee aggregation. SwapKit returns `route.fees[]` mixing currencies — Maya
  // tends to denominate most fees in the destination asset, NEAR Intents
  // denominates almost everything in the source asset (`inbound`,
  // `affiliate`, `service`). Showing only the destination-asset slice would
  // render `0.0000 NEAR` and a dashed bridge-fee line for swaps where the
  // user is in fact paying real, non-zero fees on the source side.
  //
  // To keep the UI honest with a single headline number, we re-express
  // every fee in the destination asset by converting source-asset fees
  // through the route's own implied rate (`expectedBuyAmount /
  // sellAmount`). The rate is route-specific, so the conversion uses the
  // same slippage assumption the route is offering — no separate price
  // oracle, no cross-route bleed.
  const fees = route.fees ?? [];
  const sellAmountNum = parseFloat(sellAmountHumanDecimal);
  const buyAmountNum = parseFloat(route.expectedBuyAmount);
  // Receive-per-sell rate. Falls back to `undefined` when either side is
  // zero / NaN; in that case source-asset fees are dropped from the
  // destination-asset aggregates rather than silently amplified.
  const receivePerSellRate =
    Number.isFinite(sellAmountNum) &&
    Number.isFinite(buyAmountNum) &&
    sellAmountNum > 0
      ? buyAmountNum / sellAmountNum
      : undefined;

  const convertToReceive = (
    amount: number,
    asset: string | undefined,
  ): number => {
    if (asset === receiveAssetId) return amount;
    if (asset === sellAssetId && receivePerSellRate !== undefined) {
      return amount * receivePerSellRate;
    }
    return 0;
  };
  const convertToSell = (amount: number, asset: string | undefined): number => {
    if (asset === sellAssetId) return amount;
    if (
      asset === receiveAssetId &&
      receivePerSellRate !== undefined &&
      receivePerSellRate > 0
    ) {
      return amount / receivePerSellRate;
    }
    return 0;
  };

  const totalFeesInReceiveAsset = sumConverted(
    fees,
    () => true,
    convertToReceive,
  );
  const bridgeFeesInReceiveAsset = sumConverted(
    fees,
    f => f.type === 'affiliate' || f.type === 'service',
    convertToReceive,
  );
  const totalFeesInSellAsset = sumConverted(fees, () => true, convertToSell);
  const bridgeFeesInSellAsset = sumConverted(
    fees,
    f => f.type === 'affiliate' || f.type === 'service',
    convertToSell,
  );

  // Tags live under `route.meta.tags` (e.g. ["RECOMMENDED", "FASTEST",
  // "CHEAPEST"]). `meta` is typed as `Record<string, unknown>` so we project
  // defensively — anything that isn't an array of strings is dropped.
  const rawTags = (route.meta as Record<string, unknown> | undefined)?.tags;
  const tags: ReadonlyArray<string> | undefined =
    Array.isArray(rawTags) && rawTags.every(t => typeof t === 'string')
      ? (rawTags as string[])
      : undefined;

  return {
    routeId: route.routeId,
    provider,
    expectedReceiveAmount: route.expectedBuyAmount,
    minReceiveAmount:
      route.expectedBuyAmountMaxSlippage ?? route.expectedBuyAmount,
    totalFeesInReceiveAsset,
    bridgeFeesInReceiveAsset,
    totalFeesInSellAsset,
    bridgeFeesInSellAsset,
    feesRaw: route.fees,
    estimatedTimeText:
      estimatedSecondsTotal !== undefined
        ? `~${Math.max(1, Math.ceil(estimatedSecondsTotal / 60))} min`
        : undefined,
    expiresAtMs: Number.isFinite(expirationSecs)
      ? expirationSecs * 1000
      : undefined,
    warningsText:
      route.warnings && route.warnings.length > 0
        ? route.warnings.join('; ')
        : undefined,
    tags,
  };
}

/**
 * Sum every fee that matches `predicate`, converting each amount into the
 * destination asset via the caller-supplied `convert` projection. Returns the
 * canonical short decimal string used elsewhere in this module.
 *
 * The conversion lambda is provided by `toRouteOption` and encapsulates the
 * route's own implied rate; we keep it as a callback rather than passing the
 * rate plus assets directly so this helper stays agnostic to which asset is
 * the destination and doesn't have to know about source/receive ids itself.
 */
function sumConverted(
  fees: ReadonlyArray<{ type?: string; amount?: string; asset?: string }>,
  predicate: (fee: {
    type?: string;
    amount?: string;
    asset?: string;
  }) => boolean,
  convert: (amount: number, asset: string | undefined) => number,
): string {
  const total = fees.filter(predicate).reduce((acc, fee) => {
    const amount = parseFloat(fee.amount ?? '0');
    if (!Number.isFinite(amount) || amount === 0) return acc;
    return acc + convert(amount, fee.asset);
  }, 0);
  if (total === 0) return '0';
  return Number(total.toPrecision(12)).toString();
}

/**
 * Production factory. Builds the REST client (mainnet-only constructor guard
 * is inside `SwapKitClient`), the default registry, the persistence binding,
 * and the poller; returns a ready-to-use service.
 *
 * `registry` is overridable for tests.
 */
export function createSwapService(args: {
  apiKey: string;
  chainName: ChainNameEnum;
  registry?: ProviderRegistry;
}): SwapService {
  const client = new SwapKitClient({
    apiKey: args.apiKey,
    chainName: args.chainName,
  });
  const registry = args.registry ?? createDefaultProviderRegistry();
  const store = SwapStore;
  const midgardClient = new MidgardClient();
  const poller = new SwapPoller({ client, registry, store, midgardClient });
  const tokenCatalog = new TokenCatalog(client);
  return new SwapService({ client, registry, store, poller, tokenCatalog });
}

/**
 * Generate a short, locally-unique `recordId`. Format: base36 timestamp +
 * `-` + 8 base36 random characters (e.g. `lj9zk0a8-q3f2hl0p`). Random is
 * intentionally non-cryptographic — this id is the local primary key, not
 * a credential. The collision-avoidance loop guarantees uniqueness within
 * the store even on the astronomically unlikely overlap.
 *
 * The loop reads the store on every retry rather than caching the
 * already-seen ids because mint happens at commit time, not in a hot path,
 * so the I/O cost is negligible. Capped at 50 attempts — far beyond
 * anything plausible — so a bug that breaks the collision check throws
 * loudly instead of looping forever.
 */
async function mintUniqueRecordId(store: typeof SwapStore): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate =
      Date.now().toString(36) +
      '-' +
      Math.random().toString(36).slice(2, 10).padStart(8, '0');
    const existing = await store.getByRecordId(candidate);
    if (!existing) return candidate;
  }
  throw new Error(
    'SwapService.mintUniqueRecordId: 50 consecutive collisions — refusing to loop. Inspect SwapStore for corruption.',
  );
}
