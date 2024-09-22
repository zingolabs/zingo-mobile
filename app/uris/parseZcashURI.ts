import { Base64 } from 'js-base64';
import Url from 'url-parse';
import ZcashURITargetClass from './classes/ZcashURITargetClass';
import { ServerType, TranslateType, GlobalConst } from '../AppState';
import Utils from '../utils';

const parseZcashURI = async (
  uri: string,
  translate: (key: string) => TranslateType,
  server: ServerType,
): Promise<string | ZcashURITargetClass> => {
  if (!uri || uri === '') {
    return translate('uris.baduri') as string;
  }

  const parsedUri = new Url(uri, true);
  if (!parsedUri || parsedUri.protocol.toLowerCase() !== GlobalConst.zcash) {
    return translate('uris.baduri') as string;
  }
  //console.log(parsedUri);

  const targets: Map<number, ZcashURITargetClass> = new Map();

  // The first address is special, it can be the "host" part of the URI
  const address = parsedUri.pathname;
  //console.log(address);

  if (address) {
    const validAddress: boolean = await Utils.isValidAdress(address, server.chainName);

    if (!validAddress) {
      return `"${address || ''}" ${translate('uris.notvalid')}`;
    }
  }

  // Has to have at least 1 element
  const t = new ZcashURITargetClass();
  if (address) {
    t.address = address;
  }
  targets.set(0, t);

  // Go over all the query params
  const params = parsedUri.query;

  for (const [q, value] of Object.entries(params)) {
    const [qName, qIdxS, extra] = q.split('.');
    if (typeof extra !== 'undefined') {
      return `"${q}" ${translate('uris.notvalidparameter')}`;
    }

    if (typeof value !== 'string') {
      return `${translate('uris.notvalidvalue')} "${q}"`;
    }

    const qIdx = parseInt(qIdxS, 10) || 0;

    if (!targets.has(qIdx)) {
      targets.set(qIdx, new ZcashURITargetClass());
    }

    const target = targets.get(qIdx);
    if (!target) {
      return `${translate('uris.noindex')} ${qIdx}`;
    }

    switch (qName.toLowerCase()) {
      case 'address':
        if (typeof target.address !== 'undefined') {
          return `${translate('uris.duplicateparameter')} "${qName}"`;
        }
        const validAddress: boolean = await Utils.isValidAdress(value, server.chainName);

        if (!validAddress) {
          return `"${value}" ${translate('uris.notvalid')}`;
        }
        target.address = value;
        break;
      case 'label':
        if (typeof target.label !== 'undefined') {
          return `${translate('uris.duplicateparameter')} "${qName}"`;
        }
        target.label = value;
        break;
      case 'message':
        if (typeof target.message !== 'undefined') {
          return `${translate('uris.duplicateparameter')} "${qName}"`;
        }
        target.message = value;
        break;
      case 'memo':
        if (typeof target.memoBase64 !== 'undefined') {
          return `${translate('uris.duplicateparameter')} "${qName}"`;
        }

        // Parse as base64
        try {
          target.memoString = Base64.decode(value);
          target.memoBase64 = value;
        } catch (e) {
          return `${translate('uris.base64')} "${value}"`;
        }

        break;
      case 'amount':
        if (typeof target.amount !== 'undefined') {
          return `${translate('uris.duplicateparameter')} "${qName}"`;
        }
        const a = parseFloat(value);
        if (isNaN(a)) {
          return `${translate('uris.amount')} "${value}"`;
        }

        target.amount = a;
        break;
      default:
        return `${translate('uris.noparameter')} "${qName}"`;
    }
  }

  // Make sure everyone has at least an amount and address
  if (targets.size > 1) {
    for (const [key, value] of targets) {
      if (typeof value.amount === 'undefined') {
        return `${key}. ${translate('uris.noamount')}`;
      }

      if (typeof value.address === 'undefined') {
        return `${key}. ${translate('uris.noaddress')}`;
      }
    }
  } else {
    // If there is only 1 entry, make sure it has at least an address
    if (!targets.get(0)) {
      return translate('uris.oneentry') as string;
    }

    if (typeof targets.get(0)?.address === 'undefined') {
      return `${0}. ${translate('uris.noaddress')}`;
    }
  }

  // Convert to plain array
  const ans: ZcashURITargetClass[] = new Array(targets.size);
  targets.forEach((tgt, idx) => {
    ans[idx] = tgt;
  });

  // Make sure no elements were skipped
  //const testAns: ZcashURITarget[] = ans;
  //if (testAns.includes(undefined)) {
  //  return 'Some indexes were missing';
  //}

  // if the URI have several addresses I get only the first one.
  return ans[0];
};

export default parseZcashURI;
