import { GlobalConst, TranslateType } from '../AppState';

const parseServerURI = (
  rawUri: string,
  translate: (key: string) => TranslateType,
): string => {
  const trimmed = rawUri?.trim();

  if (!trimmed) {
    return `error: ${translate('uris.baduri')}`;
  }

  const normalizedInput = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(normalizedInput);
    const protocol = parsed.protocol.replace(':', '');

    if (protocol !== 'http' && protocol !== 'https') {
      return `error: ${translate('uris.baduri')}`;
    }

    let port = parsed.port;

    if (!port) {
      port = protocol === 'http' ? GlobalConst.port80 : GlobalConst.port443;
    }

    return `${protocol}://${parsed.hostname}:${port}`;
  } catch {
    return `error: ${translate('uris.baduri')}`;
  }
};
export default parseServerURI;
