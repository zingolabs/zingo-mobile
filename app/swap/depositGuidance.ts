import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import { isThorchainFamily } from './thorchainFamily';
import {
  buildEip681Uri,
  buildMemolessPaymentUri,
  isEvmSourceChain,
  isUtxoSourceChain,
  memoToHexCalldata,
} from './chainMemoEncoding';
import { SwapAssetType } from './types/SwapAssetType';

/**
 * The rules behind the deposit slip: what to scan, what to warn about, and
 * where the memo has to travel on the source chain.
 *
 * They live here rather than inside the modal that renders them because two
 * surfaces need the same answers — the post-commit slip in `SwapExecute` and
 * the detail view a user comes back to after closing it — and because these
 * are the decisions that cost real money when they are wrong. As pure
 * functions they can be tested without mounting anything.
 *
 * The mobile wallet reached the same three answers inside `ReviewSheet`; this
 * module is that logic lifted out, which is also why the incident dates below
 * are quoted rather than paraphrased.
 */

/** What to render in the QR block above the manual copy rows. */
export type DepositQrType = {
  /** QR payload: a full payment URI, or a bare deposit address. */
  value: string;
  /** Caption under the QR, stating what the payload does and does not carry. */
  hint: string;
};

/**
 * Choose the QR payload for a deposit the user pays from an external wallet.
 *
 * Three cases, in the order they are tried:
 *
 *   1. **Memo present (Maya / THORChain) on an EVM source chain** — EIP-681
 *      with the memo as `data` calldata. The only shape that carries address,
 *      amount and memo together.
 *   2. **No memo (NEAR Intents / Flashnet)** — a memo-less payment URI that
 *      still pre-fills the exact amount, which is what those providers are
 *      strict about. Native gas assets only; a token would make the wallet
 *      send the gas token instead.
 *   3. **No memo and no URI scheme for the chain** — the bare deposit address,
 *      so the user can at least scan it and type the amount from the row below.
 *
 * Returns `null` when a memo exists but no URI can carry it: a UTXO BIP-21 URI
 * silently drops the OP_RETURN, and a QR that looks complete while omitting
 * the one field the provider routes on is worse than no QR at all. The caller
 * falls back to the manual rows, which spell the memo out.
 */
export function buildDepositQr(args: {
  sellAsset: SwapAssetType;
  depositAddress: string;
  amountHumanDecimal: string;
  memoText?: string;
}): DepositQrType | null {
  const { sellAsset, depositAddress, amountHumanDecimal, memoText } = args;
  if (!depositAddress) return null;

  if (memoText) {
    const memoUri = buildEip681Uri({
      chain: sellAsset.chain,
      chainId: sellAsset.chainId,
      decimals: sellAsset.decimals,
      vaultAddress: depositAddress,
      amountHumanDecimal,
      memoHexWithPrefix: memoToHexCalldata(memoText),
    });
    if (!memoUri) return null;
    return {
      value: memoUri,
      hint: 'Scan this from any wallet that supports payment URIs. The address, the exact amount and the memo are all included.',
    };
  }

  const memolessUri = buildMemolessPaymentUri({
    chain: sellAsset.chain,
    chainId: sellAsset.chainId,
    decimals: sellAsset.decimals,
    address: depositAddress,
    amountHumanDecimal,
    // A native gas asset is a SwapKit identifier with no `-<contract>` suffix
    // (`SOL.SOL`, `BASE.ETH`). Tokens must not get a native-transfer URI.
    isNative: !sellAsset.swapKitId.includes('-'),
  });
  if (memolessUri) {
    return {
      value: memolessUri,
      hint: 'Scan this from any wallet that supports payment URIs. The address and the exact amount are both included.',
    };
  }

  return {
    value: depositAddress,
    hint: 'Scan to fill the deposit address in your wallet, then enter the exact amount shown below by hand.',
  };
}

/**
 * Whether the deposit needs the strong exact-amount warning.
 *
 * NEAR Intents and Flashnet mint a deposit address bound to one expected
 * amount: a satoshi short and the channel refunds instead of swapping. Many
 * wallets violate that by default — subtract-fee-from-amount, send-max
 * rounding, low-precision amount fields.
 *
 * Maya and THORChain route whatever arrives, so warning there would train the
 * user to ignore a banner that matters elsewhere.
 *
 * Outbound deposits are paid by this wallet, to the exact amount, so the
 * warning has no audience there.
 *
 * A real refund on 2026-06-29 came from exactly this: the source-chain wallet
 * deducted its network fee from the typed amount instead of adding it on top.
 */
export function requiresExactAmountWarning(record: {
  direction: SwapDirectionEnum;
  provider: SwapKitProviderEnum;
}): boolean {
  if (record.direction !== SwapDirectionEnum.Inbound) return false;
  return (
    record.provider === SwapKitProviderEnum.Near ||
    record.provider === SwapKitProviderEnum.Flashnet
  );
}

/**
 * Copy for the exact-amount warning. UTXO source chains get the extra
 * sentence about subtract-fee-from-amount, which is where that setting is
 * both common and on by default.
 */
export function exactAmountWarningText(chain: string): string {
  if (isUtxoSourceChain(chain)) {
    return (
      'Send EXACTLY this amount. Do not let your wallet subtract the network fee from it — turn off any ' +
      'subtract-fee-from-amount or send-max option. If less than this arrives, the provider refunds instead of swapping.'
    );
  }
  return (
    'Send EXACTLY this amount. Do not let your wallet adjust it for fees or rounding. If less than this arrives, ' +
    'the provider refunds instead of swapping.'
  );
}

/**
 * Where the Maya / THORChain memo has to travel on the source chain.
 *
 * Each base layer exposes a different slot, and naming the wrong one is not a
 * cosmetic error: a mainnet deposit on 2026-06-27 was lost to a refund cycle
 * because the banner said OP_RETURN while the user was paying from an EVM
 * wallet, whose `data` field defaults to empty. So the copy is chosen from the
 * chain, and an unrecognised chain gets the generic phrasing rather than a
 * confident guess.
 */
export function memoFieldHintForChain(chain: string): string {
  if (isEvmSourceChain(chain)) {
    return (
      'This memo is required. Send the transaction with this exact value in the data (calldata) field — most wallets ' +
      'hide it under an Advanced section. Wallets default that field to empty, and a deposit that arrives without the ' +
      'memo cannot be routed: it sits at the provider until it is refunded.'
    );
  }
  if (isUtxoSourceChain(chain)) {
    return (
      'This memo is required. The deposit transaction must carry it in an OP_RETURN output. A deposit that arrives ' +
      'without the memo cannot be routed: it sits at the provider until it is refunded.'
    );
  }
  return (
    'This memo is required. Attach it with whatever memo or data mechanism your wallet offers on this chain. A deposit ' +
    'that arrives without the memo cannot be routed: it sits at the provider until it is refunded.'
  );
}

/**
 * Whether the provider reads a memo off the deposit at all. Only Maya and
 * THORChain do; the channel-based providers identify the swap by its deposit
 * address, so a memo banner there would describe a field nobody reads.
 */
export function providerRequiresMemo(provider: SwapKitProviderEnum): boolean {
  return isThorchainFamily(provider);
}
