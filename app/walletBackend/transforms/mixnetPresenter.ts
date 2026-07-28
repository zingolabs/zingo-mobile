import { RPCMixnetModeEnum } from '../enums/RPCMixnetModeEnum';
import {
  MixnetDeathReport,
  MixnetDetailReport,
  MixnetStatusReport,
} from './mixnetTransform';
import { ProbeFailure } from '../utils/serverProbeOutcome';

/**
 * What the user may do about the current mixnet state: nothing, wait for
 * the bootstrap, or re-enable a lost transport. A closed union so screens
 * must render every case the policy can produce.
 */
type MixnetRecoveryAction = 'none' | 'wait' | 'reenable';

/**
 * The screen-facing projection of the mixnet state. `statusKey` is a
 * translation key (`mixnet.status.*`), never display English; `narration`
 * is the live bootstrap line when one exists; `sendBlocked` is the
 * fail-closed verdict a send screen must respect — `true` in every state
 * except an explicit `off` (deliberate clearnet consent) or `ready`.
 */
export type MixnetView = {
  readonly statusKey: string;
  readonly socks5Addr: string | null;
  readonly narration: string | null;
  /**
   * Why the transport died — the typed net-diag record — while the status
   * is `died` and the watcher held a cause; null in every other state, so
   * a screen showing "connection lost" can also show the stage, target,
   * and cause chain instead of a bare verdict.
   */
  readonly deathDetail: ProbeFailure | null;
  readonly sendBlocked: boolean;
  readonly recovery: MixnetRecoveryAction;
};

/**
 * The view before the coordinator's first publication on a platform that
 * runs the mixnet policy: the transport is being brought up, so sends stay
 * blocked (fail-closed) and the user's action is to wait.
 */
export const INITIAL_MIXNET_VIEW: MixnetView = {
  statusKey: 'mixnet.status.bootstrapping',
  socks5Addr: null,
  narration: null,
  deathDetail: null,
  sendBlocked: true,
  recovery: 'wait',
};

/**
 * Derives the screen-facing view from the typed reports.
 *
 * Pure function — no side effects. The fail-closed invariant lives here in
 * app form: a failure report blocks sending exactly as `bootstrapping` and
 * `died` do, because an unknowable transport must never be treated as
 * consented clearnet (ADR 0011; the wallet core enforces the same rule —
 * this projection only keeps the UI honest about it).
 */
export function deriveMixnetView(
  status: MixnetStatusReport,
  detail: MixnetDetailReport | null,
  death: MixnetDeathReport | null = null,
): MixnetView {
  const narration =
    detail !== null && detail.kind === 'detail' && detail.detail !== ''
      ? detail.detail
      : null;

  if (status.kind === 'failure') {
    return {
      statusKey: 'mixnet.status.unknown',
      socks5Addr: null,
      narration: null,
      deathDetail: null,
      sendBlocked: true,
      recovery: 'reenable',
    };
  }

  switch (status.mode) {
    case RPCMixnetModeEnum.off:
      return {
        statusKey: 'mixnet.status.off',
        socks5Addr: null,
        narration: null,
        deathDetail: null,
        sendBlocked: false,
        recovery: 'reenable',
      };
    case RPCMixnetModeEnum.bootstrapping:
      return {
        statusKey: 'mixnet.status.bootstrapping',
        socks5Addr: null,
        narration,
        deathDetail: null,
        sendBlocked: true,
        recovery: 'wait',
      };
    case RPCMixnetModeEnum.ready:
      return {
        statusKey: 'mixnet.status.ready',
        socks5Addr: status.socks5Addr,
        narration: null,
        deathDetail: null,
        sendBlocked: false,
        recovery: 'none',
      };
    case RPCMixnetModeEnum.died:
      return {
        statusKey: 'mixnet.status.died',
        socks5Addr: null,
        narration: null,
        // A death report that failed or is absent degrades to the bare
        // verdict, never blocks it: the detail is evidence, not policy.
        deathDetail:
          death !== null && death.kind === 'died' ? death.death : null,
        sendBlocked: true,
        recovery: 'reenable',
      };
  }
}
