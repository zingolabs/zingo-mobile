import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { ProviderDataType } from './ProviderDataType';

/**
 * Normalised "what does the user need to send" returned by a provider executor.
 *
 * The SwapKit `/v3/swap` response shape varies wildly per provider — some return
 * a memo + vault address (Maya, THORChain), some return only a unique deposit
 * address (NEAR Intents), some return both plus a channel id (Chainflip).
 *
 * Each provider's executor `extractDepositInstructions(swapKitSwapResponse)`
 * collapses that into this uniform shape, which is what:
 *   - the outbound flow feeds into zingolib's `propose_send` (depositAddress as
 *     the recipient, amount as the send amount, optional `memoBytes` plumbed
 *     through the OP_RETURN parameter we added in librustzcash);
 *   - the inbound flow renders on screen via the deposit-instructions card.
 *
 * `providerData` is the persisted per-provider variant. Keeping it inside the
 * deposit-instructions return value lets `SwapService` write it straight onto
 * the `SwapRecord` without re-querying the provider executor.
 *
 * `amountHumanDecimal` is the exact amount the user is expected to deposit,
 * formatted in the source asset's display units (e.g. `"0.05"` for 0.05 ZEC).
 * Providers occasionally round, so we keep the executor-canonical value here
 * rather than re-deriving from the quote.
 */
export type DepositInstructionsType = {
  /** Which provider produced these instructions (must match the record). */
  provider: SwapKitProviderEnum;
  /** Address the user (or zingolib) must send the source asset to. */
  depositAddress: string;
  /** Exact amount in the source asset's display units. */
  amountHumanDecimal: string;
  /**
   * Optional memo to attach to the on-chain deposit. For Zcash transparent
   * outbound deposits this is plumbed into the OP_RETURN slot we added in
   * librustzcash. For non-ZEC inbound deposits it is shown to the user.
   */
  memoBytes?: Uint8Array;
  /** Optional human-readable memo string (rendered as-is for inbound flows). */
  memoText?: string;
  /**
   * Maya's memo address. When set, the memo rides in a 0 ZEC shielded note to
   * it, in the same transaction that pays `depositAddress` out of the shielded
   * pool, instead of in an OP_RETURN after a deshield.
   */
  shieldedMemoAddress?: string;
  /** Provider-specific persisted data (discriminated by `provider`). */
  providerData: ProviderDataType;
  /** Unix-ms timestamp after which the provider considers the route stale. */
  expiresAtMs?: number;
  /**
   * Whether the deposit has to leave from the source address the quote was
   * taken with, which for an outbound swap means the transparent ZIP 320
   * address rather than the shielded pool.
   *
   * Not a question of attribution. Flashnet mints a deposit address per
   * order, as NEAR does, so where a deposit lands already says which order
   * it is for. What Flashnet adds is a check that the money came from the
   * declared `sourceAddress`. A deshield names no transparent sender, so it
   * fails that check: a mainnet order on 2026-09-11, paid straight out of
   * the shielded pool, carries `errorCode: deposit_source_mismatch` in the
   * Flashnet order record, and one on 2026-09-12, paid from the declared
   * address, carries none.
   *
   * NEAR also mints per order but checks no sender, and a NEAR swap paid
   * from the shielded pool completed, so the addressing scheme is not what
   * sets the two apart. Maya and THORChain share a vault and read a memo.
   */
  requiresDepositFromSourceAddress?: boolean;
};
