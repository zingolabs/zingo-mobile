/**
 * @format
 */

import type { FfiJsonDecode } from '../app/walletBackend/ffi';
import {
  interpretServerProbe,
  interpretSyncProbe,
} from '../app/walletBackend/utils/serverProbeOutcome';

const json = (value: unknown): FfiJsonDecode => ({
  kind: 'json',
  value,
  raw: JSON.stringify(value),
});

const answered = {
  millis: 412,
  outcome: { kind: 'answered', info: { chain: 'main', height: 3110000 } },
};
const failed = {
  millis: 15000,
  outcome: {
    kind: 'failed',
    failure: {
      stage: 'remote-tls',
      target: 'zec.rocks:443',
      cause_chain: ['tls handshake eof'],
    },
  },
};

describe('interpretServerProbe', () => {
  test('a typed FFI rejection passes through with its code', () => {
    const outcome = interpretServerProbe({
      kind: 'ffiRejection',
      code: 'InvalidInput',
      message: 'unparseable server uri: nonsense',
    });
    expect(outcome).toEqual({
      kind: 'ffiRejection',
      code: 'InvalidInput',
      message: 'unparseable server uri: nonsense',
    });
  });

  test('an empty payload is malformed, never silently dropped', () => {
    expect(interpretServerProbe({ kind: 'emptyPayload' })).toEqual({
      kind: 'malformedPayload',
      payload: '',
      detail: 'empty payload',
    });
  });

  test('both leg arms and the named not-carried mixnet arm come through typed', () => {
    const outcome = interpretServerProbe(
      json([
        {
          host: 'zec.rocks',
          clearnet: answered,
          mixnet: { kind: 'probed', leg: failed },
        },
        { host: 'lwd1', clearnet: failed, mixnet: { kind: 'notCarried' } },
      ]),
    );
    expect(outcome).toEqual({
      kind: 'report',
      reports: [
        {
          host: 'zec.rocks',
          clearnet: {
            millis: 412,
            outcome: {
              kind: 'answered',
              info: { chain: 'main', height: 3110000 },
            },
          },
          mixnet: {
            kind: 'probed',
            leg: {
              millis: 15000,
              outcome: {
                kind: 'failed',
                failure: {
                  stage: 'remote-tls',
                  target: 'zec.rocks:443',
                  causeChain: ['tls handshake eof'],
                },
              },
            },
          },
        },
        {
          host: 'lwd1',
          clearnet: {
            millis: 15000,
            outcome: {
              kind: 'failed',
              failure: {
                stage: 'remote-tls',
                target: 'zec.rocks:443',
                causeChain: ['tls handshake eof'],
              },
            },
          },
          mixnet: { kind: 'notCarried' },
        },
      ],
    });
  });

  test('an unrecognized outcome kind rejects the payload as malformed', () => {
    const outcome = interpretServerProbe(
      json([
        {
          host: 'zec.rocks',
          clearnet: { millis: 1, outcome: { kind: 'maybe' } },
          mixnet: { kind: 'notCarried' },
        },
      ]),
    );
    expect(outcome.kind).toEqual('malformedPayload');
  });
});

describe('interpretSyncProbe', () => {
  test('a full staged run with a reachable verdict comes through typed', () => {
    const outcome = interpretSyncProbe(
      json({
        server: 'zec.rocks:443',
        stages: [
          { step: 'tcp-connect', millis: 40, outcome: { kind: 'passed' } },
          { step: 'tls-channel', millis: 180, outcome: { kind: 'passed' } },
          { step: 'grpc-info', millis: 250, outcome: { kind: 'passed' } },
        ],
        verdict: {
          kind: 'reachable',
          info: { chain: 'main', height: 3110000 },
        },
      }),
    );
    expect(outcome).toEqual({
      kind: 'staged',
      probe: {
        server: 'zec.rocks:443',
        stages: [
          { step: 'tcp-connect', millis: 40, outcome: { kind: 'passed' } },
          { step: 'tls-channel', millis: 180, outcome: { kind: 'passed' } },
          { step: 'grpc-info', millis: 250, outcome: { kind: 'passed' } },
        ],
        verdict: {
          kind: 'reachable',
          info: { chain: 'main', height: 3110000 },
        },
      },
    });
  });

  test('a stopped run carries the failing stage and no fabricated identity', () => {
    const outcome = interpretSyncProbe(
      json({
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
                cause_chain: ['tls handshake eof', 'connection reset'],
              },
            },
          },
        ],
        verdict: { kind: 'stopped' },
      }),
    );
    expect(outcome.kind).toEqual('staged');
    if (outcome.kind === 'staged') {
      expect(outcome.probe.verdict).toEqual({ kind: 'stopped' });
      expect(outcome.probe.stages[1].outcome.kind).toEqual('failed');
    }
  });

  test('a verdict of no recognized kind rejects the payload as malformed', () => {
    const outcome = interpretSyncProbe(
      json({ server: 's', stages: [], verdict: { kind: 'shrug' } }),
    );
    expect(outcome.kind).toEqual('malformedPayload');
  });
});
