import { RPCMixnetIndicatorEnum } from '../enums/RPCMixnetIndicatorEnum';
import { MixnetDetailReport, MixnetStatusReport } from './mixnetTransform';

/**
 * What the user may do about the current mixnet state: nothing, wait for
 * the bootstrap, or re-enable a lost transport. A closed union so screens
 * must render every case the policy can produce.
 */
export type MixnetRecoveryAction = 'none' | 'wait' | 'reenable';

/** One member of the closed status-key set: an indicator the wallet reports, or this presenter's own `unknown` failure key. */
export type MixnetStatusKey =
  `mixnet.status.${`${RPCMixnetIndicatorEnum}` | 'unknown'}`;

/** The closed status-key set at runtime, derived from the same sources as the type. */
export const MIXNET_STATUS_KEYS: readonly MixnetStatusKey[] = [
  ...Object.values(RPCMixnetIndicatorEnum).map(
    indicator => `mixnet.status.${indicator}` as MixnetStatusKey,
  ),
  'mixnet.status.unknown',
];

/** How the transport disposes a price fetch. */
export type MixnetTransportDisposition =
  'refusing' | 'possibleBootstrap' | 'serving';

/** Classifies a status key exhaustively. */
export function transportDisposition(
  key: MixnetStatusKey,
): MixnetTransportDisposition {
  switch (key) {
    case 'mixnet.status.died':
      return 'refusing';
    case 'mixnet.status.bootstrapping':
    case 'mixnet.status.unknown':
      return 'possibleBootstrap';
    case 'mixnet.status.off':
    case 'mixnet.status.ready':
      return 'serving';
  }
}

/**
 * The screen-facing projection of the mixnet state. `statusKey` is a
 * translation key (`mixnet.status.*`), never display English; `narration`
 * is the live bootstrap line when one exists; `sendBlocked` is the
 * fail-closed verdict a send screen must respect — `true` in every state
 * except an explicit `off` (deliberate clearnet consent) or `ready`.
 */
export type MixnetView = {
  readonly statusKey: MixnetStatusKey;
  readonly socks5Addr: string | null;
  readonly narration: string | null;
  readonly sendBlocked: boolean;
  readonly recovery: MixnetRecoveryAction;
  readonly reconnecting: boolean;
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
  sendBlocked: true,
  recovery: 'wait',
  reconnecting: false,
};

/**
 * The initial view when Mixnet Mode is disabled (the persisted `nym` setting
 * is off): clearnet, sends ungated. Mirrors the `off` case of
 * {@link deriveMixnetView} so the pre-coordinator view matches the first
 * publication. The coordinator republishes on any change.
 */
export const OFF_MIXNET_VIEW: MixnetView = {
  statusKey: 'mixnet.status.off',
  socks5Addr: null,
  narration: null,
  sendBlocked: false,
  recovery: 'reenable',
  reconnecting: false,
};

/**
 * Derives the screen-facing view from the typed reports.
 *
 * Pure function. The fail-closed invariant lives here in
 * app form: a failure report blocks sending exactly as `bootstrapping` and
 * `died` do, because an unknowable transport must never be treated as
 * consented clearnet.
 */
export function deriveMixnetView(
  status: MixnetStatusReport,
  detail: MixnetDetailReport | null,
  reconnecting: boolean = false,
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
      sendBlocked: true,
      recovery: 'reenable',
      reconnecting,
    };
  }

  switch (status.indicator) {
    case RPCMixnetIndicatorEnum.off:
      return {
        statusKey: 'mixnet.status.off',
        socks5Addr: null,
        narration: null,
        sendBlocked: false,
        recovery: 'reenable',
        reconnecting: false,
      };
    case RPCMixnetIndicatorEnum.bootstrapping:
      return {
        statusKey: 'mixnet.status.bootstrapping',
        socks5Addr: null,
        narration,
        sendBlocked: true,
        recovery: 'wait',
        reconnecting,
      };
    case RPCMixnetIndicatorEnum.ready:
      return {
        statusKey: 'mixnet.status.ready',
        socks5Addr: status.socks5Addr,
        narration: null,
        sendBlocked: false,
        recovery: 'none',
        reconnecting: false,
      };
    case RPCMixnetIndicatorEnum.died:
      return {
        statusKey: 'mixnet.status.died',
        socks5Addr: null,
        narration: null,
        sendBlocked: true,
        recovery: 'reenable',
        reconnecting,
      };
  }
}
