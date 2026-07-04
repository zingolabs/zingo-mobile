import { BroadcastStatusEnum } from '../enums/BroadcastStatusEnum';
import { SwapDirectionEnum } from '../enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '../enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '../enums/SwapStatusEnum';
import { TrackingStatusEnum } from '../enums/TrackingStatusEnum';
import { FiatValueBasisType } from './FiatValueBasisType';
import { ProviderDataType } from './ProviderDataType';
import { RefundInfoType } from './RefundInfoType';
import { SwapAssetType } from './SwapAssetType';

/**
 * Persistent record of a single swap, end-to-end.
 *
 * One `SwapRecord` is created the moment a user commits to a route (i.e. as
 * soon as the executor has produced `DepositInstructionsType`). It then lives
 * in encrypted storage and is mutated in-place by the poller as the swap
 * progresses through SwapKit's `/track` lifecycle, until it reaches a terminal
 * `SwapStatusEnum`.
 *
 * Primary key — `depositAddress`
 *   - For NEAR Intents, this is the unique per-swap address SwapKit allocates.
 *   - For Maya / THORChain, this is the inbound vault address (rotates server-
 *     side; we still snapshot it here as it is the value used in the deposit
 *     OP_RETURN).
 *   - For inbound flows, this is the address the user must send the source
 *     asset to.
 *   Either way, the address is unique per swap and is what SwapKit's `/track`
 *   endpoint keys on, so it makes the natural row id.
 *
 * Why a `provider` discriminator plus a discriminated-union `providerData`:
 *   - The top-level `provider` field is what the UI, the registry lookup, and
 *     analytics use; it never gets narrowed by the provider executor.
 *   - The nested `providerData` carries the type-safe variant data each
 *     executor needs. Splitting them lets the UI ignore provider-specific
 *     fields without losing exhaustiveness when an executor handles a record.
 *
 * Why a `direction` field:
 *   - Outbound and inbound swaps share enough structure to want a single record
 *     shape, but differ in which transactions we own (outbound: we built and
 *     broadcast the ZEC tx; inbound: the user did it from another wallet).
 *   - `broadcast` is only populated for outbound swaps; inbound records leave
 *     it `undefined`. The poller uses this to decide whether the
 *     account-deletion guard applies.
 *
 * Why a `fiatValueBasis` snapshot:
 *   - We display fiat values in the activity list. Recomputing from the current
 *     market would silently rewrite history when prices move. Pinning the
 *     basis at quote time keeps the activity list stable.
 */
