/**
 * Pure verdict on a selectingServer() probe result.
 *
 * selectingServer resolves a server only when its probe actually answered,
 * so any resolved probe describes a reachable server — including one that
 * measured 0 ms, which happens when the probe's two Date.now() calls land
 * in the same millisecond against a localhost/LAN regtest server. The
 * strict `latency !== null` read is therefore load-bearing: truthiness
 * would fold that 0 into the null "no measurement" state.
 */
import { ServerUrisType } from './AppState';

export type ServerProbeVerdict =
  | { kind: 'reachable'; server: ServerUrisType; latencyMs: number }
  | { kind: 'unreachable' };

export const serverProbeVerdict = (
  probe: ServerUrisType | null,
): ServerProbeVerdict => {
  if (probe !== null && probe.latency !== null) {
    return { kind: 'reachable', server: probe, latencyMs: probe.latency };
  }
  return { kind: 'unreachable' };
};
