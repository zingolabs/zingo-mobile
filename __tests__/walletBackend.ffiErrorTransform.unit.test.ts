import { LoadError_Tags, ZingoError, ZingoError_Tags } from 'zingo-ffi';
import { toFfiError } from '@app/walletBackend/ffi';
import {
  ffiErrorText,
  fillParams,
} from '@app/walletBackend/transforms/ffiErrorTransform';

describe('ffiErrorText', () => {
  test('Tests that an actionable tag maps to its catalog key when the wallet rejects with it', () => {
    expect(
      ffiErrorText(
        toFfiError(new ZingoError.InvalidMnemonic({ detail: 'word 3' })),
      ),
    ).toEqual({ errorKey: 'ffi.invalidmnemonic', params: { detail: 'word 3' } });
    expect(ffiErrorText(toFfiError(new ZingoError.Offline()))).toMatchObject({
      errorKey: 'ffi.offline',
    });
    expect(
      ffiErrorText({ tag: LoadError_Tags.Unreadable, detail: 'bad magic' }),
    ).toMatchObject({ errorKey: 'ffi.walletunreadable' });
  });

  test('Tests that the birthday and activation heights travel as params when the birthday is too low', () => {
    expect(
      ffiErrorText(
        toFfiError(
          new ZingoError.BirthdayBelowActivation({
            birthday: 100,
            activation: 419_200,
            detail: 'too low',
          }),
        ),
      ),
    ).toEqual({
      errorKey: 'ffi.birthdaybelowactivation',
      params: { birthday: '100', activation: '419200' },
    });
  });

  test('Tests that the amounts travel as params when funds are insufficient', () => {
    expect(
      ffiErrorText(
        toFfiError(
          new ZingoError.InsufficientFunds({
            available: 5n,
            required: 9n,
            detail: '',
          }),
        ),
      ),
    ).toEqual({
      errorKey: 'ffi.insufficientfunds',
      params: { available: '5', required: '9' },
    });
  });

  test('Tests that the running job travels as the detail param when the wallet is busy', () => {
    const text = ffiErrorText(
      toFfiError(new ZingoError.Busy({ running: 0 })),
    );
    expect(text).toEqual({ errorKey: 'ffi.busy', params: { detail: 'Drain' } });
  });

  test('Tests that no key is offered when the tag is not actionable', () => {
    expect(ffiErrorText(toFfiError(new ZingoError.Closed()))).toBeUndefined();
    expect(
      ffiErrorText({ tag: ZingoError_Tags.Internal, detail: 'x' }),
    ).toBeUndefined();
    expect(ffiErrorText({ tag: 'Unknown', detail: 'x' })).toBeUndefined();
  });
});

describe('fillParams', () => {
  test('Tests that every placeholder is filled when the params name it', () => {
    expect(
      fillParams('Birthday {birthday} is below {activation}.', {
        birthday: '100',
        activation: '419200',
      }),
    ).toBe('Birthday 100 is below 419200.');
  });

  test('Tests that the sentence stays intact when it carries no placeholder', () => {
    expect(fillParams('The wallet is offline.', { detail: 'x' })).toBe(
      'The wallet is offline.',
    );
  });
});
