import Url from 'url-parse';
import { TranslateType } from '../AppState';

const parseServerURI = (uri: string, translate: (key: string) => TranslateType): string => {
  if (!uri || uri === '') {
    return translate('uris.baduri') as string;
  }

  const parsedUri = new Url(uri, true);
  if (
    !parsedUri ||
    !parsedUri.hostname ||
    !parsedUri.protocol ||
    (parsedUri.protocol !== 'http:' && parsedUri.protocol !== 'https:')
  ) {
    return translate('uris.baduri') as string;
  }

  let port = parsedUri.port;

  if (!port) {
    // I need to verify if the URI have a standard port like `443` or `80`
    if (parsedUri.protocol === 'http:' && uri.includes(':80')) {
      // loking for 80
      port = '80';
    }
    if (parsedUri.protocol === 'https:' && uri.includes(':443')) {
      // loking for 443
      port = '443';
    }
    // by default -> 9067
    // for `zecwallet` -> 443
    if (!port) {
      port = uri.includes('lwdv3.zecwallet') ? '443' : '9067';
    }
  }

  return `${parsedUri.protocol}//${parsedUri.hostname}:${port}`;
};

export default parseServerURI;
