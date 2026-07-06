/**
 * Chain-aware memo / payment encoding helpers shared between the swap
 * commit flow (`ReviewSheet`) and the swap detail view (`SwapDetail`).
 *
 * Why a separate module: both screens render the same "deposit
 * instructions" surface — vault address, exact amount, memo, hex calldata,
 * and (in commit) a QR + deep link. When the user closes the commit sheet
 * without paying, SwapDetail becomes the place to come back and complete
 * the transfer from the external wallet. Duplicating the chain lists +
 * hex memo encoder across both files invites them to drift; centralising
 * keeps the "EVM means data field" / "memo is hex-encoded" rules in one
 * spot a future contributor can find.
 *
 * The constants are intentionally small and explicit rather than fetched
 * from SwapKit: SwapKit's `chain` strings are a moving target and we want
 * static, audit-able lists for the two semantic decisions we make from
 * them (EVM ⇒ encode memo as hex calldata; UTXO ⇒ warn user to attach
 * memo via OP_RETURN).
 */

/**
 * EVM source chains where the Maya / THORChain memo must travel in the tx
 * `data` (calldata) field as a hex blob — never as a separate memo string.
 * Single source of truth for both the per-chain hint banner and the
 * `Copy as hex` affordance below.
 */
export const EVM_SOURCE_CHAINS: ReadonlyArray<string> = [
  'ETH',
  'AVAX',
  'BSC',
  'MATIC',
  'POL',
  'BASE',
  'ARB',
  'OP',
  'FTM',
  'GNOSIS',
  'KAVA',
  'LINEA',
  'MNT',
  'BERA',
  'CRO',
  'XLAYER',
];

export const UTXO_SOURCE_CHAINS: ReadonlyArray<string> = [
  'BTC',
  'BCH',
  'LTC',
  'DOGE',
  'DASH',
  'ZEC',
];

/**
 * BIP-21-style URI scheme per UTXO source chain (used for the memo-less
 * payment URI of channel-based providers). BCH uses the `bitcoincash:`
 * cashaddr scheme; ZEC is present for completeness though ZEC is never a
 * swap *source* in this wallet.
 */
const UTXO_URI_SCHEME: Readonly<Record<string, string>> = {
  BTC: 'bitcoin',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
  DASH: 'dash',
  BCH: 'bitcoincash',
  ZEC: 'zcash',
};

export function isEvmSourceChain(chain: string): boolean {
  return EVM_SOURCE_CHAINS.includes(chain.toUpperCase());
}

export function isUtxoSourceChain(chain: string): boolean {
  return UTXO_SOURCE_CHAINS.includes(chain.toUpperCase());
}

/**
 * Encode the human-readable Maya / THORChain memo as the hex calldata blob
 * EVM wallets expect in the tx `data` field. Returns a `0x`-prefixed
 * lowercase hex string of the memo's UTF-8 bytes.
 *
 * Why this exists: many EVM wallets don't expose a memo / data field in
 * their standard Send flow, and those that do expose it usually only
 * accept `data` as pre-encoded hex. Surfacing a one-tap copy here removes
 * the manual ASCII → hex step that was the proximate cause of the
 * 2026-06-27 stuck-deposit incident (the user pasted the raw memo into
 * the address field instead).
 */
export function memoToHexCalldata(memo: string): string {
  // Memos are ASCII-only by Maya / THORChain spec (`=:ASSET:ADDR:…`), but
  // `TextEncoder` is not available in our React Native runtime, so we encode
  // byte-by-byte from char codes. For the ASCII range this matches UTF-8.
  let hex = '';
  for (let i = 0; i < memo.length; i++) {
    hex += memo.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return `0x${hex}`;
}

/**
 * Convert a human-decimal amount string (e.g. `"0.001"`) into a base-units
 * string (e.g. `"1000000000000000"` for 18-decimal ETH). Uses string surgery
 * + BigInt so the result is exact at every precision — `parseFloat` would
 * silently lose digits for amounts past ~15 significant figures.
 *
 * Returns `null` when the input is malformed (non-numeric, multiple dots,
 * negative). Callers should fall back to omitting the `value` parameter on
 * the URI rather than embedding a wrong number.
 */
export function humanDecimalToBaseUnits(
  decimalStr: string,
  decimals: number,
): string | null {
  if (!/^\d+(\.\d+)?$/.test(decimalStr)) return null;
  if (decimals < 0 || !Number.isInteger(decimals)) return null;
  const [whole = '0', fracRaw = ''] = decimalStr.split('.');
  // Right-pad / truncate the fraction to exactly `decimals` digits.
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals);
  // Strip leading zeros from the concatenated integer except the final 0.
  const joined = (whole + frac).replace(/^0+(?=\d)/, '');
  try {
    return BigInt(joined).toString(10);
  } catch {
    return null;
  }
}

