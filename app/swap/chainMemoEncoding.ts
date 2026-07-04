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
