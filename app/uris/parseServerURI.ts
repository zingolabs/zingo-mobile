import Url from 'url-parse';
import { GlobalConst, TranslateType } from '../AppState';

const parseServerURI = (
  uri: string,
  translate: (key: string) => TranslateType,
): string => {
  if (!uri || uri === '') {
    return `error: ${translate('uris.baduri')}`;
  }

  const parsedUri = new Url(uri, true);
  console.log('PARSED URI ->', parsedUri);
  if (
    !parsedUri ||
    !parsedUri.hostname ||
    !parsedUri.protocol ||
    (parsedUri.protocol !== GlobalConst.http &&
      parsedUri.protocol !== GlobalConst.https)
  ) {
    return `error: ${translate('uris.baduri')}`;
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
