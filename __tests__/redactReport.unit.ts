import { redactReport } from '@app/utils/redactReport';

const UA =
  'u1qxy0r7fsl8q2r2gk8c3v4w6d5p9j7h3k2m4n6p8q0s2t4v6w8x0y2z4a6c8e0g2h4j6k8m0n2p4q6';
const SAPLING =
  'zs1qxy0r7fsl8q2r2gk8c3v4w6d5p9j7h3k2m4n6p8q0s2t4v6w8x0y2z4a6c8e0g2h4j6k8m0n';
const TADDR = 't1Rv4exT7bqhZqi2j7xz8bUHDMxwosrjADU';
const UFVK =
  'uview1qxy0r7fsl8q2r2gk8c3v4w6d5p9j7h3k2m4n6p8q0s2t4v6w8x0y2z4a6c8e0g2h4j6k8m0n2';
const TXID = 'a3f5c9e1b7d2468013579bdf02468ace13579bdf02468ace13579bdf02468ace';

test('Tests that addresses, keys and hashes become labels when a report quotes them', () => {
  const text = `send to ${UA} from ${SAPLING} and ${TADDR}; key ${UFVK}; tx ${TXID}`;
  expect(redactReport(text)).toBe(
    'send to [address] from [address] and [address]; key [key]; tx [hash]',
  );
});

test('Tests that IP literals and the given hosts become [host] when a public server stands beside them', () => {
  const hosts = ['https://node.alice.home:9067', 'node.alice.home'];
  const out = redactReport(
    'dial https://node.alice.home:9067 failed, peer 192.168.1.20, [fe80::1] and 2001:db8::1, then https://zec.rocks:443',
    hosts,
  );
  expect(out).toBe(
    'dial [host] failed, peer [host], [host] and [host], then https://zec.rocks:443',
  );
  expect(hosts).toEqual(['https://node.alice.home:9067', 'node.alice.home']);
});

test('Tests that a bracketed IPv6 host becomes [host] when the custom server is an IPv6 literal. Other brackets stay.', () => {
  expect(
    redactReport('at [native code] dialing http://[::1]:9067', [
      'http://[::1]:9067',
      '[::1]',
    ]),
  ).toBe('at [native code] dialing [host]');
});

test('Tests that the user folder in a path becomes <user> when a stack frame names it', () => {
  expect(redactReport('at /Users/alice/app/index.js')).toBe(
    'at /Users/<user>/app/index.js',
  );
});

test('Tests that versions, heights, times and short ids pass through when a report quotes them', () => {
  const text =
    'Zingo 2.0.23 (337), zingolib 14707626c, height 3512840 at 14:03:05';
  expect(redactReport(text)).toBe(text);
  expect(redactReport('')).toBe('');
});
