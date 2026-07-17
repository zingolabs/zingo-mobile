import parseServerURI from '../app/uris/parseServerURI';

// Returns the translation key verbatim so each test can check which
// branch the parser took without depending on the actual locale string.
const keyEcho = (key: string) => key;

// Audit Issue G — parseServerURI must reject plaintext http:// for any
// non-local host and accept it only when the user is pointing at a
// server on the same device.
describe('parseServerURI — Issue G plaintext rules', () => {
  test('https remote → accepted', () => {
    const r = parseServerURI('https://zec.rocks:443', keyEcho);
    expect(r).toBe('https://zec.rocks:443');
  });

  test('http remote → http-not-allowed error', () => {
    const r = parseServerURI('http://example.com:9067', keyEcho);
    expect(r).toBe('uris.error-http-not-allowed');
  });

  test('http localhost → accepted', () => {
    const r = parseServerURI('http://localhost:9067', keyEcho);
    expect(r).toBe('http://localhost:9067');
  });

  test('http 127.0.0.1 → accepted', () => {
    const r = parseServerURI('http://127.0.0.1:9067', keyEcho);
    expect(r).toBe('http://127.0.0.1:9067');
  });

  test('http ::1 (IPv6 loopback) → accepted', () => {
    const r = parseServerURI('http://[::1]:9067', keyEcho);
    expect(r).toBe('http://[::1]:9067');
  });

  test('https localhost → accepted', () => {
    const r = parseServerURI('https://localhost:9067', keyEcho);
    expect(r).toBe('https://localhost:9067');
  });

  test('empty uri → bad uri error (pre-existing behaviour)', () => {
    const r = parseServerURI('', keyEcho);
    expect(r).toBe('uris.baduri');
  });

  test('ftp protocol → bad uri error (pre-existing behaviour)', () => {
    const r = parseServerURI('ftp://anything.com:9067', keyEcho);
    expect(r).toBe('uris.baduri');
  });

  test('uppercase Localhost → accepted (hostname normalized to lowercase)', () => {
    const r = parseServerURI('http://Localhost:9067', keyEcho);
    expect(r).toBe('http://localhost:9067');
  });
});
