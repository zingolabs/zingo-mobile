import { ChainNameEnum } from './enums/ChainNameEnum';
import { MidgardClient, findSwapByInboundHash } from './MidgardClient';
import { SwapKitClient } from './SwapKitClient';
import { SwapPoller, buildTrackParams } from './SwapPoller';
import type { TrackResponseType } from './types/TrackResponseType';
import { SwapStore } from './SwapStore';
import { TokenCatalog } from './TokenCatalog';
import { BroadcastStatusEnum } from './enums/BroadcastStatusEnum';
import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapErrorCategoryEnum } from './enums/SwapErrorCategoryEnum';
import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import {
  fetchMayaShieldedMemoTarget,
  shieldedMemoAddressFromSwap,
} from './mayaShieldedMemo';
import { lacksDelivery } from './deliveryWatch';
import { SwapStatusEnum, isTerminalStatus } from './enums/SwapStatusEnum';
import { DEPOSIT_WAIT_MS } from './depositDeadline';
import { isTokenAsset } from './depositGuidance';
import { hasDepositEvidence } from './depositEvidence';
import { SwapKitError } from './errors';
import { awaitsPayout, claimPayout } from './payoutNotes';
import type { PayoutNoteType } from './payoutNotes';
import { awaitsRefund, claimRefund, paidIn } from './refundNotes';
import type { RefundNoteType } from './refundNotes';
import { awaitsSaleDeposit, claimSaleDeposit, paysSale } from './saleDeposits';
import type { SentPaymentType } from './saleDeposits';
import { isMemoTooLong, paysPurchaseShielded } from './shieldedPurchase';
import type { SwapResponseType } from './types/SwapResponseType';
import {
  ProviderRegistry,
  createDefaultProviderRegistry,
} from './providers/ProviderRegistry';
import { TRACK_CAPTURE_VERSION } from './providers/trackUpdateBase';
import { DepositInstructionsType } from './types/DepositInstructionsType';
import { FiatValueBasisType } from './types/FiatValueBasisType';
import { QuoteResponseType, QuoteRouteType } from './types/QuoteResponseType';
import { RouteOptionType } from './types/RouteOptionType';
import { SwapAssetType } from './types/SwapAssetType';
import { SwapRecordType } from './types/SwapRecordType';
import { TokenEntryType } from './types/TokensResponseType';
import { isThorchainFamily } from './thorchainFamily';
import { unavailableProviders } from './unavailableProviders';
import type { UnavailableProviderType } from './unavailableProviders';

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
 *   - `markDepositSent(args)` — keep the moment the user said an inbound
 *     deposit was sent.
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
  /**
   * A new unified address of this wallet with a Sapling receiver, one per
   * purchase: Maya pays it with an all-zero OVK, which anyone can decrypt,
   * so a shared one would tie every purchase together.
   */
  newShieldedAddress?: () => Promise<string>;
  /** Midgard's swap for a source-chain hash; the real lookup unless a test swaps it. */
  findSwapByInboundHash?: typeof findSwapByInboundHash;
  /** Flashnet's explorer, for the backfill; see `SwapPollerArgs`. */
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
  /**
   * The providers this app supports that returned no route, with what they
   * said about why. Reported alongside the routes rather than only when there
   * are none, because "one provider answered and two did not" is the case the
   * user cannot otherwise account for.
   */
  unavailable: UnavailableProviderType[];
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

export type MarkDepositSentArgs = {
  /** Locally-minted primary key returned by `commitRoute` on the record. */
  recordId: string;
};

export class SwapService {
  private readonly client: SwapKitClient;
  private readonly registry: ProviderRegistry;
  private readonly store: typeof SwapStore;
  private readonly poller: SwapPoller;
  private readonly tokenCatalog: TokenCatalog;
  private readonly newShieldedAddress?: () => Promise<string>;
  private readonly findSwapByInboundHash: typeof findSwapByInboundHash;

  /** Finished swaps already asked about this session. */
  private readonly backfillAttempted = new Set<string>();

  constructor(args: SwapServiceArgs) {
    this.client = args.client;
    this.registry = args.registry;
    this.store = args.store;
    this.poller = args.poller;
    this.tokenCatalog = args.tokenCatalog;
    this.newShieldedAddress = args.newShieldedAddress;
    this.findSwapByInboundHash =
      args.findSwapByInboundHash ?? findSwapByInboundHash;
  }

