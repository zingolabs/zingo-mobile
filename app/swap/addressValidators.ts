/**
 * Format-level validators for the non-ZEC chains the swap flow routes to.
 *
 * Scope: catch typos that produce an obviously-malformed address — wrong
 * prefix, wrong length, characters outside the chain's alphabet. We do NOT
 * verify checksums (EIP-55, base58check, bech32 polymod): the cost in
 * dependencies and code is high, and SwapKit's server-side validation
 * catches single-character flips that pass these regexes with an
 * `InvalidAddressForChain` 400.
 *
 * Adding a chain: drop a `chain → validator` entry into `VALIDATORS`. Chains
 * we have not modelled fall through to a lenient `length > 0` check so a
 * forgotten entry never blocks a legitimate quote — the worst case is a
 * server-side rejection one round-trip later.
 */

type Validator = (address: string) => boolean;

// All EVM-compatible chains share the same address format (the 20-byte
// account/contract hash hex-encoded with a `0x` prefix). Checksum capitalisation
// (EIP-55) is intentionally not enforced — SwapKit accepts both lowercase and
// checksummed forms.
const EVM_RE = /^0x[0-9a-fA-F]{40}$/;

// Bitcoin legacy P2PKH (`1…`) and P2SH (`3…`) addresses use base58 with the
// usual ambiguous-glyph exclusions. Length is 26–35 chars after the prefix.
const BTC_LEGACY_RE = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
// SegWit / Taproot (`bc1…`) use bech32/bech32m. We allow the full witness
// length range (P2WPKH 42 chars, P2WSH 62, P2TR 62, plus future-version
// padding). The body alphabet excludes `1`, `b`, `i`, `o`.
const BTC_BECH32_RE = /^bc1[ac-hj-np-z02-9]{6,87}$/;

