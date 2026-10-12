import { redactReport } from '@app/utils/redactReport';

const UA =
  'u1qxy0r7fsl8q2r2gk8c3v4w6d5p9j7h3k2m4n6p8q0s2t4v6w8x0y2z4a6c8e0g2h4j6k8m0n2p4q6';
const SAPLING =
  'zs1qxy0r7fsl8q2r2gk8c3v4w6d5p9j7h3k2m4n6p8q0s2t4v6w8x0y2z4a6c8e0g2h4j6k8m0n';
const TADDR = 't1Rv4exT7bqhZqi2j7xz8bUHDMxwosrjADU';
const UFVK =
  'uview1qxy0r7fsl8q2r2gk8c3v4w6d5p9j7h3k2m4n6p8q0s2t4v6w8x0y2z4a6c8e0g2h4j6k8m0n2';
const TXID = 'a3f5c9e1b7d2468013579bdf02468ace13579bdf02468ace13579bdf02468ace';

test('addresses, keys and hashes never reach a report', () => {
  const text = `send to ${UA} from ${SAPLING} and ${TADDR}; key ${UFVK}; tx ${TXID}`;
  const out = redactReport(text);
  [UA, SAPLING, TADDR, UFVK, TXID].forEach(s => expect(out).not.toContain(s));
  expect(out).toBe(
    'send to [address] from [address] and [address]; key [key]; tx [hash]',
  );
});

test('IPs and a private server are hidden, a public one stays', () => {
  const out = redactReport(
    'dial https://node.alice.home:9067 failed, peer 192.168.1.20 and [fe80::1], then https://zec.rocks:443',
    ['https://node.alice.home:9067', 'node.alice.home'],
  );
  expect(out).toBe(
    'dial [host] failed, peer [host] and [host], then https://zec.rocks:443',
  );
});

test('user folders in paths are still anonymized', () => {
  expect(redactReport('at /Users/alice/app/index.js')).toBe(
    'at /Users/<user>/app/index.js',
  );
});

test('versions, heights and short ids are left alone', () => {
  const text = 'Zingo 2.0.23 (337), zingolib 14707626c, height 3512840';
  expect(redactReport(text)).toBe(text);
});
