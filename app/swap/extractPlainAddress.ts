/**
 * Reduce a scanned/pasted payment string to the bare wallet address.
 *
 * Other apps, exchanges and websites encode their QR codes as payment URIs, not
 * bare addresses:
 *   - BIP-21   `bitcoin:1A1zP…?amount=0.1&label=Foo`
 *   - EIP-681  `ethereum:0xabc…@1?value=1000000000000000000`
 *   - cashaddr `bitcoincash:qptt…`
 *   - litecoin / dogecoin / dash BIP-21 variants, etc.
 *
 * The per-chain validators expect the bare address, so before validating /
 * detecting the chain we strip the wrapper down to just the address:
 *   - a leading URI scheme `<scheme>:` — a scheme starts with a letter (RFC
 *     3986), so a TON *raw* address (`0:<hex>` / `-1:<hex>`, which starts with a
 *     digit or `-`) is deliberately left intact,
 *   - an optional `//` authority separator right after the scheme,
 *   - an EIP-681 `@<chainId>` suffix,
 *   - any `?<query>` string (amount, label, memo, …).
 *
 * A plain address (no scheme, no query) passes through unchanged. Zcash
 * `zcash:` URIs are normally handled upstream by `parseZcashURI` (which also
 * reads the amount), but they reduce correctly here too.
 *
 * Note: path-style deep links (e.g. `ton://transfer/<addr>`) are not unwrapped
 * — only the flat `scheme:address[?query]` form that QR standards use.
 */
export function extractPlainAddress(input: string): string {
  let s = (input || '').trim();
  // Strip a leading URI scheme. Letters-first requirement keeps numeric TON raw
  // addresses (`0:…`) untouched.
  s = s.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:/, '');
  // Drop an authority separator if the scheme used `scheme://`.
  s = s.replace(/^\/\//, '');
  // Drop the EIP-681 chain-id suffix and any query string.
  s = s.split('@')[0].split('?')[0];
  return s.trim();
}
