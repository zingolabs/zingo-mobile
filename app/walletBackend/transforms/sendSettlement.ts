import type { FfiResult } from '@app/walletBackend/ffi';
import { RPCShieldType } from '@app/walletBackend/types/RPCShieldType';
import {
  SendFailureClass,
  SendFailureText,
  classifySendFailure,
  retryOnAnotherServer,
  sendFailureText,
} from './sendFailureTransform';
import type { SendOutcome } from './sendPermit';

export type SendSettlement = { kind: 'sent' } | SendFailureText;

/** The route parameters that put the Computing screen in its final phase. */
export type ComputingEnd =
  { phase: 'created' } | { phase: 'failed'; failure?: SendFailureText };

type Attempted =
  SendSettlement | { kind: 'rejected'; failure: SendFailureClass };

const SENT: SendSettlement = { kind: 'sent' };
const CREATED: ComputingEnd = { phase: 'created' };

const attemptOnce = async (
  attempt: () => Promise<SendOutcome<unknown>>,
): Promise<Attempted> => {
  try {
    const outcome = await attempt();
    return outcome.kind === 'error' ? outcome : SENT;
  } catch (thrown) {
    return { kind: 'rejected', failure: classifySendFailure(String(thrown)) };
  }
};

/** Runs `attempt`, and runs it once more after `switchServer` when the backend rejects with a failure that another server can cure. */
export async function settleSend(
  attempt: () => Promise<SendOutcome<unknown>>,
  switchServer: () => Promise<void>,
  switchAllowed: boolean,
): Promise<SendSettlement> {
  const first = await attemptOnce(attempt);
  if (first.kind !== 'rejected') {
    return first;
  }
  if (!switchAllowed || !retryOnAnotherServer(first.failure)) {
    return sendFailureText(first.failure);
  }
  await switchServer();
  const second = await attemptOnce(attempt);
  return second.kind === 'rejected' ? sendFailureText(second.failure) : second;
}

/** Maps the settlement of a send to the final phase of the Computing screen. */
export const computingEnd = (settlement: SendSettlement): ComputingEnd =>
  settlement.kind === 'sent'
    ? CREATED
    : { phase: 'failed', failure: settlement };

/** Maps the result of a shield to the final phase of the Computing screen. */
export function shieldEnd(shield: FfiResult<string>): ComputingEnd {
  if (!shield.ok) {
    return {
      phase: 'failed',
      failure: { kind: 'verbatim', text: shield.error.message },
    };
  }
  try {
    const parsed: RPCShieldType = JSON.parse(shield.value);
    if (parsed.error) {
      return {
        phase: 'failed',
        failure: { kind: 'verbatim', text: parsed.error },
      };
    }
    return parsed.txids ? CREATED : { phase: 'failed' };
  } catch {
    // An unparseable success payload is most likely a quirky success form.
    return CREATED;
  }
}
