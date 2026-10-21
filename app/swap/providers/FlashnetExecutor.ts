import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { DepositInstructionsType } from '@app/swap/types/DepositInstructionsType';
import { FlashnetProviderData } from '@app/swap/types/ProviderDataType';
import { SwapRecordType } from '@app/swap/types/SwapRecordType';
import { TrackResponseType } from '@app/swap/types/TrackResponseType';
import {
  ExtractDepositInstructionsContext,
  ProviderExecutor,
} from './ProviderExecutor';
import { applyDefaultTrackUpdate } from './trackUpdateBase';

/**
 * Provider executor for Flashnet swaps.
 *
 * Flashnet is one of the three providers SwapKit currently routes ZEC through
 * (verified via `/providers`.supportedChainIds).
 *
 * The deposit must come from the declared `sourceAddress`, which the
 * documented schema does not say, and which is why
 * `requiresDepositFromSourceAddress` below routes an outbound deposit through
 * the ZIP 320 address the quote named: a deshield to it, then that address
 * paying the vault. Two transactions, two fees, and one of the user's
 * transparent addresses on chain. It is a check rather than how the order is
 * found — Flashnet mints a deposit address per order.
 *
 * That costs enough to be worth the three traces it took to settle, all on
 * mainnet:
 *
 *   - 2026-09-11, paid straight out of the shielded pool: refunded, with
 *     `errorCode: deposit_source_mismatch` in the order record. No transparent
 *     sender to check.
 *   - 2026-09-26, paid the same way again, after SwapKit relayed that Flashnet
 *     "say it shouldn't be an issue" alongside an indexing fix of theirs:
 *     refunded again, 0.01975 ZEC back to the declared address, while `/track`
 *     still reported the order as swapping. Deposit
 *     `56a0f8d5e387ece5fc9feb6155a60d499fc90029ecb80d4fb377ebb7eed2ec6d`.
 *   - 2026-09-29, paid as the two transactions: completed. 0.02 ZEC out,
 *     0.01010668 ETH in. Deposit
 *     `5e056bd143d5bc141135baaa946c43d518325781dda0d0de654bd3993c731f16`.
 *
 * So the extra hop is the price of this provider accepting the deposit, not a
 * precaution that could be dropped. Anyone tempted to drop it again wants a
 * fourth trace, not an argument.
 *
 * The extraction is from SwapKit's documented schema:
 *
 *   - `tx.to` / `inboundAddress` — deposit address the user funds.
 *   - `transient.swapId` — SwapKit-assigned identifier (prefixed `sk-`).
 *   - `tx.memo` — optional. Flashnet does not require a memo today but the
 *     field exists in SwapKit's schema; if a value is present we treat it the
 *     same way as Maya: UTF-8 bytes into OP_RETURN on the ZEC tx.
 *
 * If at execution time SwapKit returns a shape the executor cannot make sense
 * of, `extractDepositInstructions` throws with the missing field name so the
 * UI surfaces a clear error rather than persisting a half-built record.
 */
export class FlashnetExecutor implements ProviderExecutor {
  readonly provider = SwapKitProviderEnum.Flashnet;

  extractDepositInstructions(
    context: ExtractDepositInstructionsContext,
  ): DepositInstructionsType {
    const { swapResponse, sellAmountHumanDecimal } = context;
    const depositAddress = swapResponse.tx?.to ?? swapResponse.inboundAddress;
    if (!depositAddress) {
      throw new Error(
        'FlashnetExecutor: SwapKit /v3/swap response missing deposit address (tx.to / inboundAddress).',
      );
    }

    const memoText = swapResponse.tx?.memo;
    const swapKitAssignedId = swapResponse.transient?.swapId;
    const vaultAddress =
      swapResponse.inboundAddress !== depositAddress
        ? swapResponse.inboundAddress
        : undefined;

    const providerData: FlashnetProviderData = {
      kind: SwapKitProviderEnum.Flashnet,
      swapKitAssignedId,
      vaultAddress,
      memo: memoText,
    };

    return {
      provider: SwapKitProviderEnum.Flashnet,
      depositAddress,
      amountHumanDecimal: sellAmountHumanDecimal,
      memoBytes: memoText ? new TextEncoder().encode(memoText) : undefined,
      memoText,
      providerData,
      // Even with no memo to carry: the two-transaction shape is what gives
      // the deposit a transparent sender for Flashnet to match.
      requiresDepositFromSourceAddress: true,
    };
  }

  applyTrackUpdate(
    record: SwapRecordType,
    response: TrackResponseType,
  ): SwapRecordType {
    return applyDefaultTrackUpdate(record, response);
  }
}
