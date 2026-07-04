import { SwapKitProviderEnum } from '../enums/SwapKitProviderEnum';
import { DepositInstructionsType } from '../types/DepositInstructionsType';
import { NearProviderData } from '../types/ProviderDataType';
import { SwapRecordType } from '../types/SwapRecordType';
import { TrackResponseType } from '../types/TrackResponseType';
import {
  ExtractDepositInstructionsContext,
  ProviderExecutor,
} from './ProviderExecutor';
import { applyDefaultTrackUpdate } from './trackUpdateBase';

/**
 * Provider executor for NEAR Intents swaps.
 *
 * NEAR Intents is structurally different from Maya/THORChain:
 *   - There is no memo. The provider identifies the swap by the deposit
 *     address itself, which is allocated server-side and is unique per swap.
 *   - The deposit address is the SwapKit-allocated value; for an outbound ZEC
 *     swap this is a transparent ZEC address (we transfer to it), and for an
 *     inbound swap this is an address on the source chain (the user sends to
 *     it from an external wallet).
 *   - SwapKit attaches a `transient` blob with a `swapId` and/or
 *     `providerDetails.depositChannelId` — useful for cross-referencing with
 *     the NEAR Intents dashboard but not strictly needed by the user flow.
 *
 * Implication for OP_RETURN: when ZEC is the source asset, the OP_RETURN slot
 * is left empty (no memo). The librustzcash plumbing accepts `None` for
 * `op_return_data` and produces a normal transparent transaction in that case.
 *
 * Empirical shape (2026-06-21 mainnet test, ZEC -> ETH via NEAR Intents):
 *
 *   {
 *     "tx": { "to": "<unique-deposit-address>", "chainId": "zcash" },
 *     "inboundAddress": "<same as tx.to>",
 *     "transient": {
 *       "swapId": "sk-...",
 *       "providerDetails": { "depositChannelId": "..." }
 *     }
 *   }
 */
export class NearIntentsExecutor implements ProviderExecutor {
  readonly provider = SwapKitProviderEnum.Near;

  extractDepositInstructions(
    context: ExtractDepositInstructionsContext,
  ): DepositInstructionsType {
    const { swapResponse, sellAmountHumanDecimal } = context;
    // SwapKit's /v3/swap response shape has drifted across provider revisions
    // (the Maya executor hit this empirically when the documented `tx.memo`
    // moved). Probe the documented path first, then a handful of plausible
    // alternatives, and log the raw shape if nothing matches — better than
    // a generic error.
    const depositAddress =
      swapResponse.tx?.to ??
      swapResponse.inboundAddress ??
      pickString(swapResponse, [
        ['inboundAddress'],
        ['depositAddress'],
        ['address'],
        ['vault'],
        ['vaultAddress'],
        ['tx', 'address'],
        ['transient', 'depositAddress'],
        ['transient', 'providerDetails', 'depositAddress'],
      ]);

    if (!depositAddress) {
      try {
        console.log(
          'NearIntentsExecutor: /v3/swap response shape',
          JSON.stringify(swapResponse, null, 2),
        );
      } catch {
        console.log(
          'NearIntentsExecutor: /v3/swap response (unstringifiable):',
          swapResponse,
        );
      }
      throw new Error(
        `NearIntentsExecutor: SwapKit /v3/swap response missing deposit address. Probed: tx.to, inboundAddress, depositAddress, address, vault, vaultAddress, tx.address, transient.depositAddress, transient.providerDetails.depositAddress. Top-level keys present: ${Object.keys(
          swapResponse,
        ).join(', ')}`,
      );
    }

    const swapKitDepositChannelId =
      swapResponse.transient?.depositChannelId ??
      readNestedString(
        swapResponse.transient?.providerDetails,
        'depositChannelId',
      ) ??
      swapResponse.transient?.swapId;

    const providerData: NearProviderData = {
      kind: SwapKitProviderEnum.Near,
      depositAddress,
      swapKitDepositChannelId,
    };

    return {
      provider: SwapKitProviderEnum.Near,
      depositAddress,
      amountHumanDecimal: sellAmountHumanDecimal,
      providerData,
    };
  }

  applyTrackUpdate(
    record: SwapRecordType,
    response: TrackResponseType,
  ): SwapRecordType {
    return applyDefaultTrackUpdate(record, response);
  }
}

function readNestedString(
  obj: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (!obj) return undefined;
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Walk a list of dotted-key paths against the raw `/v3/swap` response,
 * returning the first non-empty string found. Same helper the Maya executor
 * uses — duplicated locally to keep executors self-contained.
 */
function pickString(
  obj: unknown,
  paths: ReadonlyArray<ReadonlyArray<string>>,
): string | undefined {
  for (const path of paths) {
    let cursor: unknown = obj;
    for (const segment of path) {
      if (cursor === null || typeof cursor !== 'object') {
        cursor = undefined;
        break;
      }
      cursor = (cursor as Record<string, unknown>)[segment];
    }
    if (typeof cursor === 'string' && cursor.length > 0) {
      return cursor;
    }
  }
  return undefined;
}