export type SwapRecordType = {
  // Identity
  /** Local primary key. A short random id minted at commit time so two
   *  commits that happen to share the same `depositAddress` (Maya/THORChain
   *  inbound vault rotates slowly and is shared by every user during the
   *  epoch) do not collide in the store. Legacy records persisted before
   *  this field existed are migrated in `SwapStore._readRaw` by inheriting
   *  `recordId = depositAddress`. */
  recordId: string;
  /** Where the source-chain deposit lands. For Maya/THORChain this is the
   *  rotating inbound vault (shared across concurrent swaps); for
   *  NEAR/Flashnet/Chainflip it is a per-quote unique address. Used as a
   *  lookup field but NOT as the local primary key — see `recordId`. */
  depositAddress: string;
  /** Provider discriminator (matches `providerData.kind`). */
  provider: SwapKitProviderEnum;
  /** Outbound (we build the deposit tx) or inbound (user builds it). */
  direction: SwapDirectionEnum;
  /** Per-route opaque identifier echoed back into `/v3/swap`. */
  routeId: string;
  /** SwapKit-internal id when present (e.g. `transient.swapId`, Flashnet sk-id). */
  swapKitInternalId?: string;

  // Assets
  sellAsset: SwapAssetType;
  receiveAsset: SwapAssetType;
  /** Amount sent in source asset display units. */
  sellAmountHumanDecimal: string;
  /** Expected receive amount in destination asset display units. */
  expectedReceiveAmount: string;
  /** Minimum guaranteed receive amount at the route's quoted slippage. */
  minReceiveAmount: string;

  // Addresses on the user side
  /** Where the user will receive the swapped asset. For outbound this is the
   *  user-typed external address; for inbound this is the wallet's ephemeral
   *  ZIP-320 t-addr that we reserved per swap. */
  destinationAddress: string;
  /** Source-chain user address. For outbound this is the wallet's ephemeral
   *  ZIP-320 t-addr (it is both the on-chain origin we declare to SwapKit and
   *  the refund destination if the swap fails). For inbound this is the
   *  external chain address from which the user pays — the provider also uses
   *  it as the refund target for AML/expiry. */
  sourceAddress: string;

  // Lifecycle
  status: SwapStatusEnum;
  trackingStatus?: TrackingStatusEnum;
  /** Set when status is `Refunded` (and sometimes `Failed`). */
  refundInfo?: RefundInfoType;
  /** Provider-supplied human-readable error message when `Failed`. */
  failureReason?: string;

  // Provider-specific persisted data (discriminated by `provider`)
  providerData: ProviderDataType;

  // Outbound-only fields
  /**
   * Broadcast bookkeeping for the ZEC deposit transaction we constructed.
   * Undefined for inbound records. `txId` is populated as soon as zingolib
   * returns it; status updates progress through PendingBroadcast → Broadcasted.
   */
  broadcast?: {
    status: BroadcastStatusEnum;
    /** Deposit tx hash — the one the provider observes and the poller
     *  queries `/track` with. For a single-hop broadcast it is the only
     *  broadcast tx; for a ZIP-320 two-hop broadcast it is the final
     *  (ephemeral → vault) tx. The intermediate hop, when present, is
     *  recorded in `allTxIds` so the future activity history can render
     *  the full proposal chronology. */
    txId?: string;
    /** Every tx hash produced by the broadcast proposal, in chronological
     *  order (step 0 first, deposit last). Single-hop sends carry a
     *  one-element array equal to `[txId]`. Two-hop sends carry
     *  `[step0Txid, depositTxId]`. */
    allTxIds?: string[];
    broadcastedAtMs?: number;
  };

  // Inbound deposit observation (txid the provider reports on `/track`)
  /** Source-chain tx hash the provider observed crediting the deposit. */
  observedDepositTxHash?: string;
  /** Destination-chain tx hash the provider broadcast to deliver the swap. */
  destinationTxHash?: string;
  /**
   * Provider-supplied URL where the user can inspect the swap on the
   * provider's own dashboard (e.g. Flashnet's Orchestra explorer URL
   * pointing at the order id). Captured from `/track` when the response
   * surfaces it under any of `meta.providerExplorerUrl` / `legs[].meta
   * .providerExplorerUrl`. Persisted so the Trackers sheet can render
   * a stable row pointing at the provider's view even after the user
   * comes back to the app days later.
   */
  providerExplorerUrl?: string;
  /**
   * Destination-asset amount the provider actually paid out to the user,
   * in display units (string). Populated from `/track` once the outbound
   * leg lands. Undefined for swaps still in flight; for those callers
   * (e.g. the History row) should fall back to `expectedReceiveAmount` as
   * the best estimate.
   */
  actualReceiveAmount?: string;

  /**
   * Total fees the user pays for this swap, expressed in the destination
   * (receive) asset's display units. Captured at commit time from
   * `chosenRoute.totalFeesInReceiveAsset` — the rate-adjusted aggregate of
   * every fee SwapKit surfaced on the route (liquidity + outbound +
   * affiliate + service + inbound). This is the "single number" we surface
   * on the SwapDetail screen.
   *
   * TODO: when SwapKit `/track` exposes the post-execution fee breakdown
   * (or when we project Midgard's `metadata.swap.{liquidityFee, ...}` into
   * the record), refresh this with the actual realised fee instead of the
   * quote-time estimate. The quoted value is accurate for Maya/THORChain
   * streaming swaps (provider does not levy surprise fees beyond the
   * quote) but the API surface for an authoritative post-trade value is
   * the right north star.
   */
  totalFeesInReceiveAsset?: string;
  /**
   * Raw `route.fees[]` array as SwapKit emitted it at commit time, frozen
   * for the lifetime of this record. SwapDetail's Fees breakdown sheet
   * renders one row per entry (liquidity / outbound / affiliate / service /
   * inbound), each in its own asset, plus the converted total above as the
   * headline. Records persisted before this field was added omit it; the
   * detail screen falls back to the aggregate `totalFeesInReceiveAsset`
   * only for those legacy records.
   */
  feesRaw?: ReadonlyArray<{
    type?: string;
    amount?: string;
    asset?: string;
    chain?: string;
  }>;

  // Fiat-value snapshot at quote time
  fiatValueBasis: FiatValueBasisType;

  // Timestamps (all Unix-ms)
  createdAtMs: number;
  updatedAtMs: number;
  /** When `/track` first returned a non-pending status. */
  firstObservedAtMs?: number;
  /** When the swap reached its terminal status. */
  terminalAtMs?: number;
};
