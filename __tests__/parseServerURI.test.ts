import parseServerURI from '@app/uris/parseServerURI';

// Audit Issue G — parseServerURI must reject plaintext http:// for any
// non-local host and accept it only when the user is pointing at a
// server on the same device. Audit Issue R — the parser is pure: errors
// come back as ErrorKeys in a tagged union, never as locale prose.
describe('parseServerURI — Issue G plaintext rules', () => {
  test('https remote → accepted', () => {
    expect(parseServerURI('https://zec.rocks:443')).toEqual({
      kind: 'canonicalUri',
      uri: 'https://zec.rocks:443',
    });
  });

  test('http remote → http-not-allowed error', () => {
    expect(parseServerURI('http://example.com:9067')).toEqual({
      kind: 'error',
      errorKey: 'uris.error-http-not-allowed',
    });
  });

  test('http localhost → accepted', () => {
    expect(parseServerURI('http://localhost:9067')).toEqual({
      kind: 'canonicalUri',
      uri: 'http://localhost:9067',
    });
  });

  test('http 127.0.0.1 → accepted', () => {
    expect(parseServerURI('http://127.0.0.1:9067')).toEqual({
      kind: 'canonicalUri',
      uri: 'http://127.0.0.1:9067',
    });
  });

  test('http ::1 (IPv6 loopback) → accepted', () => {
    expect(parseServerURI('http://[::1]:9067')).toEqual({
      kind: 'canonicalUri',
      uri: 'http://[::1]:9067',
    });
  });

  test('https localhost → accepted', () => {
    expect(parseServerURI('https://localhost:9067')).toEqual({
      kind: 'canonicalUri',
      uri: 'https://localhost:9067',
    });
  });

  test('empty uri → bad uri error (pre-existing behaviour)', () => {
    expect(parseServerURI('')).toEqual({
      kind: 'error',
      errorKey: 'uris.baduri',
    });
  });

  test('ftp protocol → bad uri error (pre-existing behaviour)', () => {
    expect(parseServerURI('ftp://anything.com:9067')).toEqual({
      kind: 'error',
      errorKey: 'uris.baduri',
    });
  });

  test('uppercase Localhost → accepted (hostname normalized to lowercase)', () => {
    expect(parseServerURI('http://Localhost:9067')).toEqual({
      kind: 'canonicalUri',
      uri: 'http://localhost:9067',
    });
  });
});
