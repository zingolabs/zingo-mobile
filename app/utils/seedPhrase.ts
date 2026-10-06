import { sha256 } from '@noble/hashes/sha2.js';
import { BIP39_ENGLISH } from './bip39English';
import { GlobalConst } from '@app/AppState';

export const SEED_WORD_COUNT = 24;
export const SUGGESTION_LIMIT = 3;

const KEY_PREFIXES = [
  GlobalConst.uview,
  GlobalConst.uviewtest,
  GlobalConst.uviewregtest,
];

export type SeedStatus =
  | { kind: 'empty' }
  | { kind: 'ufvk'; key: string }
  | {
      kind: 'seed';
      words: string[];
      invalid: number;
      // Every word is in the list but the last bits do not match the checksum.
      badChecksum: boolean;
      complete: boolean;
    };

export const isViewingKey = (text: string): boolean => {
  const lower = text.trim().toLowerCase();
  return KEY_PREFIXES.some(p => lower.startsWith(p));
};

export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(t => t.length > 0);

const lowerBound = (prefix: string): number => {
  let lo = 0;
  let hi = BIP39_ENGLISH.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (BIP39_ENGLISH[mid] < prefix) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
};

export const isSeedWord = (word: string): boolean => {
  const i = lowerBound(word);
  return BIP39_ENGLISH[i] === word;
};

const toBits = (n: number, width: number): string =>
  n.toString(2).padStart(width, '0');

// True when the words carry the checksum BIP-39 appends: the first ENT/32 bits
// of SHA-256 over the entropy the other bits encode.
export const checksumValid = (words: string[]): boolean => {
  if (
    words.length < 12 ||
    words.length > 24 ||
    words.length % 3 !== 0 ||
    !words.every(isSeedWord)
  ) {
    return false;
  }
  const bits = words.map(w => toBits(lowerBound(w), 11)).join('');
  const checksumBits = words.length / 3;
  const entropyBits = bits.slice(0, bits.length - checksumBits);
  const entropy = new Uint8Array(entropyBits.length / 8);
  for (let i = 0; i < entropy.length; i++) {
    entropy[i] = parseInt(entropyBits.slice(i * 8, i * 8 + 8), 2);
  }
  const hashBits = Array.from(sha256(entropy))
    .map(b => toBits(b, 8))
    .join('');
  return hashBits.slice(0, checksumBits) === bits.slice(-checksumBits);
};

export const suggestWords = (
  prefix: string,
  limit: number = SUGGESTION_LIMIT,
): string[] => {
  const p = prefix.toLowerCase();
  if (!p) {
    return [];
  }
  const out: string[] = [];
  for (let i = lowerBound(p); i < BIP39_ENGLISH.length; i++) {
    const w = BIP39_ENGLISH[i];
    if (!w.startsWith(p)) {
      break;
    }
    out.push(w);
    if (out.length === limit) {
      break;
    }
  }
  return out;
};

export const resolveWord = (draft: string): string | null => {
  const d = draft.toLowerCase();
  if (isSeedWord(d)) {
    return d;
  }
  return suggestWords(d, 1)[0] ?? null;
};

export const seedStatus = (value: string): SeedStatus => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { kind: 'empty' };
  }
  if (isViewingKey(trimmed)) {
    return { kind: 'ufvk', key: trimmed };
  }
  const words = tokenize(trimmed);
  const invalid = words.filter(w => !isSeedWord(w)).length;
  const full = invalid === 0 && words.length === SEED_WORD_COUNT;
  const checksumOk = full && checksumValid(words);
  return {
    kind: 'seed',
    words,
    invalid,
    badChecksum: full && !checksumOk,
    complete: checksumOk,
  };
};
