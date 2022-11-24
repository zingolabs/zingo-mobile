import Url from 'url-parse';

export const parseServerURI = (uri: string): string => {
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

  return 'URI is OK';
};
