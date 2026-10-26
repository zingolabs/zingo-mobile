import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { DepositInstructionsType } from '@app/swap/types/DepositInstructionsType';
import { ThorchainStreamingProviderData } from '@app/swap/types/ProviderDataType';
import { SwapRecordType } from '@app/swap/types/SwapRecordType';
import { TrackResponseType } from '@app/swap/types/TrackResponseType';
import {
  ExtractDepositInstructionsContext,
  ProviderExecutor,
} from './ProviderExecutor';
import { applyDefaultTrackUpdate } from './trackUpdateBase';
import { extractVaultMemoDeposit } from './vaultMemoDeposit';

/**
 * Provider executor for THORChain swaps, streaming and single-shot.
 *
 * Mayachain is a THORChain fork, so the deposit is the same transaction in
 * both cases: pay the rotating inbound vault address, and carry the swap memo
 * in an OP_RETURN on the ZEC transparent transaction. The response probing
 * they share lives in `extractVaultMemoDeposit`.
 *
 * As with Maya, no `/REFUNDADDR` clause is spliced into the memo. The deposit
 * broadcast forces the ZIP 320 ephemeral indirection (`routeViaEphemeral` in
 * `sendSwapDeposit`), so THORChain observes a wallet-controlled ephemeral
 * t-addr as the inbound transaction's `from_address` and refunds there. A memo
 * carrying the address as well would risk the 80-byte OP_RETURN standardness
 * cap, and librustzcash refuses to build a transaction past it.
 *
 * Unlike Maya, this has no mainnet trace behind it yet: THORChain's Zcash
 * support was announced ahead of the liquidity that makes it quotable, so the
 * first real route through here will be the first test of it. The extraction
 * throws naming the missing field rather than persisting a half-built record,
 * which is what makes that first attempt legible if the shape differs.
 */
export class ThorchainExecutor implements ProviderExecutor {
  readonly provider = SwapKitProviderEnum.ThorchainStreaming;

  extractDepositInstructions(
    context: ExtractDepositInstructionsContext,
  ): DepositInstructionsType {
    const { swapResponse, sellAmountHumanDecimal } = context;
    const { vaultAddress, memoText } = extractVaultMemoDeposit(
      swapResponse,
      'ThorchainExecutor',
    );

    const providerData: ThorchainStreamingProviderData = {
      kind: this.provider,
      vaultAddress,
      memo: memoText,
      streamingIntervalBlocks: swapResponse.meta?.streamingInterval,
      maxStreamingQuantity: swapResponse.meta?.maxStreamingQuantity,
    };

    return {
      provider: this.provider,
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
