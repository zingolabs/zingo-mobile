import { ZingoError, ZingoError_Tags } from 'zingo-ffi';
import { FfiError, toFfiError } from '@app/walletBackend/ffi';
import {
  SendFailureClass,
  classifySendFailure,
  retryOnAnotherServer,
  sendFailureText,
} from '@app/walletBackend/transforms/sendFailureTransform';

const failure = (detail: string): FfiError => ({ tag: 'Unknown', detail });

describe('classifySendFailure', () => {
  test('Tests that an InsufficientFunds rejection carries its amounts when the wallet lacks funds', () => {
    const rejection = toFfiError(
      new ZingoError.InsufficientFunds({
        available: 5_000n,
        required: 12_000n,
        detail: 'need 12000, have 5000',
      }),
    );
    expect(classifySendFailure(rejection)).toMatchObject({
      kind: 'insufficientFunds',
      available: 5_000,
      required: 12_000,
    });
  });

  test.each([
    new ZingoError.MixnetUnattached({ detail: 'no proxy' }),
    new ZingoError.MixnetBootstrapping({ detail: 'wait' }),
    new ZingoError.MixnetDied({ detail: 'proxy died' }),
    new ZingoError.MixnetSwitchedOff({ detail: 'off' }),
    new ZingoError.MixnetEnableFailed({ detail: 'spawn failed' }),
  ])(
    'Tests that a mixnet rejection classifies as a refusal when the tag is %s',
    error => {
      expect(classifySendFailure(toFfiError(error)).kind).toBe(
        'mixnetRefusal',
      );
    },
  );

  test('Tests that the destination and offline tags classify by tag before any text', () => {
    expect(
      classifySendFailure(
        toFfiError(
          new ZingoError.DestinationIneligible({ detail: '64: dust' }),
        ),
      ).kind,
    ).toBe('destinationIneligible');
    expect(classifySendFailure(toFfiError(new ZingoError.Offline())).kind).toBe(
      'offline',
    );
  });

  test('Tests that an unreachable indexer classifies as a server suspect when the tag says so', () => {
    expect(
      classifySendFailure(
        toFfiError(new ZingoError.IndexerUnreachable({ detail: 'dial' })),
      ).kind,
    ).toBe('serverSuspect');
  });

  test.each([
    '18: bad-txns-sapling-duplicate-nullifier',
    '18: bad-txns-sprout-duplicate-nullifier',
    '18: bad-txns-orchard-duplicate-nullifier',
  ])(
    'Tests that the node reject %s classifies as a duplicate nullifier when it appears in the detail',
    marker => {
      expect(classifySendFailure(failure(`send ${marker}`)).kind).toBe(
        'duplicateNullifier',
      );
    },
  );

  test('Tests that the dust reject classifies as dust when it appears in the detail', () => {
    expect(classifySendFailure(failure('send 64: dust')).kind).toBe('dust');
  });

  test('Tests that an unrecognized failure is presumed a server suspect', () => {
    expect(classifySendFailure(failure('connection refused')).kind).toBe(
      'serverSuspect',
    );
  });
});

describe('retryOnAnotherServer', () => {
  const arm = (kind: SendFailureClass['kind']): SendFailureClass =>
    ({ kind, error: failure('x') }) as SendFailureClass;

  test.each([
    ['serverSuspect', true],
    ['insufficientFunds', false],
    ['mixnetRefusal', false],
    ['destinationIneligible', false],
    ['offline', false],
    ['duplicateNullifier', false],
    ['dust', false],
  ] as const)(
    'Tests that a %s failure retries on another server only when a switch can help',
    (kind, eligible) => {
      expect(retryOnAnotherServer(arm(kind))).toBe(eligible);
    },
  );
});

describe('sendFailureText', () => {
  test('Tests that the wallet verdicts carry catalog keys when classified', () => {
    expect(sendFailureText(classifySendFailure(failure('64: dust')))).toEqual({
      kind: 'key',
      errorKey: 'send.dust-error',
    });
    expect(
      sendFailureText(
        classifySendFailure(
          toFfiError(
            new ZingoError.InsufficientFunds({
              available: 1n,
              required: 2n,
              detail: '',
            }),
          ),
        ),
      ),
    ).toEqual({ kind: 'key', errorKey: 'ffi.insufficientfunds' });
    expect(
      sendFailureText(classifySendFailure(toFfiError(new ZingoError.Offline()))),
    ).toEqual({ kind: 'key', errorKey: 'ffi.offline' });
  });

  test('Tests that a refusal and a server fault carry the detail verbatim when no key applies', () => {
    const refusal = toFfiError(
      new ZingoError.MixnetDied({ detail: 'the proxy died' }),
    );
    expect(sendFailureText(classifySendFailure(refusal))).toEqual({
      kind: 'verbatim',
      text: 'the proxy died',
    });
    expect(
      sendFailureText(classifySendFailure(failure('connection refused'))),
    ).toEqual({ kind: 'verbatim', text: 'connection refused' });
    expect(refusal.tag).toBe(ZingoError_Tags.MixnetDied);
  });
});
