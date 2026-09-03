import { RPCMixnetIndicatorEnum } from '../enums/RPCMixnetIndicatorEnum';
import {
  RPCMixnetDetailType,
  RPCMixnetStatusType,
} from '../types/RPCMixnetType';

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
  | { readonly reason: 'unrecognizedIndicator'; readonly claimed: string }
  | { readonly reason: 'unconsentedOff' };

/**
 * The validated outcome of a mixnet status call. A discriminated union so
 * callers must handle both arms; `socks5Addr` is `null` in every indicator but
 * `ready`.
 */
export type MixnetStatusReport =
  | {
      readonly kind: 'status';
      readonly indicator: RPCMixnetIndicatorEnum;
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
    status.indicator === RPCMixnetIndicatorEnum.off &&
    consent === 'none'
  ) {
    return { kind: 'failure', failure: { reason: 'unconsentedOff' } };
  }
  return status;
}

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
 * Validates an untrusted value as a Mixnet Mode indicator.
 *
 * Pure function — no side effects. Returns `null` for anything that is not
 * exactly one of the four indicator strings, so an unknown future one degrades
 * to an explicit failure instead of a misread state.
 */
export function parseMixnetIndicator(
  candidate: unknown,
): RPCMixnetIndicatorEnum | null {
  switch (candidate) {
    case RPCMixnetIndicatorEnum.off:
      return RPCMixnetIndicatorEnum.off;
    case RPCMixnetIndicatorEnum.bootstrapping:
      return RPCMixnetIndicatorEnum.bootstrapping;
    case RPCMixnetIndicatorEnum.ready:
      return RPCMixnetIndicatorEnum.ready;
    case RPCMixnetIndicatorEnum.died:
      return RPCMixnetIndicatorEnum.died;
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
  const validatedIndicator = parseMixnetIndicator(
    statusPayload.mixnet_indicator,
  );
  if (validatedIndicator === null) {
    return {
      kind: 'failure',
      failure: {
        reason: 'unrecognizedIndicator',
        claimed: String(statusPayload.mixnet_indicator),
      },
    };
  }
  const socks5Addr =
    validatedIndicator === RPCMixnetIndicatorEnum.ready &&
    typeof statusPayload.socks5_addr === 'string'
      ? statusPayload.socks5_addr
      : null;
  return { kind: 'status', indicator: validatedIndicator, socks5Addr };
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
