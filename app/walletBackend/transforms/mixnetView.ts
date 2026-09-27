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
export type MixnetView = {
  readonly statusKey: MixnetStatusKey;
  readonly socks5Addr: string | null;
  readonly narration: string | null;
  readonly sendBlocked: boolean;
  readonly recovery: MixnetRecoveryAction;
  readonly reconnecting: boolean;
};

export const INITIAL_MIXNET_VIEW: MixnetView = {
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
    // The switch-off is the user's own act, so it carries no recovery and
    // never reads as a reconnect: an Offline session is resting, not trying.
    case RPCMixnetIndicatorEnum.off:
      return {
        statusKey: 'mixnet.status.off',
        socks5Addr: null,
        narration: null,
        sendBlocked: true,
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

// Every transmission travels the mixnet, so a send waits for a transport
// that can carry it. A null view is a platform whose transport has not
// landed: nothing to wait for there.
export function sendGateOpen(view: MixnetView | null): boolean {
  return view === null ? true : !view.sendBlocked;
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
