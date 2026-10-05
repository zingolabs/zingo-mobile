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
  | { kind: 'seed'; words: string[]; invalid: number; complete: boolean };

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
  return {
    kind: 'seed',
    words,
    invalid,
    complete: invalid === 0 && words.length === SEED_WORD_COUNT,
  };
};
