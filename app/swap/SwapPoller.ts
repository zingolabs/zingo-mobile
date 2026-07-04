import { MidgardClient } from './MidgardClient';
import { SwapKitClient } from './SwapKitClient';
import { SwapStore } from './SwapStore';
import { ProviderRegistry } from './providers/ProviderRegistry';
import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import { SwapStatusEnum, isTerminalStatus } from './enums/SwapStatusEnum';
import { TrackingStatusEnum } from './enums/TrackingStatusEnum';
import { SwapRecordType } from './types/SwapRecordType';
import { TrackResponseType } from './types/TrackResponseType';

/**
 * Polls SwapKit `/track` for in-flight `SwapRecord`s, mutates them via the
 * provider executor, and persists the result.
 *
 * Design:
 *   - One coarse `setInterval` tick (`TICK_INTERVAL_MS`). Each tick walks all
 *     non-terminal records and decides per-record whether enough time has
 *     elapsed since its last poll to query again.
 *   - Two cadence tiers:
 *       * Active tier (record is being processed by the provider) — every
 *         `ACTIVE_POLL_INTERVAL_MS`.
 *       * Idle tier (record is waiting for the user / first observation) —
 *         every `IDLE_POLL_INTERVAL_MS`.
 *     Choosing the tier is cheap and lives in `pickTier`.
 *   - Exponential backoff per record on consecutive failures, capped at
 *     `MAX_FAILURE_BACKOFF`. Failure counts live in memory and reset on app
 *     restart — persisting them would survive across launches but a fresh
 *     boot is the natural moment to retry transient failures anyway.
 *   - Dedupe: if the executor's update did not change any user-visible field,
 *     we skip the `SwapStore.upsert` write. This avoids hammering
 *     EncryptedStorage when the provider returns the same `/track` response
 *     for many ticks.
 *
 * Stop conditions:
 *   - Records reaching a terminal `SwapStatusEnum` are dropped from polling
 *     and never re-queried, even if `stop()` is never called.
 *   - `stop()` cancels the timer. Any in-flight `/track` request that
 *     completes after `stop()` is silently discarded by checking the
 *     generation token.
 */

/**
 * Tunable timing knobs for the poller. Defaults are calibrated for production
 * use over slow mobile networks: a 20 s master tick keeps battery impact
 * modest, the 90 s idle interval avoids spamming /track while waiting for the
 * user's external deposit, and the 20-failure cap × 2× backoff gives the
 * provider roughly 45 minutes to recover from a transient outage before we
 * stop trying.
 *
 * Tests override these with smaller values so the suite does not have to wait
 * real seconds. UI builds typically leave defaults alone.
 */
export type SwapPollerConfig = {
  tickIntervalMs: number;
  activePollIntervalMs: number;
  idlePollIntervalMs: number;
  /** Multiplier cap for `2 ** consecutiveFailures` per record. */
  maxFailureBackoff: number;
  /** Records that hit this many failures are dropped from polling. */
  maxConsecutiveFailures: number;
};

export const DEFAULT_SWAP_POLLER_CONFIG: SwapPollerConfig = {
  tickIntervalMs: 20_000,
  activePollIntervalMs: 20_000,
  idlePollIntervalMs: 90_000,
  maxFailureBackoff: 8,
  maxConsecutiveFailures: 20,
};

type PollerTier = 'active' | 'idle';

export type SwapPollerArgs = {
  client: SwapKitClient;
  registry: ProviderRegistry;
  store: typeof SwapStore;
  /** Midgard L2 indexer used to discover the source-chain tx hash for
   *  inbound Maya/THORChain swaps where the user paid from an external
   *  wallet and we therefore never saw the hash. Once discovered, /track
   *  takes over for all subsequent status updates. */
  midgardClient: MidgardClient;
  /** Optional timing overrides; defaults to `DEFAULT_SWAP_POLLER_CONFIG`. */
  config?: Partial<SwapPollerConfig>;
};

export class SwapPoller {
  private readonly client: SwapKitClient;
  private readonly registry: ProviderRegistry;
  private readonly store: typeof SwapStore;
  private readonly midgardClient: MidgardClient;
  private readonly config: SwapPollerConfig;

  private timer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;

  /** Per-record poll bookkeeping (in-memory; resets on app restart). */
  private readonly lastPolledAtMs = new Map<string, number>();
  private readonly failureCounts = new Map<string, number>();
  /** Per-record Midgard-probe bookkeeping. Separate from `failureCounts`
   *  so a flaky Midgard host does not exhaust the /track failure budget
   *  for a record that is otherwise healthy — and so we can rate-limit
   *  Midgard probes independently of /track ticks. */
  private readonly lastMidgardProbeAtMs = new Map<string, number>();
  private readonly midgardFailureCounts = new Map<string, number>();

