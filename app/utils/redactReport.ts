import { escapeRegExp, orderBy } from 'lodash';
import { sanitizePaths } from './sanitizePaths';

const KEY: RegExp =
  /\b(?:uview(?:test|regtest)?|uivk(?:test|regtest)?|zxview\w*|zxviews\w*|secret-extended-key-\w+)1[02-9ac-hj-np-z]{20,}/gi;
const SHIELDED: RegExp =
  /\b(?:u|utest|uregtest|zs|ztestsapling|zregtestsapling|tex|textest)1[02-9ac-hj-np-z]{20,}/gi;
const TRANSPARENT: RegExp = /\bt[1-3m][1-9A-HJ-NP-Za-km-z]{30,40}\b/g;
const HASH: RegExp = /\b[0-9a-f]{32,}\b/gi;
const IPV4: RegExp = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6_BRACKETED: RegExp = /\[[0-9a-f:]{2,}\]/gi;
const IPV6_BARE: RegExp =
  /\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b|\b(?:[0-9a-f]{1,4}:){1,7}:(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){0,6})?\b/gi;

const hostPattern = (host: string): RegExp =>
  new RegExp(escapeRegExp(host), 'gi');

export const redactReport = (text: string, hosts: string[] = []): string =>
  orderBy(hosts, 'length', 'desc')
    .reduce(
      (out: string, host: string) => out.replace(hostPattern(host), '[host]'),
      sanitizePaths(text),
    )
    .replace(KEY, '[key]')
    .replace(SHIELDED, '[address]')
    .replace(TRANSPARENT, '[address]')
    .replace(HASH, '[hash]')
    .replace(IPV6_BRACKETED, '[host]')
    .replace(IPV6_BARE, '[host]')
    .replace(IPV4, '[host]');
