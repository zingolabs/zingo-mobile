import {
  SendFailureClass,
  classifySendFailure,
  retryOnAnotherServer,
  sendFailureMessage,
} from '../app/walletBackend/transforms/sendFailureTransform';

/**
 * Realistic failure strings, one per real family the send path produces.
 * The refusal and internal texts are verbatim from their producers
 * (zingolib's MixnetNotReady displays; TransactionService's fabricated
 * no-payload errors).
 */
const BOOTSTRAPPING_REFUSAL =
  'Error: send the Nym mixnet is bootstrapping; this operation requires it to be ready';
const DIED_REFUSAL =
  'Error: send the Nym mixnet proxy died; this operation refuses rather than fall back to clearnet — run `nym on` to restart the proxy';
const INTERNAL_PROPOSE = 'Error: Internal RPC Error: propose';
const INTERNAL_CONFIRM = 'Error: Internal RPC Error: confirm';
const CONNECTION_REFUSED = 'Error: connection refused';

describe('classifySendFailure covers each real error family', () => {
  it.each([
    '18: bad-txns-sapling-duplicate-nullifier',
    '18: bad-txns-sprout-duplicate-nullifier',
    '18: bad-txns-orchard-duplicate-nullifier',
  ])('classifies %s as duplicateNullifier', marker => {
    expect(classifySendFailure(`Error: send ${marker}`).kind).toBe(
      'duplicateNullifier',
    );
  });

  it('classifies the dust reject as dust', () => {
    expect(classifySendFailure('Error: send 64: dust').kind).toBe('dust');
  });

  it('classifies both fail-closed refusal texts as mixnetRefusal', () => {
    expect(classifySendFailure(BOOTSTRAPPING_REFUSAL).kind).toBe(
      'mixnetRefusal',
    );
    expect(classifySendFailure(DIED_REFUSAL).kind).toBe('mixnetRefusal');
  });

  it('classifies both fabricated no-payload errors as internalRpcFailure', () => {
    expect(classifySendFailure(INTERNAL_PROPOSE).kind).toBe(
      'internalRpcFailure',
    );
    expect(classifySendFailure(INTERNAL_CONFIRM).kind).toBe(
      'internalRpcFailure',
    );
  });

  it('presumes an unrecognized error is a serverSuspect', () => {
    expect(classifySendFailure(CONNECTION_REFUSED).kind).toBe('serverSuspect');
  });
});

/**
 * Regression: the legacy classifier (`interceptCustomError`) returned
 * `string | undefined`, and `undefined` collapsed the states below into one
 * "presume server, switch and retry" bucket. Each test names one collapsed
 * state and asserts the pair the enumeration now guarantees for it — the
 * distinct kind and the explicit retry routing. Every test here FAILS
 * against the legacy semantics (where each state was `undefined`:
 * indistinguishable, and unconditionally retry-eligible) and PASSES against
 * the enumeration.
 */
describe('regression: states the legacy undefined collapsed', () => {
  it('a bootstrapping refusal was undefined (kindless, retried); now mixnetRefusal, never retried', () => {
    const failure = classifySendFailure(BOOTSTRAPPING_REFUSAL);
    expect(failure.kind).toBe('mixnetRefusal');
    expect(retryOnAnotherServer(failure)).toBe(false);
  });

  it('a died refusal was undefined (kindless, retried); now mixnetRefusal, never retried', () => {
    const failure = classifySendFailure(DIED_REFUSAL);
    expect(failure.kind).toBe('mixnetRefusal');
    expect(retryOnAnotherServer(failure)).toBe(false);
  });

  it('an internal propose failure was undefined (kindless); now its own kind, historical routing kept', () => {
    const failure = classifySendFailure(INTERNAL_PROPOSE);
    expect(failure.kind).toBe('internalRpcFailure');
    // Routing deliberately preserved from the legacy bucket; the point of
    // the arm is that the state is now visible and separately revisable.
    expect(retryOnAnotherServer(failure)).toBe(true);
  });

  it('an internal confirm failure was undefined (kindless); now its own kind, historical routing kept', () => {
    const failure = classifySendFailure(INTERNAL_CONFIRM);
    expect(failure.kind).toBe('internalRpcFailure');
    expect(retryOnAnotherServer(failure)).toBe(true);
  });

  it('a genuine server fault keeps the historical presumption and its retry', () => {
    const failure = classifySendFailure(CONNECTION_REFUSED);
    expect(failure.kind).toBe('serverSuspect');
    expect(retryOnAnotherServer(failure)).toBe(true);
  });

  it('the collapsed states are now pairwise distinct', () => {
    const kinds = new Set(
      [BOOTSTRAPPING_REFUSAL, INTERNAL_PROPOSE, CONNECTION_REFUSED].map(
        error => classifySendFailure(error).kind,
      ),
    );
    expect(kinds.size).toBe(3);
  });
});

describe('retryOnAnotherServer is exhaustive over the enumeration', () => {
  const arm = (kind: SendFailureClass['kind']): SendFailureClass =>
    ({ kind, error: 'x' }) as SendFailureClass;

  it.each([
    ['serverSuspect', true],
    ['internalRpcFailure', true],
    ['duplicateNullifier', false],
    ['dust', false],
    ['mixnetRefusal', false],
  ] as const)('%s -> %s', (kind, eligible) => {
    expect(retryOnAnotherServer(arm(kind))).toBe(eligible);
  });
});

describe('sendFailureMessage', () => {
  const translate = (key: string): unknown => `t(${key})`;

  it('translates the wallet verdicts', () => {
    expect(sendFailureMessage(classifySendFailure('64: dust'), translate)).toBe(
      't(send.dust-error)',
    );
    expect(
      sendFailureMessage(
        classifySendFailure('18: bad-txns-orchard-duplicate-nullifier'),
        translate,
      ),
    ).toBe('t(send.duplicate-nullifier-error)');
  });

  it('shows a mixnet refusal verbatim, untranslated', () => {
    expect(
      sendFailureMessage(classifySendFailure(DIED_REFUSAL), translate),
    ).toBe(DIED_REFUSAL);
  });

  it('shows internal and server-suspect errors verbatim', () => {
    expect(
      sendFailureMessage(classifySendFailure(INTERNAL_CONFIRM), translate),
    ).toBe(INTERNAL_CONFIRM);
    expect(
      sendFailureMessage(classifySendFailure(CONNECTION_REFUSED), translate),
    ).toBe(CONNECTION_REFUSED);
  });
});

/**
 * The classification seam is mobile-owned (#1229): our own
 * `ZingolibError::Mixnet` display prefix marks a mixnet refusal, so a
 * zingolib rewording of the refusal prose cannot silently revert refusals
 * to the switch-server-and-retry dance. The zingolib phrase stays as a
 * secondary marker for texts wrapped under other variants by old builds.
 */
describe('the mobile-owned refusal marker (#1229)', () => {
  it('classifies our own mixnet prefix as a refusal, whatever zingolib says inside', () => {
    const reworded =
      'Error: mixnet: the tunnel is not ready to carry this operation';
    const failure = classifySendFailure(reworded);
    expect(failure.kind).toBe('mixnetRefusal');
    expect(retryOnAnotherServer(failure)).toBe(false);
  });

  it('the excluded-indexer exhaustion is a deliberate serverSuspect: switching servers changes eligibility', () => {
    const exhaustion =
      "Error: indexer: no eligible Broadcast Indexer remains after excluding the synchronization endpoint's host";
    const failure = classifySendFailure(exhaustion);
    expect(failure.kind).toBe('serverSuspect');
    expect(retryOnAnotherServer(failure)).toBe(true);
  });
});
