import { sanitizePaths } from './sanitizePaths';

// Bech32 data characters: every letter and digit but 1, b, i and o.
const BECH32 = '[02-9ac-hj-np-z]';
// Base58 characters: no 0, O, I or l.
const BASE58 = '[1-9A-HJ-NP-Za-km-z]';

const KEY = new RegExp(
  `\\b(?:uview(?:test|regtest)?|uivk(?:test|regtest)?|zxview\\w*|zxviews\\w*|secret-extended-key-\\w+)1${BECH32}{20,}`,
  'gi',
);
const SHIELDED = new RegExp(
  `\\b(?:u|utest|uregtest|zs|ztestsapling|zregtestsapling|tex|textest)1${BECH32}{20,}`,
  'gi',
);
const TRANSPARENT = new RegExp(`\\bt[1-3m]${BASE58}{30,40}\\b`, 'g');
const HASH = /\b[0-9a-f]{32,}\b/gi;
const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6 = /\[[0-9a-f:]{2,}\]/gi;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Strips what could identify a person from text a report sends: user
 * folders in paths, viewing and spending keys, addresses, transaction or
 * block hashes, IP addresses and the given private hosts (a custom
 * server's uri and host).
 */
export const redactReport = (text: string, hosts: string[] = []): string => {
  if (!text) {
    return text;
  }
  let out = sanitizePaths(text);
  hosts
    .filter(h => !!h)
    .sort((a, b) => b.length - a.length)
    .forEach(h => {
      out = out.replace(new RegExp(escapeRegExp(h), 'gi'), '[host]');
    });
  return out
    .replace(KEY, '[key]')
    .replace(SHIELDED, '[address]')
    .replace(TRANSPARENT, '[address]')
    .replace(HASH, '[hash]')
    .replace(IPV6, '[host]')
    .replace(IPV4, '[host]');
};