// Litecoin: legacy `L…` / `M…` / `3…` (P2SH alias), or bech32 `ltc1…`.
const LTC_LEGACY_RE = /^[LM3][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const LTC_BECH32_RE = /^ltc1[ac-hj-np-z02-9]{6,87}$/;

// Dogecoin: legacy base58 starting with `D`. 34 chars total typical.
const DOGE_RE = /^D[1-9A-HJ-NP-Za-km-z]{32,34}$/;

// Dash: legacy base58 starting with `X` (P2PKH) or `7` (P2SH).
const DASH_RE = /^[X7][1-9A-HJ-NP-Za-km-z]{32,34}$/;

// Bitcoin Cash: legacy (same as BTC legacy) or CashAddr (`bitcoincash:q…` /
// just `q…` / `p…`). Body charset is the bech32 alphabet but no `1` exclusion.
const BCH_LEGACY_RE = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const BCH_CASHADDR_RE = /^(bitcoincash:)?[qp][ac-hj-np-z02-9]{40,42}$/;

// Solana: base58 32–44 chars (encoded ed25519 pubkey).
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// NEAR: either an implicit account (64 lowercase hex chars = encoded ed25519
// pubkey) or a named account ending in `.near`. Named accounts allow
// `a-z0-9_-` and `.` as a separator; we only accept mainnet (no `.testnet`).
const NEAR_IMPLICIT_RE = /^[a-f0-9]{64}$/;
const NEAR_NAMED_RE = /^([a-z0-9_-]+\.)+near$/;

// Tron: base58check starting with `T`. Total length 34 chars.
const TRX_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

// Cosmos hub: bech32 `cosmos1…`. 39 chars after the prefix (38 body + 1 sep).
const ATOM_RE = /^cosmos1[ac-hj-np-z02-9]{38}$/;

// XRP: base58 starting with `r`. Lengths 25–35.
const XRP_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

// Stellar: 56 chars total starting with `G` (account) using base32 alphabet.
const XLM_RE = /^G[A-Z2-7]{55}$/;

// Cardano: Shelley (`addr1…` bech32) or legacy Byron (`Ae2…` / `DdzFF…` base58).
const ADA_SHELLEY_RE = /^addr1[ac-hj-np-z02-9]{50,}$/;
const ADA_BYRON_RE = /^(Ae2|DdzFF)[A-Za-z0-9]{40,}$/;

// Polkadot SS58 (mainnet): 47–48 chars base58 starting with `1`.
const DOT_RE = /^1[1-9A-HJ-NP-Za-km-z]{46,47}$/;

// Sui: 0x + 64 hex (32-byte object id).
const SUI_RE = /^0x[a-fA-F0-9]{64}$/;

// TON: user-friendly base64url (`EQ…`/`UQ…`/`kf…` + 46 chars) or raw
// `workchain:hex` (workchain is signed integer, hash is 64 hex chars).
const TON_USER_RE = /^(?:[EU]Q|kf)[A-Za-z0-9_-]{46}$/;
const TON_RAW_RE = /^-?\d+:[a-fA-F0-9]{64}$/;

const isEvm: Validator = a => EVM_RE.test(a);
const isBtc: Validator = a => BTC_LEGACY_RE.test(a) || BTC_BECH32_RE.test(a);
const isLtc: Validator = a => LTC_LEGACY_RE.test(a) || LTC_BECH32_RE.test(a);
const isDoge: Validator = a => DOGE_RE.test(a);
const isDash: Validator = a => DASH_RE.test(a);
const isBch: Validator = a => BCH_LEGACY_RE.test(a) || BCH_CASHADDR_RE.test(a);
const isSol: Validator = a => SOL_RE.test(a);
const isNear: Validator = a =>
  NEAR_IMPLICIT_RE.test(a) || NEAR_NAMED_RE.test(a);
const isTrx: Validator = a => TRX_RE.test(a);
const isAtom: Validator = a => ATOM_RE.test(a);
const isXrp: Validator = a => XRP_RE.test(a);
const isXlm: Validator = a => XLM_RE.test(a);
const isAda: Validator = a => ADA_SHELLEY_RE.test(a) || ADA_BYRON_RE.test(a);
const isDot: Validator = a => DOT_RE.test(a);
const isSui: Validator = a => SUI_RE.test(a);
const isTon: Validator = a => TON_USER_RE.test(a) || TON_RAW_RE.test(a);

const VALIDATORS: Readonly<Record<string, Validator>> = {
  // EVM family — every chain SwapKit currently routes ZEC against that has
  // a smart-contract layer maps to the same address format.
  ARB: isEvm,
  AVAX: isEvm,
  BASE: isEvm,
  BERA: isEvm,
  BSC: isEvm,
  CRO: isEvm,
  ETH: isEvm,
  FTM: isEvm,
  GNOSIS: isEvm,
  KAVA: isEvm,
  LINEA: isEvm,
  MATIC: isEvm,
  MNT: isEvm,
  OP: isEvm,
  POL: isEvm,
  XLAYER: isEvm,
  // UTXO chains
  BTC: isBtc,
  BCH: isBch,
  LTC: isLtc,
  DOGE: isDoge,
  DASH: isDash,
  // Account-model and account-prefix chains
  SOL: isSol,
  NEAR: isNear,
  TRX: isTrx,
  ATOM: isAtom,
  XRP: isXrp,
  XLM: isXlm,
  ADA: isAda,
  DOT: isDot,
  SUI: isSui,
  TON: isTon,
};

/**
 * Returns true when the address is plausibly a valid wallet address on the
 * given chain. Empty strings always validate so that the caller's
 * "presence" check (`address.length > 0`) and the "format" check stay
 * orthogonal — surface validity in the UI only when the user has actually
 * typed something.
 */
export function isValidChainAddress(chain: string, address: string): boolean {
  const trimmed = address.trim();
  if (trimmed.length === 0) return true;
  const v = VALIDATORS[chain.toUpperCase()];
  if (!v) return true;
  return v(trimmed);
}

/**
 * Chains the address book / swap can offer AND validate: every chain we model a
 * validator for, plus ZEC (validated separately by zingolib). Derived from
 * `VALIDATORS` so adding a validator automatically surfaces the chain — there
 * is no parallel list to maintain. Encoding is the SwapKit chain code
 * ('ZEC','BTC','ETH'); the display name comes from `chainDisplayName`. ZEC/BTC/
 * ETH are pinned first for UX; the rest keep the `VALIDATORS` definition order.
 */
const PRIORITY_CHAINS: readonly string[] = ['ZEC', 'BTC', 'ETH'];
export const SWAP_ADDRESS_CHAINS: readonly string[] = [
  ...PRIORITY_CHAINS,
  ...Object.keys(VALIDATORS).filter(c => !PRIORITY_CHAINS.includes(c)),
];
