/**
 * @format
 */

import { serverProbeVerdict } from '../app/serverProbeVerdict';
import { ServerUrisType } from '../app/AppState';

const probe = (latency: number | null): ServerUrisType =>
  ({
    uri: 'https://zec.rocks:443',
    region: 'na',
    chainName: 'main',
    default: true,
    latency,
    obsolete: false,
  }) as ServerUrisType;

describe('serverProbeVerdict', () => {
  test('a null probe result (all candidates failed or timed out) is unreachable', () => {
    expect(serverProbeVerdict(null)).toEqual({ kind: 'unreachable' });
  });

  test('an unmeasured probe (latency null) is unreachable', () => {
    expect(serverProbeVerdict(probe(null))).toEqual({ kind: 'unreachable' });
  });

  test('a measured probe is reachable and carries the measurement', () => {
    const s = probe(57);
    expect(serverProbeVerdict(s)).toEqual({
      kind: 'reachable',
      server: s,
      latencyMs: 57,
    });
  });

  // EVIDENCE of misinterpretation at LoadingApp.tsx:1017, 1103, and 1391:
  // production reads the resolved latency with truthiness
  // (`serverChecked && serverChecked.latency`), so a 0 ms measurement —
  // two Date.now() calls landing in the same millisecond, e.g. against a
  // localhost regtest server — is read as the null "probe failed" state.
  // selectingServer.ts:33 only resolves a server that actually answered,
  // so any resolved probe, 0 ms included, is a reachable server.
  test('a 0 ms round trip is a reachable server, not a dead one', () => {
    const s = probe(0);
    expect(serverProbeVerdict(s)).toEqual({
      kind: 'reachable',
      server: s,
      latencyMs: 0,
    });
  });
});
