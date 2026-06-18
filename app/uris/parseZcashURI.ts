import { Base64 } from 'js-base64';
import Url from 'url-parse';
import ZcashURITargetClass from './classes/ZcashURITargetClass';
import {
  ServerType,
  TranslateType,
  GlobalConst,
  ZcashUriFieldEnum,
} from '../AppState';
import Utils from '../utils';

// Audit Issue H — when `error` is non-empty the returned `target` is
// guaranteed to be a fresh empty ZcashURITargetClass. Callers may treat
// `error` and `target` as mutually exclusive: a non-empty error means
// no fields are safe to apply to UI state.
const parseZcashURI = async (
  uri: string,
  translate: (key: string) => TranslateType,
  server: ServerType,
): Promise<{ error: string; target: ZcashURITargetClass }> => {
  if (!uri || uri === '') {
    return {
      error: translate('uris.baduri') as string,
      target: new ZcashURITargetClass(),
    };
  }

  const parsedUri = new Url(uri, true);
  if (!parsedUri || parsedUri.protocol.toLowerCase() !== GlobalConst.zcash) {
    return {
      error: translate('uris.baduri') as string,
      target: new ZcashURITargetClass(),
    };
  }

  //console.log(parsedUri);

  const errors: string[] = [];
  const targets: Map<number, ZcashURITargetClass> = new Map();

  // The first address is special, it can be the "host" part of the URI
  const address = parsedUri.pathname;
  //console.log(address);

  // Has to have at least 1 element
  const t = new ZcashURITargetClass();
  if (address) {
    t.address = address;
    const validAddress: { isValid: boolean; onlyOrchardUA: string } =
      await Utils.isValidAddress(address, server.chainName);

    if (!validAddress.isValid) {
      errors.push(`${translate('uris.notvalid')}`);
    }
  }
  targets.set(0, t);

  // Go over all the query params
  const params = parsedUri.query;

  for (const [q, value] of Object.entries(params)) {
    const [qName, qIdxS, extra] = q.split('.');
    if (typeof extra !== 'undefined') {
      errors.push(`"${q}" ${translate('uris.notvalidparameter')}`);
      continue;
    }

    if (typeof value !== 'string') {
      errors.push(`${translate('uris.notvalidvalue')} "${q}"`);
      continue;
    }

    const qIdx = parseInt(qIdxS, 10) || 0;

    if (!targets.has(qIdx)) {
      targets.set(qIdx, new ZcashURITargetClass());
    }

    const target = targets.get(qIdx);
    if (!target) {
      errors.push(`${translate('uris.noindex')} ${qIdx}`);
      continue;
    }

    switch (qName.toLowerCase()) {
      case ZcashUriFieldEnum.address:
        if (typeof target.address !== 'undefined') {
          errors.push(`${translate('uris.duplicateparameter')} "${qName}"`);
          break;
        }
        const validAddress: { isValid: boolean; onlyOrchardUA: string } =
          await Utils.isValidAddress(value, server.chainName);

        if (!validAddress.isValid) {
          errors.push(`${translate('uris.notvalid')}`);
        }
        target.address = value;
        break;
      case ZcashUriFieldEnum.label:
        if (typeof target.label !== 'undefined') {
          errors.push(`${translate('uris.duplicateparameter')} "${qName}"`);
        } else {
          target.label = value;
        }
        break;
      case ZcashUriFieldEnum.message:
        if (typeof target.message !== 'undefined') {
          errors.push(`${translate('uris.duplicateparameter')} "${qName}"`);
        } else {
          target.message = value;
        }
        break;
      case ZcashUriFieldEnum.memo:
        if (typeof target.memoBase64 !== 'undefined') {
          errors.push(`${translate('uris.duplicateparameter')} "${qName}"`);
        } else {
          // Parse as base64
          try {
            const decoded = Base64.decode(value);
            if (decoded.length > GlobalConst.memoMaxLength) {
              console.log(
                `URI memo truncated from ${decoded.length} to ${GlobalConst.memoMaxLength} bytes`,
              );
            }
            target.memoString = decoded.slice(0, GlobalConst.memoMaxLength);
            target.memoBase64 = Base64.encode(target.memoString);
          } catch (e) {
            errors.push(`${translate('uris.base64')} "${value}"`);
          }
        }
        break;
      case ZcashUriFieldEnum.amount:
        if (typeof target.amount !== 'undefined') {
          errors.push(`${translate('uris.duplicateparameter')} "${qName}"`);
          break;
        }
        const a = parseFloat(value);
        if (isNaN(a) || a < 0 || a > 21_000_000) {
          errors.push(`${translate('uris.amount')} "${value}"`);
          break;
        }
        target.amount = a;
        break;
      default:
        errors.push(`${translate('uris.noparameter')} "${qName}"`);
    }
  }

  // using only the first one.
  const firstTarget = targets.get(0);

  if (!firstTarget) {
    errors.push(translate('uris.oneentry') as string);
    return { error: errors.join(', '), target: new ZcashURITargetClass() };
  }

  // If there is only 1 entry, make sure it has at least an address
  if (typeof firstTarget?.address === 'undefined') {
    errors.push(`${0}. ${translate('uris.noaddress')}`);
  }

  // Audit Issue H — any parser error invalidates the whole target. The
  // path-as-address and query-string address branches assign t.address
  // before validating, so a target with a non-empty address can still
  // accompany a non-empty errors list. Returning a fresh empty target
  // here closes that gap for every caller.
  if (errors.length > 0) {
    return { error: errors.join(', '), target: new ZcashURITargetClass() };
  }
  return { error: '', target: firstTarget };
};

export default parseZcashURI;