/**
 * Build an EIP-681 payment URI for an EVM-source-chain deposit, encoding
 * the vault address, chain id, exact amount (in wei) and Maya/THORChain
 * memo (as the `data` calldata field). EVM wallets that honour EIP-681
 * parse the URI from a QR scan or deep-link tap and pre-fill the Send
 * screen so the user only needs to approve.
 *
 * Returns `null` for non-EVM chains, when amount conversion fails, or when
 * the vault/memo is missing — the caller falls back to the manual
 * address/amount/memo copy flow that has worked since day one.
 *
 * URI shape (per EIP-681):
 *   `ethereum:<targetAddress>@<chainId>?value=<wei>&data=<hex memo>`
 *
 * The `ethereum:` scheme prefix is canonical across EVM chains — the
 * chain is disambiguated by the numeric `@<chainId>` segment. Verified
 * empirically against a major EVM mobile wallet on 2026-06-28.
 */
export function buildEip681Uri(args: {
  chain: string;
  chainId: string;
  decimals: number;
  vaultAddress: string;
  amountHumanDecimal: string;
  memoHexWithPrefix: string;
}): string | null {
  if (!isEvmSourceChain(args.chain)) return null;
  if (!args.vaultAddress || !args.memoHexWithPrefix) return null;
  if (!/^\d+$/.test(args.chainId)) return null;
  const wei = humanDecimalToBaseUnits(args.amountHumanDecimal, args.decimals);
  if (wei === null) return null;
  return (
    `ethereum:${args.vaultAddress}` +
    `@${args.chainId}` +
    `?value=${wei}` +
    `&data=${args.memoHexWithPrefix}`
  );
}

/**
 * Build a memo-LESS payment URI for channel-based providers (NEAR Intents,
 * Flashnet), which mint a unique deposit address per swap and require no
 * memo. Encodes address + exact amount, so a wallet that honours the URI
 * pre-fills the amount too — mitigating the exact-amount foot-gun these
 * providers are strict about (a satoshi short triggers a refund).
 *
 *   - EVM chains  → EIP-681      `ethereum:<addr>@<chainId>?value=<wei>`.
 *   - UTXO chains → BIP-21       `<scheme>:<addr>?amount=<decimal>`.
 *   - Solana      → Solana Pay   `solana:<addr>?amount=<decimal SOL>`.
 *   - TON         → TON transfer `ton://transfer/<addr>?amount=<nanoton>`.
 *   - Other chains → `null` (caller shows an address-only QR).
 *
 * NATIVE ASSETS ONLY (`isNative`): every scheme above encodes a native
 * gas-token transfer. Emitting one for a token (ERC-20 / SPL / Jetton) would
 * make the wallet send the GAS token instead of the token — a wrong-asset
 * foot-gun. For tokens we return null and let the caller fall back to an
 * address-only QR, which is safe (no amount, so nothing to get wrong).
 *
 * MUST NOT be used for Maya / THORChain: those carry a memo a memo-less URI
 * would silently drop — use `buildEip681Uri` there instead. The caller
 * selects between the two on the presence of a memo.
 */
export function buildMemolessPaymentUri(args: {
  chain: string;
  chainId: string;
  decimals: number;
  address: string;
  amountHumanDecimal: string;
  /** True only for a chain's native gas asset (identifier has no token
   *  contract). Tokens return null — see the wrong-asset note above. */
  isNative: boolean;
}): string | null {
  if (!args.address || !args.isNative) return null;
  const chain = args.chain.toUpperCase();

  if (isEvmSourceChain(chain)) {
    if (!/^\d+$/.test(args.chainId)) return null;
    const wei = humanDecimalToBaseUnits(args.amountHumanDecimal, args.decimals);
    if (wei === null) return null;
    return `ethereum:${args.address}@${args.chainId}?value=${wei}`;
  }

  const utxoScheme = UTXO_URI_SCHEME[chain];
  if (utxoScheme) {
    if (!/^\d+(\.\d+)?$/.test(args.amountHumanDecimal)) return null;
    return `${utxoScheme}:${args.address}?amount=${args.amountHumanDecimal}`;
  }

  if (chain === 'SOL' || chain === 'SOLANA') {
    // Solana Pay — amount is a decimal in SOL units (not lamports).
    if (!/^\d+(\.\d+)?$/.test(args.amountHumanDecimal)) return null;
    return `solana:${args.address}?amount=${args.amountHumanDecimal}`;
  }

  if (chain === 'TON') {
    // ton://transfer — amount in nanoton (integer base units, 9 decimals).
    const nano = humanDecimalToBaseUnits(
      args.amountHumanDecimal,
      args.decimals,
    );
    if (nano === null) return null;
    return `ton://transfer/${args.address}?amount=${nano}`;
  }

  return null;
}
