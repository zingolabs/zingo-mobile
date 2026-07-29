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
  | { readonly reason: 'unrecognizedMode'; readonly claimed: string }
  | { readonly reason: 'unconsentedOff' };

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
 * Whether this session holds the user's deliberate clearnet consent.
 * `off` from the wallet is trustworthy only under `disabledThisSession`:
 * a never-attached wallet (and a silently recreated one) also reports
 * `off`, and that must not open the send gate (zingo-mobile#1226).
 */
export type ClearnetConsent = 'none' | 'disabledThisSession';

/**
 * Vets a polled status against the session's consent. A polled `off`
 * without consent is re-typed as the policy failure it actually is, so the
 * derived view keeps sends blocked and offers re-enable instead of
 * silently opening clearnet. Every other report passes through untouched;
 * direct reports (an attach result, a disable result) are authoritative
 * and are not vetted.
 *
 * Pure function — no side effects.
 */
export function vetPolledStatus(
  status: MixnetStatusReport,
  consent: ClearnetConsent,
): MixnetStatusReport {
  if (
    status.kind === 'status' &&
    status.mode === RPCMixnetModeEnum.off &&
    consent === 'none'
  ) {
    return { kind: 'failure', failure: { reason: 'unconsentedOff' } };
  }
  return status;
}

/**
 * The validated outcome of a death-detail call: no record (every mode but
 * `died`), the typed cause of the death (the probes' failure record — one
 * taxonomy shape everywhere), or the call's own failure.
 */
export type MixnetDeathReport =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'died';
      /**
       * How long ago the death latched, from the wallet's clamped
       * staleness math — a stepping clock reads as zero, never negative.
       * Each poll carries a fresh age.
       */
      readonly ageMillis: number;
      /** The typed cause; null for a causeless death (a closed pipe). */
      readonly death: ProbeFailure | null;
    }
  | { readonly kind: 'failure'; readonly failure: MixnetFailure };

/**
 * The wallet's temporal calibration for the mixnet transport, or the
 * call's failure. The budget is the honest upper bound on "Connecting to
 * mixnet…", read from the same constants the wallet's gates run on, so
 * the app never pins a stale copy of its patience.
 */
export type MixnetTimingReport =
  | {
      readonly kind: 'timing';
      readonly attachReadinessBudgetMillis: number;
      readonly mixnetRoundTripBoundMillis: number;
    }
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
 * Transforms the DATA channel of a `mixnet_death_report` reply into a
 * validated report. Absence crosses named (`kind: "none"`), never as a bare
 * null; a present report must carry a numeric age, and its cause, when one
 * crossed, must validate as the typed failure shape.
 *
 * Pure function — no side effects. Total over every string input.
 */
export function transformMixnetDeathReport(
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
  const payload = parsedReply as {
    kind?: unknown;
    age_millis?: unknown;
    failure?: unknown;
  };
  if (payload.kind === 'none') {
    return { kind: 'none' };
  }
  if (payload.kind === 'report' && typeof payload.age_millis === 'number') {
    if (payload.failure === undefined) {
      return { kind: 'died', ageMillis: payload.age_millis, death: null };
    }
    const death = probeFailure(payload.failure);
    return death === null
      ? malformed
      : { kind: 'died', ageMillis: payload.age_millis, death };
  }
  return malformed;
}

/**
 * Transforms the DATA channel of a `mixnet_timing` reply into a validated
 * report: both bounds must cross as numbers.
 *
 * Pure function — no side effects. Total over every string input.
 */
export function transformMixnetTiming(dataReply: string): MixnetTimingReport {
  const parsedReply: unknown = parseJsonOrNull(dataReply);
  if (parsedReply !== null && typeof parsedReply === 'object') {
    const payload = parsedReply as {
      attach_readiness_budget_millis?: unknown;
      mixnet_round_trip_bound_millis?: unknown;
    };
    if (
      typeof payload.attach_readiness_budget_millis === 'number' &&
      typeof payload.mixnet_round_trip_bound_millis === 'number'
    ) {
      return {
        kind: 'timing',
        attachReadinessBudgetMillis: payload.attach_readiness_budget_millis,
        mixnetRoundTripBoundMillis: payload.mixnet_round_trip_bound_millis,
      };
    }
  }
  return {
    kind: 'failure',
    failure: { reason: 'malformedPayload', payload: dataReply },
  };
}
