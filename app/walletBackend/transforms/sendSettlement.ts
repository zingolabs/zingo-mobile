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

/** A send that went out names its first txid, so its detail can be opened. */
export type SendSettlement = { kind: 'sent'; txid?: string } | SendFailureText;

/** The route parameters that put the Computing screen in its final phase. */
export type ComputingEnd =
  | { phase: 'created'; txid?: string }
  | { phase: 'failed'; failure?: SendFailureText };

/** What a send carries to the Computing screen: how much, and to whom. */
export type ComputingSubject = { amount: string; who: string };

/** The Computing screen's parameters: its phase, and what is being sent. */
export type ComputingParams = { subject?: ComputingSubject } & (
  { phase?: undefined } | ComputingEnd
);

type Attempted =
  SendSettlement | { kind: 'rejected'; failure: SendFailureClass };

/** The receipt of a send lists its txids joined by commas. */
const sentWith = (receipt: unknown): SendSettlement => {
  const txid = typeof receipt === 'string' ? receipt.split(',')[0].trim() : '';
  return txid ? { kind: 'sent', txid } : { kind: 'sent' };
};
const CREATED: ComputingEnd = { phase: 'created' };

const attemptOnce = async (
  attempt: () => Promise<SendOutcome<unknown>>,
): Promise<Attempted> => {
  try {
    const outcome = await attempt();
    return outcome.kind === 'error' ? outcome : sentWith(outcome.receipt);
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
    ? settlement.txid
      ? { phase: 'created', txid: settlement.txid }
      : CREATED
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
