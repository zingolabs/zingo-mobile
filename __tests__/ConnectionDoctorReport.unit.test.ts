/**
 * @format
 */

import {
  connectionDoctorReport,
  DOCTOR_REPORT_HEADLINE,
} from '../app/walletBackend/transforms/connectionDoctorReport';

const okLeg = { ok: true, detail: 'chain main, height 3110000', millis: 412 };
const failLeg = { ok: false, detail: 'tls handshake eof', millis: 15000 };

describe('connectionDoctorReport', () => {
  test('every run renders under the stable headline', () => {
    const report = connectionDoctorReport([]);
    expect(report.startsWith(`## ${DOCTOR_REPORT_HEADLINE}`)).toEqual(true);
  });

  test('a paired report renders both legs with verdicts and timings', () => {
    const report = connectionDoctorReport([
      {
        uri: 'https://zec.rocks:443',
        outcome: {
          kind: 'report',
          reports: [
            { host: 'zec.rocks', clearnet: okLeg, mixnet: failLeg },
          ],
        },
      },
    ]);
    expect(report).toContain('### https://zec.rocks:443');
    expect(report).toContain('- clearnet: ok in 412 ms — chain main, height 3110000');
    expect(report).toContain('- mixnet: FAILED in 15000 ms — tls handshake eof');
  });

  test('a not-carried mixnet leg says so instead of vanishing', () => {
    const report = connectionDoctorReport([
      {
        uri: 'https://lwd1.zcash-infra.com:9067',
        outcome: {
          kind: 'report',
          reports: [
            { host: 'lwd1.zcash-infra.com', clearnet: okLeg, mixnet: null },
          ],
        },
      },
    ]);
    expect(report).toContain('- mixnet: not carried (proxy not ready)');
  });

  test('a typed probe failure and an unusable payload each render their arm', () => {
    const report = connectionDoctorReport([
      {
        uri: 'nonsense',
        outcome: {
          kind: 'ffiRejection',
          code: 'InvalidInput',
          message: 'unparseable server uri: nonsense',
        },
      },
      {
        uri: 'https://zec.rocks:443',
        outcome: {
          kind: 'malformedPayload',
          payload: '<html>',
          detail: 'non-array payload',
        },
      },
    ]);
    expect(report).toContain(
      '- probe failed typed: InvalidInput — unparseable server uri: nonsense',
    );
    expect(report).toContain('- probe payload unusable: non-array payload');
  });
});
