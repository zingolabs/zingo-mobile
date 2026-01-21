export function reverseHex32Bytes(hex: string): string {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]{64}$/.test(h)) {
    throw new Error(`reverseHex32Bytes: expected 64 hex chars, got "${hex}"`);
  }
  return h
    .match(/../g)! // split into bytes
    .reverse() // reverse byte order
    .join('')
    .toLowerCase();
}
