/**
 * The Connection Doctor's probe surface (docs/agents/nym-diagnostics-plan.md,
 * Workstream A). One native call per target runs the paired clearnet/mixnet
 * `GetLightdInfo` probe; the interpretation of its payload is a pure, total
 * function over the decoded FFI result (ADR 0002: errors are types; ADR 0004:
 * consumers dispatch through exhaustive handler records).
 */
import RPCModule from '../../RPCModule';
import { callFfi, decodeFfiJson, FfiErrorCode, FfiJsonDecode } from '../ffi';
import {
  RPCProbeLegType,
  RPCProbeReportType,
} from '../types/RPCProbeReportType';

// A user-invoked diagnostic: the clearnet leg contacts the target from the
// real IP. Never call it on an automatic path.
export async function probeServer(uri: string): Promise<FfiJsonDecode> {
  return decodeFfiJson(await callFfi(RPCModule.probeServerProcess(uri)));
}

/**
 * The typed outcome of one probe call, enumerated over the real ways the
 * surface answers:
 * - `report`: the probe ran; each target carries its two timed legs.
 * - `ffiRejection`: the typed error channel rejected (an unparseable uri
 *   is `InvalidInput`; an uninitialized client is its own code).
 * - `malformedPayload`: the resolution is unusable — the payload travels
 *   for diagnosis, never silently dropped.
 */
export type ServerProbeOutcome =
  | { readonly kind: 'report'; readonly reports: readonly RPCProbeReportType[] }
  | {
      readonly kind: 'ffiRejection';
      readonly code: FfiErrorCode;
      readonly message: string;
    }
  | {
      readonly kind: 'malformedPayload';
      readonly payload: string;
      readonly detail: string;
    };

export type ServerProbeOutcomeHandlers<R> = {
  [K in ServerProbeOutcome['kind']]: (
    outcome: Extract<ServerProbeOutcome, { kind: K }>,
  ) => R;
};

export function matchServerProbeOutcome<R>(
  outcome: ServerProbeOutcome,
  handlers: ServerProbeOutcomeHandlers<R>,
): R {
  return (handlers[outcome.kind] as (o: ServerProbeOutcome) => R)(outcome);
}

function probeLeg(value: unknown): RPCProbeLegType | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const leg = value as Record<string, unknown>;
  if (
    typeof leg.ok !== 'boolean' ||
    typeof leg.detail !== 'string' ||
    typeof leg.millis !== 'number'
  ) {
    return null;
  }
  return { ok: leg.ok, detail: leg.detail, millis: leg.millis };
}

function probeReport(value: unknown): RPCProbeReportType | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const entry = value as Record<string, unknown>;
  const clearnet = probeLeg(entry.clearnet);
  if (typeof entry.host !== 'string' || clearnet === null) {
    return null;
  }
  if (entry.mixnet === null || entry.mixnet === undefined) {
    return { host: entry.host, clearnet, mixnet: null };
  }
  const mixnet = probeLeg(entry.mixnet);
  return mixnet === null ? null : { host: entry.host, clearnet, mixnet };
}

/**
 * Pure, total classification of a probe call: every arm of the decode and
 * every payload shape lands in exactly one outcome arm. No effects, no
 * clock, no logging — unit-testable without mocks.
 */
export function interpretServerProbe(
  decoded: FfiJsonDecode,
): ServerProbeOutcome {
  switch (decoded.kind) {
    case 'ffiRejection':
      return {
        kind: 'ffiRejection',
        code: decoded.code,
        message: decoded.message,
      };
    case 'emptyPayload':
      return { kind: 'malformedPayload', payload: '', detail: 'empty payload' };
    case 'malformedPayload':
      return {
        kind: 'malformedPayload',
        payload: decoded.payload,
        detail: decoded.detail,
      };
    case 'json': {
      if (!Array.isArray(decoded.value)) {
        return {
          kind: 'malformedPayload',
          payload: decoded.raw,
          detail: 'non-array payload',
        };
      }
      const reports: RPCProbeReportType[] = [];
      for (const entry of decoded.value) {
        const report = probeReport(entry);
        if (report === null) {
          return {
            kind: 'malformedPayload',
            payload: decoded.raw,
            detail: 'probe entry missing host or a well-formed leg',
          };
        }
        reports.push(report);
      }
      return { kind: 'report', reports };
    }
    default: {
      const unhandled: never = decoded;
      throw new Error(`unhandled decode: ${JSON.stringify(unhandled)}`);
    }
  }
}
