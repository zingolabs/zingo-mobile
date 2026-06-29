import { SwapKitProviderEnum } from '../enums/SwapKitProviderEnum';
import { DepositInstructionsType } from '../types/DepositInstructionsType';
import { MayachainStreamingProviderData } from '../types/ProviderDataType';
import { SwapRecordType } from '../types/SwapRecordType';
import { TrackResponseType } from '../types/TrackResponseType';
import {
  ExtractDepositInstructionsContext,
  ProviderExecutor,
} from './ProviderExecutor';
import { applyDefaultTrackUpdate } from './trackUpdateBase';

/**
 * Provider executor for Mayachain Streaming swaps.
 *
 * Empirical shape of the SwapKit `/v3/swap` response for Maya (captured during
 * the 2026-06-21 mainnet test: ZEC -> ETH via Mayachain Streaming):
 *
 *   {
 *     "tx": {
 *       "to":   "maya1...",        // inbound vault address (rotates server-side)
 *       "memo": "=:e:0xAA…:LIMIT/INTERVAL/QUANTITY",
 *       "chainId": "zcash"
 *     },
 *     "inboundAddress": "maya1...", // duplicate of tx.to
 *     "meta": {
 *       "streamingInterval": 1,
 *       "maxStreamingQuantity": 0  // 0 = "let the streamer decide"
 *     }
 *   }
 *
 * Memo handling:
 *   - For an outbound ZEC -> X swap the memo string is embedded verbatim into
 *     an OP_RETURN output on the ZEC transparent transaction (the OP_RETURN
 *     support we added to librustzcash + zingolib).
 *   - The memo bytes are UTF-8; Maya's parsers treat the string as ASCII but
 *     UTF-8 of plain ASCII is identical, so `TextEncoder.encode` is correct.
 *   - We do NOT inject a `/REFUNDADDR` clause into the memo. The deposit
 *     broadcast forces the ZIP-320 ephemeral indirection at the wallet level
 *     (`routeViaEphemeral: true` in `sendSwapDeposit`), so Maya observes the
 *     ephemeral t-addr as the inbound tx's `from_address` and uses it as the
 *     refund destination without us inflating the memo past the 80-byte
 *     OP_RETURN standardness cap.
 *
 * Streaming meta is preserved on the record (`providerData`) so the UI can
 * render "streaming over N blocks" without re-querying the response.
 */
export class MayaExecutor implements ProviderExecutor {
  readonly provider = SwapKitProviderEnum.MayachainStreaming;

  extractDepositInstructions(
    context: ExtractDepositInstructionsContext,
  ): DepositInstructionsType {
    const { swapResponse, sellAmountHumanDecimal } = context;
    const vaultAddress =
      swapResponse.tx?.to ??
      swapResponse.inboundAddress ??
      pickString(swapResponse, [
        ['inboundAddress'],
        ['vault'],
        ['vaultAddress'],
        ['address'],
        ['depositAddress'],
        ['tx', 'address'],
      ]);
    // SwapKit's /v3/swap response shape has drifted across provider revisions;
    // we have observed the Maya memo land at `tx.memo`, top-level `memo`,
    // `meta.memo`, and inside `transient.providerDetails.memo`. Try the
    // documented spot first then fall through the known alternatives — any
    // single non-empty value wins.
    const baseMemo =
      swapResponse.tx?.memo ??
      pickString(swapResponse, [
        ['memo'],
        ['data', 'memo'],
        ['meta', 'memo'],
        ['transient', 'memo'],
        ['transient', 'providerDetails', 'memo'],
        ['provider', 'memo'],
      ]);

    if (!vaultAddress || !baseMemo) {
      // Surface the raw shape on the device log so we can pin down where the
      // missing field actually lives and adapt — better than swallowing the
      // structure behind a generic error message.
      try {
        console.log(
          'MayaExecutor: /v3/swap response shape',
          JSON.stringify(swapResponse, null, 2),
        );
      } catch {
        console.log(
          'MayaExecutor: /v3/swap response (unstringifiable):',
          swapResponse,
        );
      }
    }
    if (!vaultAddress) {
      throw new Error(
        'MayaExecutor: SwapKit /v3/swap response missing inbound vault address (tx.to / inboundAddress / probed fallbacks).',
      );
    }
    if (!baseMemo) {
      throw new Error(
        `MayaExecutor: SwapKit /v3/swap response missing memo. Probed: tx.memo, memo, data.memo, meta.memo, transient.memo, transient.providerDetails.memo, provider.memo. Top-level keys present: ${Object.keys(
          swapResponse,
        ).join(', ')}`,
      );
    }

    // Use SwapKit's memo verbatim. The `routeViaEphemeral` flag in the deposit
    // broadcast wraps the send in a ZIP-320 two-hop proposal so Maya observes
    // a wallet-controlled ephemeral t-addr as the `from_address` and uses it
    // as the refund destination — no in-memo `/REFUNDADDR` needed (and we
    // couldn't fit one anyway: the typical ~70-byte streaming memo plus a
    // 35-byte t-addr would exceed the 80-byte OP_RETURN standardness cap and
    // librustzcash would refuse to build the tx).
    const memoText = baseMemo;

    const providerData: MayachainStreamingProviderData = {
      kind: SwapKitProviderEnum.MayachainStreaming,
      vaultAddress,
      memo: memoText,
      streamingIntervalBlocks: swapResponse.meta?.streamingInterval,
      maxStreamingQuantity: swapResponse.meta?.maxStreamingQuantity,
    };

    return {
      provider: SwapKitProviderEnum.MayachainStreaming,
      depositAddress: vaultAddress,
      amountHumanDecimal: sellAmountHumanDecimal,
      memoBytes: new TextEncoder().encode(memoText),
      memoText,
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

/**
 * Walk a list of dotted-key paths against the raw `/v3/swap` response,
 * returning the first non-empty string found. Used to absorb shape drift
 * across SwapKit revisions without hard-coupling the executor to one
 * historical capture.
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
