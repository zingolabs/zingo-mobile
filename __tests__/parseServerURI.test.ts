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

test.each([
  ['https://example.com:443/', 'https://example.com:443'],
  ['https://example.com:443/path', 'https://example.com:443'],
  ['https://example.com:443?x=1', 'https://example.com:443'],
  ['http://localhost:80/', 'http://localhost:80'],
])(
  'Tests that the parser keeps an explicit default port when a path or query follows it. %s',
  (uri, canonical) => {
    expect(parseServerURI(uri)).toEqual({
      kind: 'canonicalUri',
      uri: canonical,
    });
  },
);

test('Tests that the parser leaves the authority portless when only the path ends with a default port.', () => {
  expect(parseServerURI('https://example.com/a:443')).toEqual({
    kind: 'canonicalUri',
    uri: 'https://example.com',
  });
});

test.each([
  [String.raw`https:\\example.com:443\x`, 'https://example.com:443'],
  [String.raw`https://example.com:443\x`, 'https://example.com:443'],
  [String.raw`http:\\localhost:80\x`, 'http://localhost:80'],
  [String.raw`https:\example.com:443\x`, 'https://example.com:443'],
  ['https:example.com:443/x', 'https://example.com:443'],
  ['https:////example.com:443/x', 'https://example.com:443'],
  [String.raw`https://example.com\a:443`, 'https://example.com'],
  [String.raw`https:\\example.com:8443\x`, 'https://example.com:8443'],
])(
  'Tests that the parser preserves the authority port when separators vary: %s',
  (uri, canonical) => {
    expect(parseServerURI(uri)).toEqual({
      kind: 'canonicalUri',
      uri: canonical,
    });
  },
);

test.each([
  ['https://zec.rocks', 'https://zec.rocks'],
  ['https://EU.ZEC.ROCKS', 'https://eu.zec.rocks'],
  ['https://zec.rocks.', 'https://zec.rocks.'],
  ['https://example.com/?x=zec.rocks', 'https://example.com'],
  ['https://zec.rocks@example.com', 'https://example.com'],
  ['https://zec.rocks:8443', 'https://zec.rocks:8443'],
])(
  'Tests that the parser hands a portless authority on for zingolib to complete when parsing %s',
  (uri, canonical) => {
    expect(parseServerURI(uri)).toEqual({
      kind: 'canonicalUri',
      uri: canonical,
    });
  },
);
