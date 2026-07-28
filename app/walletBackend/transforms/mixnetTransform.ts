import { RPCMixnetModeEnum } from '../enums/RPCMixnetModeEnum';
import {
  RPCMixnetDetailType,
  RPCMixnetStatusType,
} from '../types/RPCMixnetType';
import { ProbeFailure, probeFailure } from '../utils/serverProbeOutcome';

/**
 * Why a mixnet call failed, as a compile-time-enforced type
 * (zingo-mobile#1151, audit Issues Q and R): a `nativeRejection` arrived on
 * the error channel — a rejected native promise — while the other reasons
 * are payload validation failures. No failure is ever inferred from prose
 * inside the data channel.
 */
export type MixnetFailure =
  | { readonly reason: 'nativeRejection'; readonly message: string }
  | { readonly reason: 'malformedPayload'; readonly payload: string }
  | { readonly reason: 'unrecognizedMode'; readonly claimed: string };

/**
 * The validated outcome of a mixnet status call. A discriminated union so
 * callers must handle both arms; `socks5Addr` is `null` in every mode but
 * `ready`.
 */
export type MixnetStatusReport =
  | {
      readonly kind: 'status';
      readonly mode: RPCMixnetModeEnum;
      readonly socks5Addr: string | null;
    }
  | { readonly kind: 'failure'; readonly failure: MixnetFailure };

/**
 * The validated outcome of a bootstrap-detail call: the (possibly empty)
 * narration line, or the failure.
 */
export type MixnetDetailReport =
  | { readonly kind: 'detail'; readonly detail: string }
  | { readonly kind: 'failure'; readonly failure: MixnetFailure };

/**
 * The validated outcome of a death-detail call: no record (every mode but
 * `died`), the typed cause of the death (the probes' failure record — one
 * taxonomy shape everywhere), or the call's own failure.
 */
export type MixnetDeathReport =
  | { readonly kind: 'none' }
  | { readonly kind: 'died'; readonly death: ProbeFailure }
  | { readonly kind: 'failure'; readonly failure: MixnetFailure };

/**
 * Converts a value thrown by the native bridge — the error channel — into
 * the typed failure. Never inspects the data channel.
 *
 * Pure function — no side effects.
 */
export function describeRejection(thrown: unknown): MixnetFailure {
  const message =
    thrown instanceof Error ? thrown.message : String(thrown ?? 'unknown');
  return { reason: 'nativeRejection', message };
}

/**
 * Validates an untrusted value as a Mixnet Mode.
 *
 * Pure function — no side effects. Returns `null` for anything that is not
 * exactly one of the four mode strings, so an unknown future mode degrades
 * to an explicit failure instead of a misread state.
 */
export function parseMixnetMode(candidate: unknown): RPCMixnetModeEnum | null {
  switch (candidate) {
    case RPCMixnetModeEnum.off:
      return RPCMixnetModeEnum.off;
    case RPCMixnetModeEnum.bootstrapping:
      return RPCMixnetModeEnum.bootstrapping;
    case RPCMixnetModeEnum.ready:
      return RPCMixnetModeEnum.ready;
    case RPCMixnetModeEnum.died:
      return RPCMixnetModeEnum.died;
    default:
      return null;
  }
}

/**
 * Parses a string as JSON without throwing.
 *
 * Pure function — no side effects. `JSON.parse` is deterministic; the only
 * impurity it threatens is the thrown exception, which this converts into
 * the `null` arm.
 */
function parseJsonOrNull(dataReply: string): unknown {
  try {
    return JSON.parse(dataReply);
  } catch {
    return null;
  }
}

/**
 * Transforms the DATA channel of a status-shaped mixnet call into a
 * validated report. The reply is never sniffed for error prose — a reply
 * that is not a JSON status object is a `malformedPayload` failure, exactly
 * as an `"Error: ..."` string would be if one ever leaked into the data
 * channel.
 *
 * Pure function — no side effects. Total over every string input.
 */
export function transformMixnetStatus(dataReply: string): MixnetStatusReport {
  const parsedReply: unknown = parseJsonOrNull(dataReply);
  if (parsedReply === null || typeof parsedReply !== 'object') {
    return {
      kind: 'failure',
      failure: { reason: 'malformedPayload', payload: dataReply },
    };
  }
  const statusPayload = parsedReply as RPCMixnetStatusType;
  const validatedMode = parseMixnetMode(statusPayload.mixnet_mode);
  if (validatedMode === null) {
    return {
      kind: 'failure',
      failure: {
        reason: 'unrecognizedMode',
        claimed: String(statusPayload.mixnet_mode),
      },
    };
  }
  const socks5Addr =
    validatedMode === RPCMixnetModeEnum.ready &&
    typeof statusPayload.socks5_addr === 'string'
      ? statusPayload.socks5_addr
      : null;
  return { kind: 'status', mode: validatedMode, socks5Addr };
}

/**
 * Transforms the DATA channel of a `mixnet_bootstrap_detail` reply into a
 * validated report. An absent or empty detail is the legitimate quiet state
 * and yields the empty string, not a failure.
 *
 * Pure function — no side effects. Total over every string input.
 */
export function transformMixnetDetail(dataReply: string): MixnetDetailReport {
  const parsedReply: unknown = parseJsonOrNull(dataReply);
  if (parsedReply === null || typeof parsedReply !== 'object') {
    return {
      kind: 'failure',
      failure: { reason: 'malformedPayload', payload: dataReply },
    };
  }
  const detailPayload = parsedReply as RPCMixnetDetailType;
  const narrationLine =
    typeof detailPayload.detail === 'string' ? detailPayload.detail : '';
  return { kind: 'detail', detail: narrationLine };
}

/**
 * Transforms the DATA channel of a `mixnet_death_detail` reply into a
 * validated report. Absence crosses named (`kind: "none"`), never as a bare
 * null, and the record itself must validate as the typed failure shape.
 *
 * Pure function — no side effects. Total over every string input.
 */
export function transformMixnetDeathDetail(
  dataReply: string,
): MixnetDeathReport {
  const malformed: MixnetDeathReport = {
    kind: 'failure',
    failure: { reason: 'malformedPayload', payload: dataReply },
  };
  const parsedReply: unknown = parseJsonOrNull(dataReply);
  if (parsedReply === null || typeof parsedReply !== 'object') {
    return malformed;
  }
  const payload = parsedReply as { kind?: unknown; failure?: unknown };
  if (payload.kind === 'none') {
    return { kind: 'none' };
  }
  if (payload.kind === 'detail') {
    const death = probeFailure(payload.failure);
    return death === null ? malformed : { kind: 'died', death };
  }
  return malformed;
}
