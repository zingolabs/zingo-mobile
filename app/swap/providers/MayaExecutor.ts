import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { DepositInstructionsType } from '@app/swap/types/DepositInstructionsType';
import { MayachainStreamingProviderData } from '@app/swap/types/ProviderDataType';
import { SwapRecordType } from '@app/swap/types/SwapRecordType';
import { TrackResponseType } from '@app/swap/types/TrackResponseType';
import {
  ExtractDepositInstructionsContext,
  ProviderExecutor,
} from './ProviderExecutor';
import { applyDefaultTrackUpdate } from './trackUpdateBase';
import { extractVaultMemoDeposit } from './vaultMemoDeposit';
import {
  SHIELDED_MEMO_MAX_BYTES,
  memoWithRefundAddress,
} from '@app/swap/mayaShieldedMemo';

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
 * Shielded memo: when Maya publishes a memo address for the vault SwapKit
 * named, the deposit is one shielded transaction instead (see
 * `mayaShieldedMemo`). It names no transparent sender, so the ephemeral
 * t-addr goes into the memo as `/REFUNDADDR`; the 512-byte note has room.
 *
 * Streaming meta is preserved on the record (`providerData`) so the UI can
 * render "streaming over N blocks" without re-querying the response.
 */
export class MayaExecutor implements ProviderExecutor {
  readonly provider = SwapKitProviderEnum.MayachainStreaming;

  extractDepositInstructions(
    context: ExtractDepositInstructionsContext,
  ): DepositInstructionsType {
    const {
      swapResponse,
      sellAmountHumanDecimal,
      sellAsset,
      sourceAddress,
      shieldedMemoTarget,
    } = context;
    const extracted = extractVaultMemoDeposit(swapResponse, 'MayaExecutor');
    const { vaultAddress } = extracted;
    let { memoText } = extracted;

    // Only for the vault Maya says takes it: a stale or mismatched one keeps
    // the OP_RETURN deposit.
    let shieldedMemoAddress: string | undefined;
    if (
      sellAsset.chain === 'ZEC' &&
      shieldedMemoTarget &&
      shieldedMemoTarget.vaultAddress === vaultAddress
    ) {
      const withRefund = memoWithRefundAddress(memoText, sourceAddress);
      if (
        withRefund &&
        new TextEncoder().encode(withRefund).length <= SHIELDED_MEMO_MAX_BYTES
      ) {
        memoText = withRefund;
        shieldedMemoAddress = shieldedMemoTarget.unifiedAddress;
      }
    }

    // Otherwise SwapKit's memo is used verbatim. The `routeViaEphemeral` flag in the deposit
    // broadcast wraps the send in a ZIP-320 two-hop proposal so Maya observes
    // a wallet-controlled ephemeral t-addr as the `from_address` and uses it
    // as the refund destination — no in-memo `/REFUNDADDR` needed (and we
    // couldn't fit one anyway: the typical ~70-byte streaming memo plus a
    // 35-byte t-addr would exceed the 80-byte OP_RETURN standardness cap and
    // librustzcash would refuse to build the tx).
    const providerData: MayachainStreamingProviderData = {
      kind: this.provider,
      vaultAddress,
      memo: memoText,
      ...(shieldedMemoAddress && { shieldedMemoAddress }),
      streamingIntervalBlocks: swapResponse.meta?.streamingInterval,
      maxStreamingQuantity: swapResponse.meta?.maxStreamingQuantity,
    };

    return {
      provider: this.provider,
      depositAddress: vaultAddress,
      amountHumanDecimal: sellAmountHumanDecimal,
      memoBytes: new TextEncoder().encode(memoText),
      memoText,
      ...(shieldedMemoAddress && { shieldedMemoAddress }),
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
