import Url from 'url-parse';

const parseServerURI = (uri: string): string => {
  if (!uri || uri === '') {
    return 'Error: Bad URI';
  }

  const parsedUri = new Url(uri, true);
  if (
    !parsedUri ||
    !parsedUri.hostname ||
    !parsedUri.protocol ||
    (parsedUri.protocol !== 'http:' && parsedUri.protocol !== 'https:')
  ) {
    return 'Error: Bad URI';
  }

  let port = parsedUri.port;

  if (!port) {
    // by default -> 9067
    // for `zecwallet` -> 443
    port = uri.includes('lwdv3.zecwallet') ? '443' : '9067';
  }

  return `${parsedUri.protocol}//${parsedUri.hostname}:${port}`;
};

export default parseServerURI;
