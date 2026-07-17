import Url from 'url-parse';
import { GlobalConst, TranslateType } from '../AppState';

// Audit Issue G — plaintext http:// is only acceptable when the user is
// pointing at a server running on the same device (local development,
// regtest, manual debugging). Anything else risks exposing wallet
// metadata over an unencrypted connection. url-parse normalises the
// hostname to lowercase and preserves IPv6 brackets, so we strip the
// brackets before checking and rely on lowercasing already happening.
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const isLocalHost = (hostname: string): boolean => {
  // Strip the [ ] brackets that url-parse keeps around IPv6 literals.
  const cleaned = hostname.replace(/^\[/, '').replace(/\]$/, '');
  return LOCAL_HOSTNAMES.has(cleaned.toLowerCase());
};

const parseServerURI = (
  uri: string,
  translate: (key: string) => TranslateType,
): string => {
  if (!uri || uri === '') {
    return translate('uris.baduri') as string;
  }

  const parsedUri = new Url(uri, true);
  if (
    !parsedUri ||
    !parsedUri.hostname ||
    !parsedUri.protocol ||
    (parsedUri.protocol !== GlobalConst.http &&
      parsedUri.protocol !== GlobalConst.https)
  ) {
    return translate('uris.baduri') as string;
  }

  // Reject http:// for any non-local host — see audit Issue G.
  if (
    parsedUri.protocol === GlobalConst.http &&
    !isLocalHost(parsedUri.hostname)
  ) {
    return translate('uris.error-http-not-allowed') as string;
  }

  let port = parsedUri.port;

  if (!port) {
    // I need to verify if the URI have a standard port like `443` or `80`
    if (
      parsedUri.protocol === GlobalConst.http &&
      uri.endsWith(':' + GlobalConst.port80)
    ) {
      // looking for 80
      port = GlobalConst.port80;
    }
    if (
      parsedUri.protocol === GlobalConst.https &&
      uri.endsWith(':' + GlobalConst.port443)
    ) {
      // looking for 443
      port = GlobalConst.port443;
    }
    // by default              -> 9067
    // for some `lightwalletd` ->  443
    // for `zec.rocks`         ->  443
    if (!port) {
      port =
        uri.includes('na.lightwalletd') ||
        uri.includes('sa.lightwalletd') ||
        uri.includes('eu.lightwalletd') ||
        uri.includes('ai.lightwalletd') ||
        uri.includes('zec.rocks')
          ? GlobalConst.port443
          : GlobalConst.port9067;
    }
  }

  return `${parsedUri.protocol}//${parsedUri.hostname}:${port}`;
};

export default parseServerURI;
