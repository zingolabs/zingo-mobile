import {
  classifySendFailure,
  sendFailureText,
} from '@app/walletBackend/transforms/sendFailureTransform';

const DIED_REFUSAL =
  'Error: send the Nym mixnet proxy died; this operation refuses rather than fall back to clearnet — run `nym on` to restart the proxy';
const INTERNAL_CONFIRM = 'Error: Internal RPC Error: confirm';
const CONNECTION_REFUSED = 'Error: connection refused';

describe('classifySendFailure', () => {
  it.each([
    '18: bad-txns-sapling-duplicate-nullifier',
    '18: bad-txns-sprout-duplicate-nullifier',
    '18: bad-txns-orchard-duplicate-nullifier',
  ])(
    'Tests that the failure is a duplicate nullifier when the node rejects with %s.',
    marker => {
      expect(classifySendFailure(`Error: send ${marker}`).kind).toBe(
        'duplicateNullifier',
      );
    },
  );

  it('Tests that the failure is dust when the node rejects with 64: dust.', () => {
    expect(classifySendFailure('Error: send 64: dust').kind).toBe('dust');
  });

  it.each([DIED_REFUSAL, INTERNAL_CONFIRM, CONNECTION_REFUSED])(
    'Tests that the failure is other when the error is %s.',
    error => {
      expect(classifySendFailure(error).kind).toBe('other');
    },
  );
});

describe('sendFailureText', () => {
  it('Tests that the text is a catalog key when the node rejects the send.', () => {
    expect(sendFailureText(classifySendFailure('64: dust'))).toEqual({
      kind: 'error',
      errorKey: 'send.dust-error',
    });
    expect(
      sendFailureText(
        classifySendFailure('18: bad-txns-orchard-duplicate-nullifier'),
      ),
    ).toEqual({ kind: 'error', errorKey: 'send.duplicate-nullifier-error' });
  });

  it('Tests that the text is the error verbatim when the failure is other.', () => {
    expect(sendFailureText(classifySendFailure(DIED_REFUSAL))).toEqual({
      kind: 'verbatim',
      text: DIED_REFUSAL,
    });
    expect(sendFailureText(classifySendFailure(CONNECTION_REFUSED))).toEqual({
      kind: 'verbatim',
      text: CONNECTION_REFUSED,
    });
  });
});