  /**
   * Return the ZEC-pairable token catalog. Cached on first success for the
   * lifetime of the session; UI screens can call this on every mount without
   * triggering a refetch.
   */
  /**
   * The USD price of one coin, before any quote of it: `null` when SwapKit
   * gives none or answers in a shape this does not read, and the screen
   * then waits for the coin's first quote, as before.
   */
  async usdPrice(swapKitId: string): Promise<number | null> {
    const answer = await this.client.price([swapKitId]);
    const rows: Array<Record<string, unknown>> = Array.isArray(answer)
      ? answer
      : [];
    const row =
      rows.find(
        r =>
          typeof r?.identifier === 'string' &&
          r.identifier.toUpperCase() === swapKitId.toUpperCase(),
      ) ?? (rows.length === 1 ? rows[0] : undefined);
    const value = Number(row?.price_usd ?? row?.priceUsd ?? row?.price);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

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

  /** The chains that swap with ZEC either way (see TokenCatalog.routableChains). */
  async routableChains(): Promise<Set<string> | null> {
    return this.tokenCatalog.routableChains();
  }

  /** Drop the cached token list. Next `listTokens()` will refetch. */
  invalidateTokenCatalog() {
    this.tokenCatalog.invalidate();
  }

  async quote(input: QuoteInput): Promise<QuoteResult> {
    // SwapKit applies the affiliate identifier and fee tier server-side based
    // on the API key, so we do not pass affiliate params explicitly. Trusting
    // the dashboard is intentional: passing stale values from the repo would
    // override the live config and silently break revenue capture.
    let response: QuoteResponseType;
    try {
      response = await this.client.quote({
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
    } catch (error) {
      // SwapKit says "no route" two ways: 200 with an empty `routes[]` beside a
      // `providerErrors[]`, and 404 with `noRoutesFound`. Both are answers
      // about the market rather than faults, and only the first reached the
      // screen as one — the second arrived as a raw HTTP error, which reads
      // like a broken wallet to someone whose amount was merely too small.
      // Normalising here leaves the caller one shape to render. Anything else
      // still throws.
      const asEmptyQuote = emptyQuoteFromNoRouteError(error);
      if (!asEmptyQuote) throw error;
      return {
        routes: [],
        unavailable: this.describeUnavailable(asEmptyQuote, [], input),
        rawResponse: asEmptyQuote,
      };
    }

    const projected = (response.routes ?? [])
      .map(route =>
        toRouteOption(
          route,
          input.sellAsset.swapKitId,
          input.receiveAsset.swapKitId,
          input.sellAmountHumanDecimal,
        ),
      )
      .filter((route): route is RouteOptionType => route !== null);

    // Paid with a token from another wallet, a Maya or THORChain route cannot
    // be taken: their memo travels only through the router contract, which no
    // wallet's Send calls, and a plain transfer to the vault is neither seen
    // nor refunded (65 USDT were lost that way on 2026-11-10).
    const tokenMemoRoutes = isTokenAsset(input.sellAsset)
      ? projected.filter(route => isThorchainFamily(route.provider))
      : [];
    const offered = projected.filter(route => !tokenMemoRoutes.includes(route));
    // Split rather than filtered: a route through a provider with no executor
    // is a real offer this app cannot take, and dropping it without a trace is
    // indistinguishable on screen from the provider never having answered.
    const routes = offered.filter(route => this.registry.has(route.provider));
    const unsupportedRoutes = offered.filter(
      route => !this.registry.has(route.provider),
    );

    return {
      routes,
      unavailable: this.describeUnavailable(
        response,
        routes,
        input,
        unsupportedRoutes,
        tokenMemoRoutes,
      ),
      rawResponse: response,
    };
  }

  private describeUnavailable(
    response: QuoteResponseType,
    routes: readonly RouteOptionType[],
    input: QuoteInput,
    unsupportedRoutes: readonly RouteOptionType[] = [],
    tokenMemoRoutes: readonly RouteOptionType[] = [],
  ): UnavailableProviderType[] {
    return unavailableProviders({
      response,
      supported: this.registry.supportedProviders(),
      routes,
      unsupportedRoutes,
      tokenMemoRoutes,
      sellAssetTicker: input.sellAsset.ticker,
    });
  }

  async commitRoute(args: CommitRouteArgs): Promise<CommitRouteResult> {
    const { quoteInput, chosenRoute, direction, fiatValueBasis } = args;
    const executor = this.registry.get(chosenRoute.provider);

    const { swapResponse, destinationAddress } =
      await this.swapToDestination(args);

    // Maya may take the memo in a shielded note: SwapKit names the address
    // for a shielded source, and mayanode says whether it is on for the vault.
    const shieldedMemoTarget =
      chosenRoute.provider === SwapKitProviderEnum.MayachainStreaming &&
      quoteInput.sellAsset.chain === 'ZEC'
        ? await fetchMayaShieldedMemoTarget()
        : null;
    const namedBySwapKit = shieldedMemoAddressFromSwap(swapResponse);
    /** A shielded memo has room for a unified address: the refund comes back shielded. */
    const shieldedRefund =
      shieldedMemoTarget && this.newShieldedAddress
        ? await this.newShieldedAddress().catch(error => {
            console.error(
              `SwapService: no shielded address for the refund ${error}`,
            );
            return undefined;
          })
        : undefined;

    const instructions = executor.extractDepositInstructions({
      swapResponse,
      shieldedMemoTarget:
        shieldedMemoTarget && namedBySwapKit
          ? { ...shieldedMemoTarget, unifiedAddress: namedBySwapKit }
          : shieldedMemoTarget,
      sellAsset: quoteInput.sellAsset,
      receiveAsset: quoteInput.receiveAsset,
      sellAmountHumanDecimal: quoteInput.sellAmountHumanDecimal,
      destinationAddress,
      sourceAddress: shieldedRefund ?? quoteInput.sourceAddress,
    });
    const refundAddress =
      shieldedRefund && instructions.shieldedMemoAddress
        ? shieldedRefund
        : undefined;

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
      swapKitInternalId: swapResponse.swapId ?? swapResponse.transient?.swapId,
      sellAsset: quoteInput.sellAsset,
      receiveAsset: quoteInput.receiveAsset,
      sellAmountHumanDecimal: quoteInput.sellAmountHumanDecimal,
      expectedReceiveAmount: chosenRoute.expectedReceiveAmount,
      minReceiveAmount: chosenRoute.minReceiveAmount,
      totalFeesInReceiveAsset: chosenRoute.totalFeesInReceiveAsset,
      feesRaw: chosenRoute.feesRaw,
      destinationAddress,
      sourceAddress: quoteInput.sourceAddress,
      refundAddress,
      requestedSlippageBps: quoteInput.slippageBps,
      status: initialStatus,
      depositDeadlineMs:
        direction === SwapDirectionEnum.Inbound
          ? now + DEPOSIT_WAIT_MS
          : undefined,
      quoteExpiresAtMs: chosenRoute.expiresAtMs,
      providerData: instructions.providerData,
      depositFromSourceAddress:
        direction === SwapDirectionEnum.Outbound
          ? !!instructions.requiresDepositFromSourceAddress
          : undefined,
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

  /**
   * Builds the order. A purchase Maya can pay shielded goes to a new unified
   * address: the route quoted to the transparent one takes it at `/v3/swap`.
   * Where its memo would not fit, or no address could be made, the order
   * keeps the transparent destination it was quoted with.
   */
  private async swapToDestination(
    args: CommitRouteArgs,
  ): Promise<{ swapResponse: SwapResponseType; destinationAddress: string }> {
    const { quoteInput, chosenRoute, direction } = args;
    const order = (destinationAddress: string) =>
      this.client.swap({
        routeId: chosenRoute.routeId,
        sourceAddress: quoteInput.sourceAddress,
        destinationAddress,
      });
    const shielded =
      this.newShieldedAddress &&
      paysPurchaseShielded({
        provider: chosenRoute.provider,
        direction,
        sellChain: quoteInput.sellAsset.chain,
      })
        ? await this.newShieldedAddress().catch(error => {
            console.error(
              `SwapService: no shielded address for the purchase ${error}`,
            );
            return undefined;
          })
        : undefined;
    if (shielded) {
      try {
        return {
          swapResponse: await order(shielded),
          destinationAddress: shielded,
        };
      } catch (error) {
        if (!isMemoTooLong(error)) throw error;
      }
    }
    return {
      swapResponse: await order(quoteInput.destinationAddress),
      destinationAddress: quoteInput.destinationAddress,
    };
  }

  /**
   * The deposit's first transaction, the deshield, went out and the second
   * did not. The record keeps the deshield's txid, so a retry knows the
   * held deposit is this sale's, and stays pending until the resumed
   * deposit is marked broadcast.
   */
  async markDeshielded(args: {
    recordId: string;
    deshieldTxId: string;
  }): Promise<SwapRecordType> {
    const updated = await this.store.update(args.recordId, current => ({
      ...current,
      broadcast: {
        status: BroadcastStatusEnum.PendingBroadcast,
        allTxIds: [args.deshieldTxId],
      },
      updatedAtMs: Date.now(),
    }));
    if (!updated) {
      throw new Error(
        `SwapService.markDeshielded: no record for ${args.recordId}`,
      );
    }
    return updated;
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
    const updated = await this.store.update(recordId, current => ({
      ...current,
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
    }));
    if (!updated) {
      throw new Error(`SwapService.markBroadcasted: no record for ${recordId}`);
    }
    // Status transitioned from PendingDeposit to Pending; the poller now has
    // something concrete to track. Idempotent.
    this.poller.start();
    return updated;
  }

  /**
   * The user says the inbound deposit left their other wallet. The record
   * keeps the moment; the status moves only when the provider sees the
   * deposit, and the deadline keeps running either way. Idempotent.
   */
  async markDepositSent(args: MarkDepositSentArgs): Promise<SwapRecordType> {
    const { recordId } = args;
    const record = await this.store.getByRecordId(recordId);
    if (!record) {
      throw new Error(`SwapService.markDepositSent: no record for ${recordId}`);
    }
    if (record.direction !== SwapDirectionEnum.Inbound) {
      throw new Error(
        `SwapService.markDepositSent: not an inbound record (${recordId})`,
      );
    }
    if (record.depositSentAtMs !== undefined) {
      return record;
    }
    const now = Date.now();
    const updated = await this.store.update(recordId, current => ({
      ...current,
      depositSentAtMs: now,
      updatedAtMs: now,
    }));
    if (!updated) {
      throw new Error(`SwapService.markDepositSent: no record for ${recordId}`);
    }
    const wasRunning = this.poller.isRunning();
    this.poller.start();
    if (wasRunning) {
      this.poller.tickOnce().catch(() => {});
    }
    return updated;
  }

  /**
   * Ties each payout the wallet received to the purchase it settles. The
   * memo names the deposit's hash, Midgard names the swap that hash started,
   * and the purchase whose memo is that swap's is the one. It is complete
   * with the ZEC that arrived, without waiting on Midgard to index the payout
   * under the destination or on `/track` to report it. Resolves to the
   * payouts settled, tied to a purchase or known to be no purchase's; the
   * rest may be tied on a later call.
   */
  async claimPayouts(notes: readonly PayoutNoteType[]): Promise<string[]> {
    const settled: string[] = [];
    for (const note of notes) {
      const records = await this.store.readAll();
      if (records.some(r => r.destinationTxHash === note.txid)) {
        settled.push(note.txid);
        continue;
      }
      const waiting = records.filter(awaitsPayout);
      const providers = [...new Set(waiting.map(r => r.provider))];
      for (const provider of providers) {
        const swap = await this.findSwapByInboundHash({
          inboundHash: note.inboundHash,
          provider,
        });
        const record =
          swap &&
          waiting.find(
            r =>
              r.provider === provider &&
              (r.providerData as { memo?: string }).memo === swap.memo,
          );
        if (!record) {
          // Midgard knows the swap and no purchase here is it: a payout of a
          // swap this wallet no longer keeps, never one to ask about again.
          if (swap) {
            settled.push(note.txid);
            break;
          }
          continue;
        }
        await this.store.update(record.recordId, current =>
          awaitsPayout(current)
            ? claimPayout(current, note, Date.now())
            : current,
        );
        settled.push(note.txid);
        break;
      }
    }
    return settled;
  }

  /**
   * Ties each refund the wallet received to the sale whose deposit it names.
   * The memo carries the wallet's own deposit txid, so no provider is asked.
   * Resolves to the refunds settled, tied to a sale or known to be no sale's.
   */
  async claimRefunds(notes: readonly RefundNoteType[]): Promise<string[]> {
    const settled: string[] = [];
    for (const note of notes) {
      const records = await this.store.readAll();
      const record = records.find(
        r => awaitsRefund(r) && paidIn(r, note.depositTxid),
      );
      if (record) {
        await this.store.update(record.recordId, current =>
          awaitsRefund(current)
            ? claimRefund(current, note, Date.now())
            : current,
        );
      }
      settled.push(note.txid);
    }
    return settled;
  }

  /**
   * Ties each sale whose send reported no deposit to the one the wallet shows
   * leaving: a send that errored after broadcasting, or an app closed before
   * the send returned. Without it the sale offers to pay again. A
   * transaction already tied to a swap is never tied to a second. Resolves to
   * the sales tied.
   */
  async claimSaleDeposits(
    payments: readonly SentPaymentType[],
  ): Promise<string[]> {
    const records = await this.store.readAll();
    const used = new Set(
      records.flatMap(r => [
        ...(r.broadcast?.allTxIds ?? []),
        ...(r.broadcast?.txId ? [r.broadcast.txId] : []),
      ]),
    );
    const waiting = records
      .filter(awaitsSaleDeposit)
      .sort((a, b) => a.createdAtMs - b.createdAtMs);
    const ordered = [...payments].sort((a, b) => a.timeMs - b.timeMs);
    const claimed: string[] = [];
    for (const record of waiting) {
      const payment = ordered.find(
        p => !used.has(p.txid) && paysSale(record, p),
      );
      if (!payment) continue;
      used.add(payment.txid);
      const updated = await this.store.update(record.recordId, current =>
        claimSaleDeposit(current, payment, Date.now()),
      );
      if (updated?.broadcast?.txId === payment.txid) {
        claimed.push(record.recordId);
      }
    }
    if (claimed.length > 0) this.poller.start();
    return claimed;
  }

  async listRecords(): Promise<SwapRecordType[]> {
    return this.store.readAll();
  }

  /**
   * Asks `/track` once more about a finished swap whose record predates
   * something the tracker now keeps, and stores what comes back.
   *
   * The poller drops a swap once it finishes, so without this a swap that
   * finished before a detail was kept never shows it. Called when a swap is
   * shown rather than across the whole history: only what the user looks at
   * is asked about, and each swap at most once a session, whatever the
   * outcome, so stepping back and forth does not repeat a failing request.
   *
   * A Maya or THORChain purchase with no ZEC transaction also asks Midgard,
   * every time it is shown, since that is how a payment `/track` cannot find
   * turns up. What Midgard finds is stored, and earns the `/track` question
   * whatever the record's stamp says. A found payment on an expired purchase
   * reopens it as in progress, and the poller takes over.
   *
   * A finished swap stays finished. `/track` has been seen to answer an old
   * swap in a way that maps to no terminal state, and the history must not
   * reopen a swap on that account, so the status is kept.
   *
   * Resolves to the stored record, or undefined when there was nothing to ask.
   */
  async backfillFinishedRecord(
    recordId: string,
  ): Promise<SwapRecordType | undefined> {
    const stored = await this.store.getByRecordId(recordId);
    if (!stored || !isTerminalStatus(stored.status)) return undefined;
    const found = lacksDelivery(stored)
      ? await this.poller.discoverViaMidgard(stored)
      : null;
    if (
      !found &&
      (this.backfillAttempted.has(recordId) || !needsBackfill(stored))
    )
      return undefined;
    if (!this.registry.has(stored.provider)) return found ?? undefined;
    this.backfillAttempted.add(recordId);
    const record = found ?? stored;

    let response: TrackResponseType;
    try {
      response = await this.client.track(buildTrackParams(record));
    } catch (err) {
      console.log(
        `SwapService: backfill /track failed for ${record.recordId}:`,
        err,
      );
      this.followIfReopened(found);
      return found ?? undefined;
    }

    const executor = this.registry.get(record.provider);
    const updated = await this.store.update(recordId, current => {
      const tracked = executor.applyTrackUpdate(current, response);
      return isTerminalStatus(tracked.status)
        ? tracked
        : {
            ...tracked,
            status: current.status,
            trackingStatus: current.trackingStatus,
            terminalAtMs: current.terminalAtMs,
          };
    });
    this.followIfReopened(updated);
    return updated;
  }

  /**
   * The poller may have stopped with nothing left to ask about, so it starts
   * again for a reopened swap. `start()` ticks when it was stopped; the extra
   * tick is for when it was running all along.
   */
  private followIfReopened(record: SwapRecordType | null | undefined): void {
    if (!record || isTerminalStatus(record.status)) return;
    const wasRunning = this.poller.isRunning();
    this.poller.start();
    if (wasRunning) {
      this.poller.tickOnce().catch(() => {
        // tickOnce already logs internally; we intentionally don't await.
      });
    }
  }

  async getRecord(recordId: string): Promise<SwapRecordType | undefined> {
    return this.store.getByRecordId(recordId);
  }

  async forceRefresh(): Promise<void> {
    await this.poller.tickOnce();
  }

  /**
   * True when at least one swap has a deposit the provider can already see and
   * has not yet settled. Consumed by the delete-wallet guard, which needs to
   * warn before wiping data out from under a swap that is still moving.
   *
   * Both directions count, and the inbound case is the sharper of the two.
   * Outbound means we broadcast a deposit whose payout is still pending:
   * deleting loses the tracking record while the swap itself completes
   * on-chain. Inbound means the user paid from another wallet and the payout
   * is addressed to an ephemeral address of *this* wallet — delete it without
   * the seed written down and the incoming funds go with it.
   *
   * A swap that is merely reserved is deliberately not counted. Nothing has
   * moved, so a stale quote the user abandoned days ago must not stand between
   * them and deleting a wallet.
   *
   * This is wider than the mobile wallet's version, which counts outbound
   * broadcasts only. Mobile's guard sits on a wallet-replacement flow that
   * keeps the seed; zingo-pc's sits on a delete that does not, which is why
   * the inbound half matters here and not there.
   */
  async hasInflightDeposits(): Promise<boolean> {
    const all = await this.store.readAll();
    return all.some(r => !isTerminalStatus(r.status) && hasDepositEvidence(r));
  }

  startPolling(): void {
    this.poller.start();
  }

  stopPolling(): void {
    this.poller.stop();
  }
}

/**
 * Reads a refusal that means "no route" back into the shape a 200 would have
 * carried, so `describeEmptyQuote` can explain it the same way either way.
 *
 * Returns null for everything else. Only the refusal the error classifier
 * already calls `NoQuoteOrLiquidity` takes this path, so a transport failure,
 * a rejected key, or a provider outage still throws and still reaches the user
 * as the fault it is.
 *
 * The body is searched for the same `providerErrors` the 200 shape carries. A
 * 404 that includes them still names the minimum the user needs; one that does
 * not leaves the empty list, and the caller falls back to its generic sentence
 * rather than inventing a figure.
 */
function emptyQuoteFromNoRouteError(error: unknown): QuoteResponseType | null {
  if (!(error instanceof SwapKitError)) return null;
  if (error.category !== SwapErrorCategoryEnum.NoQuoteOrLiquidity) return null;
  return { routes: [], providerErrors: parseProviderErrors(error.body) };
}

function parseProviderErrors(
  body: string | undefined,
): QuoteResponseType['providerErrors'] {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body) as QuoteResponseType;
    return Array.isArray(parsed.providerErrors)
      ? parsed.providerErrors
      : undefined;
  } catch {
    // A body that is not JSON says nothing about minimums. The generic
    // sentence is the honest answer.
    return undefined;
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
    costVsMarketBps:
      typeof route.totalSlippageBps === 'number' &&
      Number.isFinite(route.totalSlippageBps)
        ? route.totalSlippageBps
        : undefined,
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
  newShieldedAddress?: () => Promise<string>;
}): SwapService {
  const client = new SwapKitClient({
    apiKey: args.apiKey,
    chainName: args.chainName,
  });
  const registry = args.registry ?? createDefaultProviderRegistry();
  const store = SwapStore;
  const midgardClient = new MidgardClient();
  // One instance for both, so a hash the poller found is not asked for again
  // when the detail view backfills the same swap.
  const poller = new SwapPoller({ client, registry, store, midgardClient });
  const tokenCatalog = new TokenCatalog(client);
  return new SwapService({
    client,
    registry,
    store,
    poller,
    tokenCatalog,
    newShieldedAddress: args.newShieldedAddress,
  });
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
/**
 * A finished swap with something left to learn: stamped by an older tracker,
 * and paid, so `/track` has a swap to answer about. An abandoned or expired
 * swap that never saw a deposit has none, and asking would only log a failure.
 *
 * Paid is not only a deposit hash on the record: an inbound swap can be known
 * by its order id alone before its deposit hash arrives. A swap the provider
 * completed or refunded was paid, and so was one it took an order for.
 */
function needsBackfill(record: SwapRecordType): boolean {
  if (!isTerminalStatus(record.status)) return false;
  if ((record.trackCaptureVersion ?? 0) >= TRACK_CAPTURE_VERSION) return false;
  return (
    !!(
      record.broadcast?.txId ||
      record.observedDepositTxHash ||
      record.providerOrderId
    ) ||
    record.status === SwapStatusEnum.Completed ||
    record.status === SwapStatusEnum.Refunded
  );
}

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