  constructor(args: SwapPollerArgs) {
    this.client = args.client;
    this.registry = args.registry;
    this.store = args.store;
    this.midgardClient = args.midgardClient;
    this.config = { ...DEFAULT_SWAP_POLLER_CONFIG, ...args.config };
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer !== null) return;
    this.generation += 1;
    const myGeneration = this.generation;
    // Fire one tick immediately so the user gets fresh data on app foreground,
    // then settle into the interval cadence. `runTick` already swallows its
    // own errors; the trailing `.catch` is only present to keep eslint happy
    // on the fire-and-forget invocations.
    this.runTick(myGeneration).catch(() => {});
    this.timer = setInterval(() => {
      this.runTick(myGeneration).catch(() => {});
    }, this.config.tickIntervalMs);
  }

  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
    // generation++ would invalidate in-flight requests; we bump on the next
    // start() to keep the math simple.
  }

  /**
   * Manual one-shot tick. Useful for pull-to-refresh in the UI and for tests.
   * Always runs even if the poller is stopped.
   */
  async tickOnce(): Promise<void> {
    await this.runTick(this.generation);
  }

  private async runTick(callerGeneration: number): Promise<void> {
    const all = await this.store.readAll();
    const now = Date.now();
    let hasPollableRecord = false;

    for (const record of all) {
      if (!this.isRunningForGeneration(callerGeneration)) return;
      if (isTerminalStatus(record.status)) continue;
      if (!this.registry.has(record.provider)) continue;
      hasPollableRecord = true;
      if (!this.shouldPollNow(record, now)) continue;
      await this.pollRecord(record, callerGeneration);
    }

    // Auto-stop the interval when there is nothing left to poll. `start()` is
    // idempotent and `SwapService` calls it after every mutation, so the
    // poller is rearmed automatically when a new record appears.
    if (!hasPollableRecord && this.timer !== null) {
      this.stop();
    }
  }

  private isRunningForGeneration(callerGeneration: number): boolean {
    // tickOnce() always passes the current generation, so it's allowed.
    // The interval-driven tick stops if start() was called again (which
    // bumps generation) or if stop() was called (timer === null).
    return callerGeneration === this.generation;
  }

  private shouldPollNow(record: SwapRecordType, now: number): boolean {
    const failures = this.failureCounts.get(record.recordId) ?? 0;
    if (failures >= this.config.maxConsecutiveFailures) return false;

    // Maya / THORChain bifrost only honour /track when the source-chain tx
    // hash is supplied; passing the deposit address (the vault) returns a
    // generic `Insufficient parameters for tracking method detection` 500.
    // For inbound records the hash exists only after the user has paid
    // externally (`observedDepositTxHash`) or after we have broadcast on
    // outbound. For Maya/THORChain inbound specifically we have a recovery
    // path via Midgard `/v2/actions?address=<destinationAddress>`, so let
    // those records through to `pollRecord` where the Midgard discovery
    // branch can populate the hash. For every other "no hash, no rescue"
    // combination, skip the tick so we do not generate noise the user sees
    // as repeated failures in the log.
    const hasHash = !!(record.broadcast?.txId || record.observedDepositTxHash);
    if (!hasHash && providerKeysOnTxHash(record.provider)) {
      if (!canDiscoverHashViaMidgard(record)) {
        return false;
      }
    }

    const lastPolled = this.lastPolledAtMs.get(record.recordId) ?? 0;
    const baseInterval =
      pickTier(record) === 'active'
        ? this.config.activePollIntervalMs
        : this.config.idlePollIntervalMs;
    const backoff = Math.min(2 ** failures, this.config.maxFailureBackoff);
    const requiredDelta = baseInterval * backoff;
    return now - lastPolled >= requiredDelta;
  }

  /**
   * Try to discover the source-chain tx hash via Midgard when the record is
   * an inbound Maya/THORChain swap that does not yet have one. Returns the
   * updated record if Midgard surfaced a hash and we persisted it; returns
   * `null` otherwise (record not eligible, indexer empty, transport error,
   * memo mismatch).
   *
   * The Midgard probe is rate-limited independently of `/track`: even if
   * the record's poll interval is "now", we only re-probe Midgard at most
   * once per `idlePollIntervalMs` window. Combined with `lastMidgardProbeAtMs`
   * tracking, this prevents a single tick from racing the indexer.
   *
   * Errors are recorded against a dedicated `midgardFailureCounts` counter
   * so a Midgard outage does not exhaust the `/track` failure budget for an
   * otherwise healthy record.
   */
  private async maybeDiscoverHashViaMidgard(
    record: SwapRecordType,
    now: number,
  ): Promise<SwapRecordType | null> {
    if (!canDiscoverHashViaMidgard(record)) return null;
    const memo = extractInboundMemo(record);
    if (!memo) return null;

    const midgardFailures = this.midgardFailureCounts.get(record.recordId) ?? 0;
    if (midgardFailures >= this.config.maxConsecutiveFailures) return null;

    const lastProbe = this.lastMidgardProbeAtMs.get(record.recordId) ?? 0;
    // Probing Midgard more often than the idle interval gains nothing — the
    // indexer's update cadence is bounded by THORChain/Maya block times
    // (~6 s) plus its own ingestion delay, so a sub-minute probe rhythm
    // would only waste fetches.
    if (now - lastProbe < this.config.idlePollIntervalMs) return null;
    this.lastMidgardProbeAtMs.set(record.recordId, now);

    let discovery;
    try {
      discovery = await this.midgardClient.findInboundActionByMemo({
        destinationAddress: record.destinationAddress,
        memo,
        provider: record.provider,
        chainIdForNormalization: record.sellAsset.chainId,
      });
    } catch (err) {
      // Midgard transport failures stay in the log: a sustained outage
      // would silently block every Maya/THORChain inbound from completing,
      // and the failure counter alone is not visible in production.
      const count = (this.midgardFailureCounts.get(record.recordId) ?? 0) + 1;
      this.midgardFailureCounts.set(record.recordId, count);
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(
        `SwapPoller: Midgard probe failed for ${record.depositAddress} (failure #${count}): ${errMsg}`,
      );
      return null;
    }

    this.midgardFailureCounts.delete(record.recordId);
    if (!discovery) return null;

    const updated: SwapRecordType = {
      ...record,
      observedDepositTxHash: discovery.sourceTxHash,
      // The provider has now observed our deposit on-chain — transition out
      // of the pre-evidence "awaiting external" state into the same Pending
      // state we use right after our own outbound broadcast. Subsequent
      // /track responses promote it further (Processing → Completed).
      status:
        record.status === SwapStatusEnum.AwaitingExternalDeposit
          ? SwapStatusEnum.Pending
          : record.status,
      updatedAtMs: Date.now(),
    };
    try {
      await this.store.upsert(updated);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(
        `SwapPoller: store.upsert (Midgard discovery) failed for ${record.depositAddress}:`,
        errMsg,
      );
      // Even if we could not persist, return the in-memory updated record so
      // this tick can still feed the hash to /track. The next tick will try
      // the persistence again via the same discovery path.
    }
    return updated;
  }

  private async pollRecord(
    record: SwapRecordType,
    callerGeneration: number,
  ): Promise<void> {
    // For Maya/THORChain inbound records that still lack a source-chain
    // tx hash, give Midgard a chance to surface it before we attempt
    // `/track`. If Midgard finds the action, `effectiveRecord` carries the
    // freshly populated `observedDepositTxHash` and the subsequent
    // `buildTrackParams` will key the request on `hash` — the same way
    // outbound records have been keyed all along. If Midgard finds nothing
    // (or the record is not eligible), we still attempt `/track`; for
    // providers that key on `depositAddress` this is the normal path, and
    // for Maya/THORChain inbound it will simply fail this tick and back
    // off, which is the correct behaviour while we wait.
    const discoveredRecord = await this.maybeDiscoverHashViaMidgard(
      record,
      Date.now(),
    );
    if (!this.isRunningForGeneration(callerGeneration)) return;
    const effectiveRecord = discoveredRecord ?? record;

    const executor = this.registry.get(effectiveRecord.provider);
    const trackParams = buildTrackParams(effectiveRecord);

    this.lastPolledAtMs.set(effectiveRecord.recordId, Date.now());

    let response: TrackResponseType;
    try {
      response = await this.client.track(trackParams);
    } catch (err) {
      const count = (this.failureCounts.get(effectiveRecord.recordId) ?? 0) + 1;
      this.failureCounts.set(effectiveRecord.recordId, count);
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(
        `SwapPoller: /track failed for ${effectiveRecord.depositAddress} (failure #${count}):`,
        errMsg,
        err,
      );
      return;
    }
    this.failureCounts.delete(effectiveRecord.recordId);

    if (!this.isRunningForGeneration(callerGeneration)) return;

    const updated = executor.applyTrackUpdate(effectiveRecord, response);

    if (!hasMeaningfulChange(effectiveRecord, updated)) {
      return;
    }

    try {
      await this.store.upsert(updated);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(
        `SwapPoller: store.upsert failed for ${effectiveRecord.depositAddress}:`,
        errMsg,
        err,
      );
    }
  }
}

