import { Base64 } from 'js-base64';
import Url from 'url-parse';
import ZcashURITargetClass from './classes/ZcashURITargetClass';
import {
  ServerType,
  ErrorKeyed,
  errorKeyed,
  GlobalConst,
  ZcashUriFieldEnum,
} from '../AppState';
import Utils from '../utils';

export type ZcashUriErrorKey =
  | 'uris.baduri'
  | 'uris.notvalid'
  | 'uris.notvalidparameter'
  | 'uris.notvalidvalue'
  | 'uris.duplicateparameter'
  | 'uris.memo-too-long'
  | 'uris.base64'
  | 'uris.amount'
  | 'uris.noparameter'
  | 'uris.noaddress';

// Audit Issue H — a failure result carries no target at all, so a
// malformed URI cannot prefill Send state. Audit Issue R — the parser
// fails fast on the first defect and reports it as an ErrorKey plus the
// offending fragment; the display edge renders the prose.
export type ParseZcashUriResult =
  | { kind: 'paymentTarget'; target: ZcashURITargetClass }
  | ErrorKeyed<ZcashUriErrorKey>;

const err = (
  errorKey: ZcashUriErrorKey,
  param?: string,
): ErrorKeyed<ZcashUriErrorKey> => errorKeyed(errorKey, param);

const parseZcashURI = async (
  uri: string,
  server: ServerType,
): Promise<ParseZcashUriResult> => {
  if (!uri) {
    return err('uris.baduri');
  }

  const parsedUri = new Url(uri, true);
  if (!parsedUri || parsedUri.protocol.toLowerCase() !== GlobalConst.zcash) {
    return err('uris.baduri');
  }

  const targets: Map<number, ZcashURITargetClass> = new Map();

  // The first address is special, it can be the "host" part of the URI
  const address = parsedUri.pathname;

  const t = new ZcashURITargetClass();
  if (address) {
    const validAddress: { isValid: boolean; shieldedOnlyUA: string } =
      await Utils.isValidAddress(address, server.chainName);

    if (!validAddress.isValid) {
      return err('uris.notvalid');
    }
    t.address = address;
  }
  targets.set(0, t);

  // Go over all the query params
  const params = parsedUri.query;

  for (const [q, value] of Object.entries(params)) {
    const [qName, qIdxS, extra] = q.split('.');
    if (typeof extra !== 'undefined') {
      return err('uris.notvalidparameter', q);
    }

    if (typeof value !== 'string') {
      return err('uris.notvalidvalue', q);
    }

    const qIdx = parseInt(qIdxS, 10) || 0;

    let target = targets.get(qIdx);
    if (!target) {
      target = new ZcashURITargetClass();
      targets.set(qIdx, target);
    }

    switch (qName.toLowerCase()) {
      case ZcashUriFieldEnum.address:
        if (typeof target.address !== 'undefined') {
          return err('uris.duplicateparameter', qName);
        }
        const validAddress: { isValid: boolean; shieldedOnlyUA: string } =
          await Utils.isValidAddress(value, server.chainName);

        if (!validAddress.isValid) {
          return err('uris.notvalid');
        }
        target.address = value;
        break;
      case ZcashUriFieldEnum.label:
        if (typeof target.label !== 'undefined') {
          return err('uris.duplicateparameter', qName);
        }
        target.label = value;
        break;
      case ZcashUriFieldEnum.message:
        if (typeof target.message !== 'undefined') {
          return err('uris.duplicateparameter', qName);
        }
        target.message = value;
        break;
      case ZcashUriFieldEnum.memo:
        if (typeof target.memoBase64 !== 'undefined') {
          return err('uris.duplicateparameter', qName);
        }
        // Audit Issue O — bound the memo BEFORE decoding. Base64 encoding
        // groups 3 input bytes into 4 output chars, so the largest valid
        // base64 string that decodes to N bytes is `4 * ceil(N / 3)` chars
        // (including padding). Rejecting on the encoded length first avoids
        // allocating the decoded buffer for a malicious URI that ships a
        // multi-MB memo parameter. The previous code silently truncated,
        // which the audit explicitly recommended against — untrusted input
        // should be rejected, not partially accepted into Send state.
        const maxBase64Length = 4 * Math.ceil(GlobalConst.memoMaxLength / 3);
        if (value.length > maxBase64Length) {
          return err('uris.memo-too-long', qName);
        }
        try {
          const decoded = Base64.decode(value);
          if (decoded.length > GlobalConst.memoMaxLength) {
            // Defensive: the encoded-length bound is the strict max for
            // padded base64; unusual inputs (no padding, non-canonical
            // chars accepted by the decoder) could still decode to more
            // than `memoMaxLength`. Reject any decoded result that
            // exceeds the actual limit.
            return err('uris.memo-too-long', qName);
          }
          target.memoString = decoded;
          target.memoBase64 = Base64.encode(target.memoString);
        } catch (e) {
          return err('uris.base64', value);
        }
        break;
      case ZcashUriFieldEnum.amount:
        if (typeof target.amount !== 'undefined') {
          return err('uris.duplicateparameter', qName);
        }
        const a = parseFloat(value);
        if (isNaN(a) || a < 0 || a > 21_000_000) {
          return err('uris.amount', value);
        }
        target.amount = a;
        break;
      default:
        return err('uris.noparameter', qName);
    }
  }

  // using only the first one.
  const firstTarget = targets.get(0);

  // If there is only 1 entry, make sure it has at least an address
  if (typeof firstTarget?.address === 'undefined') {
    return err('uris.noaddress');
  }

  return { kind: 'paymentTarget', target: firstTarget };
};

export default parseZcashURI;
