/**
 * @format
 */

import {
  connectionDoctorReport,
  DOCTOR_REPORT_HEADLINE,
} from '../app/walletBackend/transforms/connectionDoctorReport';
import type {
  ProbeLeg,
  SyncProbeOutcome,
} from '../app/walletBackend/utils/serverProbeOutcome';

const answeredLeg: ProbeLeg = {
  millis: 412,
  outcome: { kind: 'answered', info: { chain: 'main', height: 3110000 } },
};
const failedLeg: ProbeLeg = {
  millis: 15000,
  outcome: {
    kind: 'failed',
    failure: {
      stage: 'remote-tls',
      target: 'lwd1.zcash-infra.com:9067',
      causeChain: ['tls handshake eof', 'connection reset by peer'],
    },
  },
};
const stagedStopped: SyncProbeOutcome = {
  kind: 'staged',
  probe: {
    server: 'lwd1.zcash-infra.com:9067',
    stages: [
      { step: 'tcp-connect', millis: 45, outcome: { kind: 'passed' } },
      {
        step: 'tls-channel',
        millis: 15000,
        outcome: {
          kind: 'failed',
          failure: {
            stage: 'remote-tls',
            target: 'lwd1.zcash-infra.com:9067',
            causeChain: ['tls handshake eof'],
          },
        },
      },
    ],
    verdict: { kind: 'stopped' },
  },
};

describe('connectionDoctorReport', () => {
  test('every run renders under the stable headline', () => {
    const report = connectionDoctorReport([]);
    expect(report.startsWith(`## ${DOCTOR_REPORT_HEADLINE}`)).toEqual(true);
  });

  test('a staged run renders each stage, the failure record, and no fabricated identity', () => {
    const report = connectionDoctorReport([
      {
        kind: 'stockServer',
        uri: 'https://lwd1.zcash-infra.com:9067',
        sync: stagedStopped,
      },
    ]);
    expect(report).toContain('### https://lwd1.zcash-infra.com:9067');
    // The staged section names its transport: the sync path is always
    // clearnet, and unlabeled stage lines were misread as mixnet results.
    expect(report).toContain('sync-path probe (clearnet):');
    expect(report).toContain('- tcp-connect: ok in 45 ms');
    expect(report).toContain(
      '- tls-channel: FAILED in 15000 ms — failed at remote-tls to lwd1.zcash-infra.com:9067',
    );
    expect(report).toContain('  - tls handshake eof');
    expect(report).not.toContain('serving chain');
  });

  test('a reachable verdict renders the served identity', () => {
    const report = connectionDoctorReport([
      {
        kind: 'stockServer',
        uri: 'https://zec.rocks:443',
        sync: {
          kind: 'staged',
          probe: {
            server: 'zec.rocks:443',
            stages: [
              { step: 'tcp-connect', millis: 40, outcome: { kind: 'passed' } },
            ],
            verdict: {
              kind: 'reachable',
              info: { chain: 'main', height: 3110000 },
            },
          },
        },
      },
    ]);
    expect(report).toContain('- serving chain main at height 3110000');
  });

  test('the current server appends the paired legs, naming the not-carried arm', () => {
    const report = connectionDoctorReport([
      {
        kind: 'currentServer',
        uri: 'https://zec.rocks:443',
        sync: stagedStopped,
        paired: {
          kind: 'report',
          reports: [
            { host: 'zec.rocks', clearnet: answeredLeg, mixnet: { kind: 'notCarried' } },
          ],
        },
      },
    ]);
    expect(report).toContain('covered-surface probe (paired):');
    expect(report).toContain(
      '- clearnet: ok in 412 ms — chain main, height 3110000',
    );
    expect(report).toContain('- mixnet: not carried (proxy not ready)');
  });

  test('a probed mixnet leg renders its typed failure with the cause chain', () => {
    const report = connectionDoctorReport([
      {
        kind: 'currentServer',
        uri: 'https://zec.rocks:443',
        sync: stagedStopped,
        paired: {
          kind: 'report',
          reports: [
            {
              host: 'zec.rocks',
              clearnet: answeredLeg,
              mixnet: { kind: 'probed', leg: failedLeg },
            },
          ],
        },
      },
    ]);
    expect(report).toContain(
      '- mixnet: FAILED in 15000 ms — failed at remote-tls to lwd1.zcash-infra.com:9067',
    );
    expect(report).toContain('  - connection reset by peer');
  });

  test('typed probe failures and unusable payloads each render their arm', () => {
    const report = connectionDoctorReport([
      {
        kind: 'stockServer',
        uri: 'nonsense',
        sync: {
          kind: 'ffiRejection',
          code: 'InvalidInput',
          message: 'unparseable server uri: nonsense',
        },
      },
      {
        kind: 'stockServer',
        uri: 'https://zec.rocks:443',
        sync: {
          kind: 'malformedPayload',
          payload: '<html>',
          detail: 'non-object payload',
        },
      },
    ]);
    expect(report).toContain(
      '- probe failed typed: InvalidInput — unparseable server uri: nonsense',
    );
    expect(report).toContain('- probe payload unusable: non-object payload');
  });
});