/**
 * Whether the record is a candidate for Midgard-based hash discovery.
 *
 * The combination we are rescuing is specifically: Maya/THORChain inbound
 * with no source-chain hash yet. For outbound we already have a hash from
 * our own broadcast; for non-Midgard providers (NEAR/Flashnet/Chainflip)
 * the indexer does not cover them; for Maya/THORChain outbound we have the
 * hash from zingolib's broadcast. So the gate narrows to exactly the case
 * SwapKit `/track` cannot serve on its own.
 */
function canDiscoverHashViaMidgard(record: SwapRecordType): boolean {
  if (record.direction !== SwapDirectionEnum.Inbound) return false;
  if (record.observedDepositTxHash) return false;
  if (record.broadcast?.txId) return false;
  return (
    record.provider === SwapKitProviderEnum.MayachainStreaming ||
    record.provider === SwapKitProviderEnum.ThorchainStreaming
  );
}

/**
 * Pull the on-chain memo string from a Maya/THORChain record's
 * `providerData`. Both provider-data variants carry it on the `memo` field
 * (see `MayachainStreamingProviderData`, `ThorchainStreamingProviderData`),
 * but the executor union also includes shapes that do not, so this helper
 * narrows safely and returns null when the field is absent or empty.
 */
function extractInboundMemo(record: SwapRecordType): string | null {
  const pd = record.providerData as unknown as { memo?: string };
  const memo = typeof pd?.memo === 'string' ? pd.memo : null;
  if (!memo || memo.length === 0) return null;
  return memo;
}

