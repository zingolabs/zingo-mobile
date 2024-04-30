import Url from 'url-parse';
import { GlobalConst, TranslateType } from '../AppState';

const parseServerURI = (uri: string, translate: (key: string) => TranslateType): string => {
  if (!uri || uri === '') {
    return translate('uris.baduri') as string;
  }

  const parsedUri = new Url(uri, true);
  if (
    !parsedUri ||
    !parsedUri.hostname ||
    !parsedUri.protocol ||
    (parsedUri.protocol !== GlobalConst.http && parsedUri.protocol !== GlobalConst.https)
  ) {
    return translate('uris.baduri') as string;
  }

  let port = parsedUri.port;

  if (!port) {
    // I need to verify if the URI have a standard port like `443` or `80`
    if (parsedUri.protocol === GlobalConst.http && uri.endsWith(':' + GlobalConst.port80)) {
      // loking for 80
      port = GlobalConst.port80;
    }
    if (parsedUri.protocol === GlobalConst.https && uri.endsWith(':' + GlobalConst.port443)) {
      // loking for 443
      port = GlobalConst.port443;
    }
    // by default -> 9067
    // for some `lightwalletd` -> 443
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
