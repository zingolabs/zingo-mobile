import type { FfiError } from '@app/walletBackend/ffi';
import {
  SendFailureClass,
  classifySendFailure,
  retryOnAnotherServer,
  sendFailureText,
} from '@app/walletBackend/transforms/sendFailureTransform';

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

/** A rejection the bridge answered as data, with no variant behind it. */
const inBand = (message: string): FfiError => ({ code: 'Unknown', message });

describe('classifySendFailure covers each real error family', () => {
  it.each([
    '18: bad-txns-sapling-duplicate-nullifier',
    '18: bad-txns-sprout-duplicate-nullifier',
    '18: bad-txns-orchard-duplicate-nullifier',
  ])('classifies %s as duplicateNullifier', marker => {
    expect(classifySendFailure(inBand(`Error: send ${marker}`)).kind).toBe(
      'duplicateNullifier',
    );
  });

  it('classifies the dust reject as dust', () => {
    expect(classifySendFailure(inBand('Error: send 64: dust')).kind).toBe(
      'dust',
    );
  });

  it('classifies both fail-closed refusal texts as mixnetRefusal', () => {
    expect(classifySendFailure(inBand(BOOTSTRAPPING_REFUSAL)).kind).toBe(
      'mixnetRefusal',
    );
    expect(classifySendFailure(inBand(DIED_REFUSAL)).kind).toBe(
      'mixnetRefusal',
    );
  });

  it('classifies both fabricated no-payload errors as internalRpcFailure', () => {
    expect(classifySendFailure(inBand(INTERNAL_PROPOSE)).kind).toBe(
      'internalRpcFailure',
    );
    expect(classifySendFailure(inBand(INTERNAL_CONFIRM)).kind).toBe(
      'internalRpcFailure',
    );
  });

  it('presumes an unrecognized error is a serverSuspect', () => {
    expect(classifySendFailure(inBand(CONNECTION_REFUSED)).kind).toBe(
      'serverSuspect',
    );
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
    const failure = classifySendFailure(inBand(BOOTSTRAPPING_REFUSAL));
    expect(failure.kind).toBe('mixnetRefusal');
    expect(retryOnAnotherServer(failure)).toBe(false);
  });

  it('a died refusal was undefined (kindless, retried); now mixnetRefusal, never retried', () => {
    const failure = classifySendFailure(inBand(DIED_REFUSAL));
    expect(failure.kind).toBe('mixnetRefusal');
    expect(retryOnAnotherServer(failure)).toBe(false);
  });

  it('an internal propose failure was undefined (kindless); now its own kind, historical routing kept', () => {
    const failure = classifySendFailure(inBand(INTERNAL_PROPOSE));
    expect(failure.kind).toBe('internalRpcFailure');
    // Routing deliberately preserved from the legacy bucket; the point of
    // the arm is that the state is now visible and separately revisable.
    expect(retryOnAnotherServer(failure)).toBe(true);
  });

  it('an internal confirm failure was undefined (kindless); now its own kind, historical routing kept', () => {
    const failure = classifySendFailure(inBand(INTERNAL_CONFIRM));
    expect(failure.kind).toBe('internalRpcFailure');
    expect(retryOnAnotherServer(failure)).toBe(true);
  });

  it('a genuine server fault keeps the historical presumption and its retry', () => {
    const failure = classifySendFailure(inBand(CONNECTION_REFUSED));
    expect(failure.kind).toBe('serverSuspect');
    expect(retryOnAnotherServer(failure)).toBe(true);
  });

  it('the collapsed states are now pairwise distinct', () => {
    const kinds = new Set(
      [BOOTSTRAPPING_REFUSAL, INTERNAL_PROPOSE, CONNECTION_REFUSED].map(
        error => classifySendFailure(inBand(error)).kind,
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

describe('sendFailureText', () => {
  it('carries a catalog key for the wallet verdicts', () => {
    expect(sendFailureText(classifySendFailure(inBand('64: dust')))).toEqual({
      kind: 'error',
      errorKey: 'send.dust-error',
    });
    expect(
      sendFailureText(
        classifySendFailure(inBand('18: bad-txns-orchard-duplicate-nullifier')),
      ),
    ).toEqual({ kind: 'error', errorKey: 'send.duplicate-nullifier-error' });
  });

  it('carries a mixnet refusal verbatim, untranslated', () => {
    expect(sendFailureText(classifySendFailure(inBand(DIED_REFUSAL)))).toEqual({
      kind: 'verbatim',
      text: DIED_REFUSAL,
    });
  });

  it('carries internal and server-suspect errors verbatim', () => {
    expect(
      sendFailureText(classifySendFailure(inBand(INTERNAL_CONFIRM))),
    ).toEqual({
      kind: 'verbatim',
      text: INTERNAL_CONFIRM,
    });
    expect(
      sendFailureText(classifySendFailure(inBand(CONNECTION_REFUSED))),
    ).toEqual({
      kind: 'verbatim',
      text: CONNECTION_REFUSED,
    });
  });
});

describe('the Mixnet variant', () => {
  test('Tests that a rejection is a refusal, never retried, when the bridge codes it Mixnet and its message carries no known phrase.', () => {
    const failure = classifySendFailure({
      code: 'Mixnet',
      message: 'Error: send the tunnel is not ready to carry this operation',
    });
    expect(failure.kind).toBe('mixnetRefusal');
    expect(retryOnAnotherServer(failure)).toBe(false);
  });

  test('Tests that the excluded-indexer exhaustion is a serverSuspect, retried, when the bridge codes it Indexer. Switching servers changes eligibility.', () => {
    const failure = classifySendFailure({
      code: 'Indexer',
      message:
        "Error: indexer: no eligible Broadcast Indexer remains after excluding the synchronization endpoint's host",
    });
    expect(failure.kind).toBe('serverSuspect');
    expect(retryOnAnotherServer(failure)).toBe(true);
  });
});
