/** bech32 and F4Jumble are bit arithmetic by definition (BIP 173, ZIP 316). */
/* eslint-disable no-bitwise */
import { blake2b } from '@noble/hashes/blake2.js';

/**
 * The Sapling receiver of a unified address, encoded on its own (ZIP 316).
 *
 * Maya pays a unified address through its Sapling receiver and Midgard indexes
 * the payout under that `zs1…`, never under the unified address. zingolib
 * hands back only the encoded unified address, so the receiver is decoded here.
 * Undefined for anything that is not a unified address with a Sapling receiver.
 */
export function saplingReceiverOf(address: string): string | undefined {
  const decoded = bech32Decode(address, BECH32M);
  const saplingHrp = decoded && SAPLING_HRP[decoded.hrp];
  if (!decoded || !saplingHrp) return undefined;
  const raw = convertBits(decoded.words, 5, 8, false);
  if (!raw || raw.length < 48) return undefined;
  const plain = f4Unjumble(Uint8Array.from(raw));
  const padding = new Uint8Array(PADDING_BYTES);
  padding.set(new TextEncoder().encode(decoded.hrp));
  const tail = plain.subarray(plain.length - PADDING_BYTES);
  if (!tail.every((byte, i) => byte === padding[i])) return undefined;
  const items = plain.subarray(0, plain.length - PADDING_BYTES);
  for (let at = 0; at < items.length;) {
    const typecode = compactSize(items, at);
    const length = typecode && compactSize(items, typecode.next);
    if (!length || length.next + length.value > items.length) return undefined;
    if (typecode.value === SAPLING_TYPECODE) {
      if (length.value !== SAPLING_RECEIVER_BYTES) return undefined;
      const receiver = items.subarray(length.next, length.next + length.value);
      const words = convertBits(Array.from(receiver), 8, 5, true);
      return words && bech32Encode(saplingHrp, words, BECH32);
    }
    at = length.next + length.value;
  }
  return undefined;
}

const SAPLING_TYPECODE = 0x02;
const SAPLING_RECEIVER_BYTES = 43;
const PADDING_BYTES = 16;
const SAPLING_HRP: Record<string, string> = {
  u: 'zs',
  utest: 'ztestsapling',
  uregtest: 'zregtestsapling',
};

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const BECH32 = 1;
const BECH32M = 0x2bc830a3;

function polymod(values: number[]): number {
  let check = 1;
  for (const value of values) {
    const top = check >>> 25;
    check = ((check & 0x1ffffff) << 5) ^ value;
    GENERATOR.forEach((g, i) => {
      if ((top >>> i) & 1) check ^= g;
    });
  }
  return check >>> 0;
}

function expandHrp(hrp: string): number[] {
  const codes = [...hrp].map(c => c.charCodeAt(0));
  return [...codes.map(c => c >> 5), 0, ...codes.map(c => c & 31)];
}

/** Unified addresses run past bech32's 90 characters, so no length limit. */
function bech32Decode(
  text: string,
  constant: number,
): { hrp: string; words: number[] } | undefined {
  const lower = text.toLowerCase();
  if (lower !== text && text.toUpperCase() !== text) return undefined;
  const separator = lower.lastIndexOf('1');
  if (separator < 1 || lower.length - separator < 7) return undefined;
  const hrp = lower.slice(0, separator);
  const data = [...lower.slice(separator + 1)].map(c => CHARSET.indexOf(c));
  if (data.includes(-1)) return undefined;
  if (polymod([...expandHrp(hrp), ...data]) !== constant) return undefined;
  return { hrp, words: data.slice(0, -6) };
}

function bech32Encode(hrp: string, words: number[], constant: number): string {
  const mod =
    polymod([...expandHrp(hrp), ...words, 0, 0, 0, 0, 0, 0]) ^ constant;
  const checksum = [0, 1, 2, 3, 4, 5].map(i => (mod >>> (5 * (5 - i))) & 31);
  return `${hrp}1${[...words, ...checksum].map(w => CHARSET[w]).join('')}`;
}

function convertBits(
  data: number[],
  from: number,
  to: number,
  pad: boolean,
): number[] | undefined {
  let acc = 0;
  let bits = 0;
  const max = (1 << to) - 1;
  const out: number[] = [];
  for (const value of data) {
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >>> bits) & max);
    }
  }
  if (pad) {
    if (bits > 0) out.push((acc << (to - bits)) & max);
  } else if (bits >= from || (acc << (to - bits)) & max) {
    return undefined;
  }
  return out;
}

function compactSize(
  bytes: Uint8Array,
  at: number,
): { value: number; next: number } | undefined {
  if (at >= bytes.length) return undefined;
  const first = bytes[at];
  if (first < 0xfd) return { value: first, next: at + 1 };
  if (first === 0xfd && at + 2 < bytes.length) {
    return { value: bytes[at + 1] | (bytes[at + 2] << 8), next: at + 3 };
  }
  return undefined;
}

function personalization(tag: string, tail: number[]): Uint8Array {
  const bytes = new Uint8Array(16);
  bytes.set(new TextEncoder().encode(tag));
  bytes.set(tail, 13);
  return bytes;
}

function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  return a.map((byte, i) => byte ^ b[i]);
}

function f4H(round: number, input: Uint8Array, length: number): Uint8Array {
  return blake2b(input, {
    dkLen: length,
    personalization: personalization('UA_F4Jumble_H', [round, 0, 0]),
  });
}

function f4G(round: number, input: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  for (let j = 0; j * 64 < length; j++) {
    const block = blake2b(input, {
      dkLen: 64,
      personalization: personalization('UA_F4Jumble_G', [
        round,
        j & 0xff,
        j >> 8,
      ]),
    });
    out.set(block.subarray(0, Math.min(64, length - j * 64)), j * 64);
  }
  return out;
}

function f4Unjumble(message: Uint8Array): Uint8Array {
  const left = Math.min(64, Math.floor(message.length / 2));
  const c = message.subarray(0, left);
  const d = message.subarray(left);
  const y = xor(c, f4H(1, d, left));
  const x = xor(d, f4G(1, y, d.length));
  const a = xor(y, f4H(0, x, left));
  const b = xor(x, f4G(0, a, x.length));
  const out = new Uint8Array(message.length);
  out.set(a);
  out.set(b, left);
  return out;
}
