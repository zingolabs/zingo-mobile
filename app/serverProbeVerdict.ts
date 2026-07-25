/**
 * Pure verdict on a selectingServer() probe result.
 *
 * selectingServer resolves a server only when its probe actually answered
 * (selectingServer.ts checks `latency !== null` strictly), so any resolved
 * probe is a reachable server — including one that measured 0 ms, which
 * happens when the two Date.now() calls land in the same millisecond against
 * a localhost/LAN regtest server. The truthiness reads this replaces
 * (`serverChecked && serverChecked.latency`) misread exactly that 0 as the
 * null "probe failed" state.
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
