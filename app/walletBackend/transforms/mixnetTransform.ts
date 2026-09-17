import { MixnetStatus } from 'zingo-ffi';
import { FfiError, FfiResult } from '@app/walletBackend/ffi';
import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import { mixnetIndicator } from '@app/walletBackend/transforms/enumTransform';

/**
 * Why a mixnet call yielded no usable status: the call rejected, or the
 * wallet reported `off` without this session's clearnet consent.
 */
export type MixnetFailure =
  | { readonly reason: 'nativeRejection'; readonly error: FfiError }
  | { readonly reason: 'unconsentedOff' };

/**
 * The outcome of a mixnet status call; `socks5Addr` is present only when
 * `ready` and `bootstrapDetail` is the live narration line, empty outside of
 * bootstrapping.
 */
export type MixnetStatusReport =
  | {
      readonly kind: 'status';
      readonly indicator: RPCMixnetIndicatorEnum;
      readonly socks5Addr: string | undefined;
      readonly bootstrapDetail: string;
    }
  | { readonly kind: 'failure'; readonly failure: MixnetFailure };

/** The narration line of a status report, or the failure it carries. */
export type MixnetDetailReport =
  | { readonly kind: 'detail'; readonly detail: string }
  | { readonly kind: 'failure'; readonly failure: MixnetFailure };

/**
 * Whether this session holds the user's deliberate clearnet consent: a
 * wallet that was never attached also reports `off`, and that must not open
 * the send gate.
 */
export type ClearnetConsent = 'none' | 'disabledThisSession';

export function transformMixnetStatus(
  status: MixnetStatus,
): MixnetStatusReport {
  const indicator = mixnetIndicator(status.indicator);
  return {
    kind: 'status',
    indicator,
    socks5Addr:
      indicator === RPCMixnetIndicatorEnum.ready ? status.socks5Addr : undefined,
    bootstrapDetail: status.bootstrapDetail ?? '',
  };
}

export function mixnetReport(
  result: FfiResult<MixnetStatus>,
): MixnetStatusReport {
  return result.ok
    ? transformMixnetStatus(result.value)
    : { kind: 'failure', failure: { reason: 'nativeRejection', error: result.error } };
}

export function mixnetDetail(report: MixnetStatusReport): MixnetDetailReport {
  return report.kind === 'status'
    ? { kind: 'detail', detail: report.bootstrapDetail }
    : report;
}

/**
 * Re-types a polled `off` without consent as the policy failure it is, so
 * the derived view keeps sends blocked and offers re-enable.
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
