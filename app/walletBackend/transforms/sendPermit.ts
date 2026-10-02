import type AppContextLoaded from '@app/AppState/AppContextLoaded';
import { ErrorKeyed, errorKeyed } from '@app/AppState/types/Result';
import { sendGateOpen } from './mixnetView';

export type SendRefusalKey = 'loadedapp.connection-error' | 'send.nym-blocked';

export type SendPermit = { kind: 'permitted' } | ErrorKeyed<SendRefusalKey>;

export type SendOutcome<T> =
  { kind: 'sent'; receipt: T } | ErrorKeyed<SendRefusalKey>;

export type SendPermitInputs = Pick<
  AppContextLoaded,
  'netInfo' | 'server' | 'mixnetView'
>;

export const PERMITTED: SendPermit = { kind: 'permitted' };
const DISCONNECTED: SendPermit = errorKeyed('loadedapp.connection-error');
const MIXNET_BLOCKED: SendPermit = errorKeyed('send.nym-blocked');

/** Decides whether the app may broadcast a transaction in the given state, with one object per answer. */
export function sendPermit({
  netInfo,
  server,
  mixnetView,
}: SendPermitInputs): SendPermit {
  if (!netInfo.isConnected || server.kind === 'offline') {
    return DISCONNECTED;
  }
  if (!sendGateOpen(mixnetView)) {
    return MIXNET_BLOCKED;
  }
  return PERMITTED;
}

/** Runs `send` when the permit that `permitNow` reads at call time allows it. */
export async function sendWhenPermitted<T>(
  permitNow: () => SendPermit,
  send: () => Promise<T>,
): Promise<SendOutcome<T>> {
  const permit = permitNow();
  if (permit.kind === 'error') {
    return permit;
  }
  return { kind: 'sent', receipt: await send() };
}
