import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import {
  RPCMixnetDetailType,
  RPCMixnetStatusType,
} from '@app/walletBackend/types/RPCMixnetType';

export type MixnetFailure =
  | { readonly reason: 'nativeRejection'; readonly message: string }
  | { readonly reason: 'malformedPayload'; readonly payload: string }
  | { readonly reason: 'unrecognizedIndicator'; readonly claimed: string }
  | { readonly reason: 'unconsentedOff' };

export type MixnetStatusReport =
  | {
      readonly kind: 'status';
      readonly indicator: RPCMixnetIndicatorEnum;
      readonly socks5Addr: string | null;
    }
  | { readonly kind: 'failure'; readonly failure: MixnetFailure };

export type MixnetDetailReport =
  | { readonly kind: 'detail'; readonly detail: string }
  | { readonly kind: 'failure'; readonly failure: MixnetFailure };

// A polled `off` is a never-attached wallet, which must keep sends blocked.
export function vetPolledStatus(
  status: MixnetStatusReport,
): MixnetStatusReport {
  if (
    status.kind === 'status' &&
    status.indicator === RPCMixnetIndicatorEnum.off
  ) {
    return { kind: 'failure', failure: { reason: 'unconsentedOff' } };
  }
  return status;
}

export function describeRejection(thrown: unknown): MixnetFailure {
  const message =
    thrown instanceof Error ? thrown.message : String(thrown ?? 'unknown');
  return { reason: 'nativeRejection', message };
}

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

function parseJsonOrNull(dataReply: string): unknown {
  try {
    return JSON.parse(dataReply);
  } catch {
    return null;
  }
}

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

// An absent detail is the quiet state and yields the empty string.
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
