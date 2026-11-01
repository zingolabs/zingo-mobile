/**
 * Direction of a swap relative to the Zcash wallet.
 *
 * - `Outbound`: ZEC leaves the wallet and the user receives another asset at
 *   an externally-controlled address (most common). zingolib builds, signs,
 *   and broadcasts the deposit transaction.
 *
 * - `Inbound`: the user sends another asset from an external wallet to a
 *   SwapKit-issued deposit address and receives ZEC at one of their Zingo
 *   addresses. zingolib does not construct the deposit transaction; the user
 *   is shown deposit instructions to use in their external wallet.
 *
 * Some lifecycle states (e.g. `AwaitingExternalDeposit`) are only meaningful
 * for `Inbound`. Provider executors may also branch on direction to choose
 * the correct destination address format (transparent vs shielded UA).
 */
export enum SwapDirectionEnum {
  Outbound = 'outbound',
  Inbound = 'inbound',
}