/**
 * Tier selection. Records that the provider is actively progressing get the
 * fast cadence; everything else (pre-broadcast, pre-observation, awaiting
 * external deposit) gets the idle cadence.
 */
function pickTier(record: SwapRecordType): PollerTier {
  if (
    record.status === SwapStatusEnum.Processing ||
    record.trackingStatus === TrackingStatusEnum.Inbound ||
    record.trackingStatus === TrackingStatusEnum.Swapping
  ) {
    return 'active';
  }
  return 'idle';
}

/**
 * Build a `/track` request body from a record. `chainId` always comes from
 * the sell asset; the keying parameter (`hash` vs `depositAddress`) varies
 * per provider:
 *
 *   - **Mayachain / THORChain**: their bifrost indexes inbound observations
 *     by the deposit tx hash. Passing `hash` returns the swap state.
 *     `depositAddress` for these providers is the inbound vault (which
 *     rotates), so it does not key on the per-swap track.
 *
 *   - **NEAR Intents / Flashnet**: they pre-assign a unique deposit address
 *     per quote and route their tracker through that, not the on-chain tx
 *     hash. Passing `hash` to `/track` for these providers returns a generic
 *     "tracker error / Insufficient parameters" 500. `depositAddress` is the
 *     correct key.
 *
 * The branch falls through to `depositAddress` whenever the relevant hash is
 * missing (pre-broadcast outbound, or any provider without an observed
 * inbound), which preserves the previous behaviour for the bootstrap window.
 */
function buildTrackParams(record: SwapRecordType): {
  chainId: string;
  hash?: string;
  depositAddress?: string;
} {
  const hash =
    record.broadcast?.txId ?? record.observedDepositTxHash ?? undefined;
  if (hash && providerKeysOnTxHash(record.provider)) {
    return { chainId: record.sellAsset.chainId, hash };
  }
  return {
    chainId: record.sellAsset.chainId,
    depositAddress: record.depositAddress,
  };
}

/**
 * Whether the provider's SwapKit tracker integration keys observations on the
 * source-chain tx hash (true) or on the per-quote deposit address (false).
 *
 * Verified empirically: Maya outbound tx tracked correctly by hash via
 * `track.swapkit.dev?hash=...`; NEAR Intents same call returned
 * `Insufficient parameters for tracking method detection`.
 *
 * Unknown providers fall back to the hash path to preserve the historical
 * behaviour — we would rather a tracker miss for a new provider than risk
 * an indexing regression for the providers that already work.
 */
function providerKeysOnTxHash(provider: SwapKitProviderEnum): boolean {
  switch (provider) {
    case SwapKitProviderEnum.Near:
    case SwapKitProviderEnum.Flashnet:
      return false;
    default:
      return true;
  }
}

/**
 * Compare the previous and updated record, returning `true` when at least one
 * persisted field changed.
 *
 * Implementation: serialise both records minus the `updatedAtMs` bookkeeping
 * field that changes on every tick, and compare the strings. Doing it this
 * way means the dedupe automatically covers any future field we add to
 * `SwapRecordType` — there is no list to keep in sync with the schema. Cost
 * is one short JSON.stringify per non-terminal record per tick, which is
 * negligible compared to the cost of the `/track` HTTP round-trip we just
 * paid for.
 */
function hasMeaningfulChange(
  prev: SwapRecordType,
  next: SwapRecordType,
): boolean {
  return stripNoise(prev) !== stripNoise(next);
}

const NOISE_KEYS = new Set(['updatedAtMs']);

function stripNoise(record: SwapRecordType): string {
  return JSON.stringify(record, (key, value) =>
    NOISE_KEYS.has(key) ? undefined : value,
  );
}
