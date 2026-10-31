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

/**
 * Where a send stopped: before its transactions existed, on its way to the
 * network, or turned away by the node.
 */
export type SendStage = 'create' | 'send' | 'rejected';

/**
 * A send that went out names its txids, in the order they were sent; one
 * that failed says where, and since when (in seconds) its attempt ran, so
 * the transactions it left as failed can be found.
 */
export type SendSettlement =
  | { kind: 'sent'; txids: string[] }
  | {
      kind: 'failed';
      failure: SendFailureText;
      stage: SendStage;
      since: number;
    };

/** The route parameters that put the Computing screen in its final phase. */
export type ComputingEnd =
  | { phase: 'created'; txids: string[] }
  | {
      phase: 'failed';
      failure?: SendFailureText;
      stage: SendStage;
      since: number;
    };

/** What the Computing screen tells about a send or a shield: how much, to whom, and whether it goes in two transactions (TEX). */
export type ComputingSubject = {
  amount: string;
  who: string;
  kind: 'send' | 'shield';
  pair: boolean;
};

/** The Computing screen's parameters: its phase, and what is being sent. */
export type ComputingParams = { subject?: ComputingSubject } & (
  { phase?: undefined } | ComputingEnd
);

/**
 * zingolib's display of `SendError::TransmissionError`: the transactions
 * were created, and their transmission failed.
 */
const TRANSMISSION_MARKER = 'Transmission error.';
/** A node's reject code, as in "18: bad-txns-…" or "64: dust". */
const NODE_REJECT = /\b\d{1,3}: [a-z][\w-]*/;

/** Where a send stopped, read from the error the backend answered. */
export const sendStage = (error: string): SendStage =>
  !error.includes(TRANSMISSION_MARKER)
    ? 'create'
    : NODE_REJECT.test(error)
      ? 'rejected'
      : 'send';

/** Now, in the seconds a value transfer's `time` counts in. */
export const nowSeconds = (): number => Math.floor(Date.now() / 1000);

/** The receipt of a send lists its txids joined by commas; a TEX send, the hop first and the payment last. */
const txidsOf = (receipt: unknown): string[] =>
  typeof receipt === 'string'
    ? receipt
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
    : [];

type Attempted =
  | SendSettlement
  | { kind: 'rejected'; failure: SendFailureClass; since: number };

const attemptOnce = async (
  attempt: () => Promise<SendOutcome<unknown>>,
): Promise<Attempted> => {
  const since = nowSeconds();
  try {
    const outcome = await attempt();
    return outcome.kind === 'error'
      ? { kind: 'failed', failure: outcome, stage: 'create', since }
      : { kind: 'sent', txids: txidsOf(outcome.receipt) };
  } catch (thrown) {
    return {
      kind: 'rejected',
      failure: classifySendFailure(String(thrown)),
      since,
    };
  }
};

const failedWith = (
  rejected: Extract<Attempted, { kind: 'rejected' }>,
): SendSettlement => ({
  kind: 'failed',
  failure: sendFailureText(rejected.failure),
  stage: sendStage(rejected.failure.error),
  since: rejected.since,
});

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
    return failedWith(first);
  }
  await switchServer();
  const second = await attemptOnce(attempt);
  return second.kind === 'rejected' ? failedWith(second) : second;
}

/** Maps the settlement of a send to the final phase of the Computing screen. */
export const computingEnd = (settlement: SendSettlement): ComputingEnd =>
  settlement.kind === 'sent'
    ? { phase: 'created', txids: settlement.txids }
    : {
        phase: 'failed',
        failure: settlement.failure,
        stage: settlement.stage,
        since: settlement.since,
      };

/** Maps the result of a shield, started at `since`, to the final phase of the Computing screen. */
export function shieldEnd(
  shield: FfiResult<string>,
  since: number,
): ComputingEnd {
  const failed = (text: string): ComputingEnd => ({
    phase: 'failed',
    failure: { kind: 'verbatim', text },
    stage: sendStage(text),
    since,
  });
  if (!shield.ok) {
    return failed(shield.error.message);
  }
  try {
    const parsed: RPCShieldType = JSON.parse(shield.value);
    if (parsed.error) {
      return failed(parsed.error);
    }
    if (!parsed.txids) {
      return { phase: 'failed', stage: 'create', since };
    }
    return { phase: 'created', txids: parsed.txids };
  } catch {
    // An unparseable success payload is most likely a quirky success form.
    return { phase: 'created', txids: [] };
  }
}
