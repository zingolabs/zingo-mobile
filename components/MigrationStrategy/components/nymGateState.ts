// Derives the Nym gate sheet's presentation from the mixnet view and the
// held Enable tap. Pure and total: every `mixnet.status.*` key the presenter
// emits maps to exactly one state, and a reconnecting bootstrap reads as
// connecting, never as a failure.
import {
  MixnetStatusKey,
  MixnetView,
} from '../../../app/walletBackend/transforms/mixnetPresenter';

export type NymGateFailureKey = Extract<
  MixnetStatusKey,
  'mixnet.status.died' | 'mixnet.status.unknown'
>;

export type NymGateState =
  | { kind: 'ready' }
  | { kind: 'failed'; failureKey: NymGateFailureKey }
  | { kind: 'connecting' }
  | { kind: 'idle' };

// A lost transport fails the gate whether or not a reconnect is in flight;
// a bootstrapping one connects, whether first-time or reconnecting. A null
// view is the context's "no publication yet": idle, or connecting while an
// Enable tap is held.
export function deriveNymGateState(
  enabling: boolean,
  view: MixnetView | null,
): NymGateState {
  if (view === null) {
    return enabling ? { kind: 'connecting' } : { kind: 'idle' };
  }
  switch (view.statusKey) {
    case 'mixnet.status.ready':
      return { kind: 'ready' };
    case 'mixnet.status.died':
    case 'mixnet.status.unknown':
      return { kind: 'failed', failureKey: view.statusKey };
    case 'mixnet.status.bootstrapping':
      return { kind: 'connecting' };
    case 'mixnet.status.off':
      return enabling ? { kind: 'connecting' } : { kind: 'idle' };
  }
}
