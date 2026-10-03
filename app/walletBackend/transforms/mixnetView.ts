import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import { MixnetDetailReport, MixnetStatusReport } from './mixnetTransform';

export type MixnetRecoveryAction = 'none' | 'wait' | 'reenable';

export type MixnetStatusKey =
  `mixnet.status.${`${RPCMixnetIndicatorEnum}` | 'unknown'}`;

export const MIXNET_STATUS_KEYS: readonly MixnetStatusKey[] = [
  ...Object.values(RPCMixnetIndicatorEnum).map(
    indicator => `mixnet.status.${indicator}` as MixnetStatusKey,
  ),
  'mixnet.status.unknown',
];

// `sendBlocked` is false only for `ready`.
export type MixnetTransportView = {
  readonly kind: 'transport';
  readonly statusKey: MixnetStatusKey;
  readonly socks5Addr: string | null;
  readonly narration: string | null;
  readonly sendBlocked: boolean;
  readonly recovery: MixnetRecoveryAction;
  readonly reconnecting: boolean;
};

export type MixnetView = MixnetTransportView | { readonly kind: 'absent' };

export const ABSENT_MIXNET_VIEW: MixnetView = { kind: 'absent' };

export const INITIAL_MIXNET_VIEW: MixnetTransportView = {
  kind: 'transport',
  statusKey: 'mixnet.status.bootstrapping',
  socks5Addr: null,
  narration: null,
  sendBlocked: true,
  recovery: 'wait',
  reconnecting: false,
};

// A failure report blocks sending like `bootstrapping` and `died` do.
export function deriveMixnetView(
  status: MixnetStatusReport,
  detail: MixnetDetailReport | null,
  reconnecting: boolean = false,
): MixnetTransportView {
  const narration =
    detail !== null && detail.kind === 'detail' && detail.detail !== ''
      ? detail.detail
      : null;

  if (status.kind === 'failure') {
    return {
      kind: 'transport',
      statusKey: 'mixnet.status.unknown',
      socks5Addr: null,
      narration: null,
      sendBlocked: true,
      recovery: 'reenable',
      reconnecting,
    };
  }

  switch (status.indicator) {
    case RPCMixnetIndicatorEnum.bootstrapping:
      return {
        kind: 'transport',
        statusKey: 'mixnet.status.bootstrapping',
        socks5Addr: null,
        narration,
        sendBlocked: true,
        recovery: 'wait',
        reconnecting,
      };
    case RPCMixnetIndicatorEnum.ready:
      return {
        kind: 'transport',
        statusKey: 'mixnet.status.ready',
        socks5Addr: status.socks5Addr,
        narration: null,
        sendBlocked: false,
        recovery: 'none',
        reconnecting: false,
      };
    // The switch-off is the user's own act, so it carries no recovery and
    // never reads as a reconnect: an Offline session is resting, not trying.
    case RPCMixnetIndicatorEnum.off:
      return {
        kind: 'transport',
        statusKey: 'mixnet.status.off',
        socks5Addr: null,
        narration: null,
        sendBlocked: true,
        recovery: 'none',
        reconnecting: false,
      };
    case RPCMixnetIndicatorEnum.died:
      return {
        kind: 'transport',
        statusKey: 'mixnet.status.died',
        socks5Addr: null,
        narration: null,
        sendBlocked: true,
        recovery: 'reenable',
        reconnecting,
      };
  }
}

// Every transmission travels the mixnet, so a send waits for a transport
// that can carry it. A platform without a transport has nothing to wait for.
export function sendGateOpen(view: MixnetView): boolean {
  switch (view.kind) {
    case 'absent':
      return true;
    case 'transport':
      return !view.sendBlocked;
  }
}

// The status line a blocked gate shows beside its reason: the reconnecting
// notice while a reconnect runs, and the transport's own status otherwise.
export function shownStatusKey(
  view: MixnetTransportView,
): 'mixnet.reconnecting' | MixnetStatusKey {
  return view.reconnecting ? 'mixnet.reconnecting' : view.statusKey;
}

export type MixnetPhase =
  'connecting' | 'ready' | 'lost' | 'reconnecting' | 'off';

// An active reconnect wins over the underlying status, except over `off`:
// a switched-off transport is not reconnecting, whatever a stale flag says.
export function mixnetPhase(
  statusKey: MixnetStatusKey,
  reconnecting: boolean,
): MixnetPhase {
  if (statusKey === 'mixnet.status.ready') {
    return 'ready';
  }
  if (statusKey === 'mixnet.status.off') {
    return 'off';
  }
  if (reconnecting) {
    return 'reconnecting';
  }
  switch (statusKey) {
    case 'mixnet.status.bootstrapping':
      return 'connecting';
    case 'mixnet.status.died':
    case 'mixnet.status.unknown':
      return 'lost';
  }
}

/** Names the phase of a view, with `absent` for a platform without a transport. */
export function viewPhase(view: MixnetView): MixnetPhase | 'absent' {
  switch (view.kind) {
    case 'absent':
      return 'absent';
    case 'transport':
      return mixnetPhase(view.statusKey, view.reconnecting);
  }
}
