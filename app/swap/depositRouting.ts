import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import { isThorchainFamily } from './thorchainFamily';

/**
 * How many Zcash transactions an outbound deposit takes, and what to hold back
 * for their fees.
 *
 * One fact drives both, which is why they live together: a deposit that
 * carries a memo is two transactions, and the screen has to reserve for what
 * the send will actually cost.
 */

/**
 * Whether this provider's deposit can carry a memo, and therefore whether it
 * takes two transactions.
 *
 * A memo rides in an OP_RETURN, and the wallet cannot attach one to a shielded
 * spend: it deshields to a transparent address it owns and then spends that to
 * the vault with the memo attached. Two transactions, two fees.
 *
 * Maya and THORChain always carry one — it is how they know which swap a
 * deposit belongs to, and their refund destination is read from the
 * transparent origin the second transaction exposes. Flashnet carries one only
 * when SwapKit supplies it, which is why this asks what the provider *can* do
 * rather than what a particular quote did: the reserve is computed before the
 * route is committed, and the memo arrives with the commitment. NEAR Intents
 * never sends one and stays at a single transaction.
 *
 * Erring towards two is the safe direction, for the reason `zecNetworkFeeReserve`
 * gives.
 */
export function depositCarriesMemo(provider: SwapKitProviderEnum): boolean {
  return (
    isThorchainFamily(provider) || provider === SwapKitProviderEnum.Flashnet
  );
}

/**
 * Whether an outbound deposit is paid through the transparent source address
 * the quote named, a deshield to it and then that address paying the deposit,
 * rather than as an ordinary send straight out of the shielded pool.
 *
 * It is the two-transaction shape for either of two reasons: a memo, which
 * needs a transparent spend to ride in, or a provider that checks the deposit
 * came from the declared address. Otherwise it is one ordinary send.
 *
 * The send path and the refund-address claim both turn on this, and they
 * must agree: the two-transaction shape reserves the source address by
 * applying its proposal, while the ordinary send never touches it and leaves
 * the claim to the caller.
 */
export function depositSpendsSourceAddress(args: {
  memoBytes?: Uint8Array;
  viaSourceAddress?: boolean;
  shieldedMemoAddress?: string;
}): boolean {
  // A shielded memo deposit is one send out of the shielded pool.
  if (args.shieldedMemoAddress) return false;
  return (
    (!!args.memoBytes && args.memoBytes.length > 0) || !!args.viaSourceAddress
  );
}

/**
 * ZIP 317's marginal fee, in zatoshis. A transaction pays this per logical
 * action beyond the two-action grace.
 */
const MARGINAL_FEE_ZATS = 5_000;

/**
 * Logical actions budgeted for one deposit transaction: room for a couple of
 * shielded inputs, the transparent output, and change. Generous rather than
 * exact — see `zecNetworkFeeReserve` for why erring high is the safe side.
 */
const BUDGETED_ACTIONS = 4;

/**
 * What to hold back from the spendable balance for the Zcash network fee on an
 * outbound deposit, in ZEC display units.
 *
 * An estimate, not a quote. The real figure comes from proposing the
 * transaction, and the deposit address that a proposal needs does not exist
 * until the route is committed — by which point the user has already been
 * shown a maximum and told whether they can afford it. So the screen reserves
 * a figure instead.
 *
 * It errs high deliberately. Reserving a few thousand zatoshis too many costs
 * the user a swap amount a hair below what they could have sent; reserving too
 * few walks them into a send that fails for want of funds, after they have
 * already committed the route at the provider. The two mistakes are not the
 * same size.
 *
 * Doubled for a memo-bearing deposit, which is two transactions (Maya's
 * shielded memo deposit is one, but that is known only at the commit): the deshield
 * that funds the transparent address, and the transparent spend that pays the
 * vault with the memo. Each pays its own fee.
 */
export function zecNetworkFeeReserve(provider: SwapKitProviderEnum): number {
  const perTransactionZats = MARGINAL_FEE_ZATS * BUDGETED_ACTIONS;
  const transactions = depositCarriesMemo(provider) ? 2 : 1;
  return (perTransactionZats * transactions) / 1e8;
}
