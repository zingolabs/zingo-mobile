import { RPCMixnetModeEnum } from '../enums/RPCMixnetModeEnum';
import {
  RPCMixnetDetailType,
  RPCMixnetStatusType,
} from '../types/RPCMixnetType';

/**
 * The validated outcome of a mixnet status call: either a well-formed
 * status, or the failure message. A discriminated union so callers must
 * handle both arms; `socks5Addr` is `null` in every mode but `ready`.
 */
export type MixnetStatusReport =
  | {
      readonly kind: 'status';
      readonly mode: RPCMixnetModeEnum;
      readonly socks5Addr: string | null;
    }
  | { readonly kind: 'error'; readonly message: string };

/**
 * The validated outcome of a bootstrap-detail call: the (possibly empty)
 * narration line, or the failure message.
 */
export type MixnetDetailReport =
  | { readonly kind: 'detail'; readonly detail: string }
  | { readonly kind: 'error'; readonly message: string };

/**
 * Whether a native/zingolib reply is the `Error: ...` failure convention
 * rather than a JSON payload.
 *
 * Pure function — no side effects.
 */
export function hasErrorPrefix(nativeReply: string): boolean {
  return nativeReply.toLowerCase().startsWith('error');
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
function parseJsonOrNull(nativeReply: string): unknown {
  try {
    return JSON.parse(nativeReply);
  } catch {
    return null;
  }
}

/**
 * Transforms a raw `mixnet_mode` / `attach_mixnet` / `enable_mixnet` /
 * `disable_mixnet` reply into a validated status report.
 *
 * Pure function — no side effects. Total over every string input: the
 * error-prefix convention, malformed JSON, a payload-level error field,
 * and an unrecognized mode each land in the `error` arm with a message
 * naming what went wrong.
 */
export function transformMixnetStatus(nativeReply: string): MixnetStatusReport {
  if (hasErrorPrefix(nativeReply)) {
    return { kind: 'error', message: nativeReply };
  }
  const parsedReply: unknown = parseJsonOrNull(nativeReply);
  if (parsedReply === null || typeof parsedReply !== 'object') {
    return {
      kind: 'error',
      message: `Mixnet status is not a JSON object: ${nativeReply}`,
    };
  }
  const statusPayload = parsedReply as RPCMixnetStatusType;
  if (statusPayload.error !== undefined) {
    return { kind: 'error', message: statusPayload.error };
  }
  const validatedMode = parseMixnetMode(statusPayload.mixnet_mode);
  if (validatedMode === null) {
    return {
      kind: 'error',
      message: `Unrecognized mixnet mode: ${String(statusPayload.mixnet_mode)}`,
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
 * Transforms a raw `mixnet_bootstrap_detail` reply into a validated detail
 * report. An absent or empty detail is a legitimate quiet state and yields
 * the empty string, not an error.
 *
 * Pure function — no side effects. Total over every string input.
 */
export function transformMixnetDetail(nativeReply: string): MixnetDetailReport {
  if (hasErrorPrefix(nativeReply)) {
    return { kind: 'error', message: nativeReply };
  }
  const parsedReply: unknown = parseJsonOrNull(nativeReply);
  if (parsedReply === null || typeof parsedReply !== 'object') {
    return {
      kind: 'error',
      message: `Mixnet detail is not a JSON object: ${nativeReply}`,
    };
  }
  const detailPayload = parsedReply as RPCMixnetDetailType;
  if (detailPayload.error !== undefined) {
    return { kind: 'error', message: detailPayload.error };
  }
  const narrationLine =
    typeof detailPayload.detail === 'string' ? detailPayload.detail : '';
  return { kind: 'detail', detail: narrationLine };
}
