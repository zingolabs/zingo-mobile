import { SwapKitProviderEnum } from '../enums/SwapKitProviderEnum';
import { SwapKitError } from '../errors';
import { SwapErrorCategoryEnum } from '../enums/SwapErrorCategoryEnum';
import { DepositInstructionsType } from '../types/DepositInstructionsType';
import { SwapAssetType } from '../types/SwapAssetType';
import { SwapRecordType } from '../types/SwapRecordType';
import { SwapResponseType } from '../types/SwapResponseType';
import { TrackResponseType } from '../types/TrackResponseType';

/**
 * Context handed to `extractDepositInstructions` together with the raw
 * `/v3/swap` response.
 *
 * The /v3/swap body alone does not always carry every field the deposit
 * instructions need (e.g. the destination address is part of the quote
 * request, not always echoed back by the provider). Bundling these explicitly
 * lets each executor work without re-deriving them from the (often sparse)
 * SwapKit response.
 */
export type ExtractDepositInstructionsContext = {
  swapResponse: SwapResponseType;
  sellAsset: SwapAssetType;
  receiveAsset: SwapAssetType;
  sellAmountHumanDecimal: string;
  destinationAddress: string;
  /** Source-chain refund address (our ephemeral t-addr for outbound). Maya
   *  and THORChain executors splice this into the deposit memo as the
   *  `/REFUNDADDR` clause so refunds reach a wallet-controlled address even
   *  when the deposit originates from a shielded note (no observable
   *  on-chain `from_address`). */
  sourceAddress: string;
};

/**
 * Strategy-pattern contract for per-provider behaviour.
 *
 * Why a strategy instead of a giant `switch (provider) { ... }`:
 *   - The /v3/swap response shape is provider-specific; embedding that knowledge
 *     in each executor keeps `SwapService` provider-agnostic.
 *   - Adding a new provider becomes "implement this interface + register" —
 *     no surgery to the orchestrator or the poller.
 *   - Tests can mock a single executor without dragging in REST or persistence.
 *
 * Each implementation owns:
 *   1. **extractDepositInstructions** — given the raw /v3/swap body + the user
 *      inputs, produce the uniform `DepositInstructionsType` that the outbound
 *      flow feeds to zingolib (or the inbound flow renders on screen).
 *   2. **applyTrackUpdate** — given a /track response, produce an updated
 *      `SwapRecord`. Returning a new object (not mutating) keeps the React
 *      state model happy.
 *   3. **classifyError** *(optional)* — refine the base error classifier when
 *      the provider exposes additional semantics in the response body.
 *
 * Executors are stateless. They should never read from persistence or call
 * the REST client themselves — `SwapService` owns those concerns.
 */
export interface ProviderExecutor {
  /** Provider identity. Must match the records this executor handles. */
  readonly provider: SwapKitProviderEnum;

  extractDepositInstructions(
    context: ExtractDepositInstructionsContext,
  ): DepositInstructionsType;

  applyTrackUpdate(
    record: SwapRecordType,
    response: TrackResponseType,
  ): SwapRecordType;

  classifyError?(error: SwapKitError): SwapErrorCategoryEnum | undefined;
}
