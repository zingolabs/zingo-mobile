import parseServerURI from '@app/uris/parseServerURI';

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

test('Tests that the parser keeps port 9067 when the path ends with a default port.', () => {
  expect(parseServerURI('https://example.com/a:443')).toEqual({
    kind: 'canonicalUri',
    uri: 'https://example.com:9067',
  });
});
