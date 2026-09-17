import { JobKind, LoadError, ZingoError, ZingoError_Tags } from 'zingo-ffi';
import { callFfi, callFfiSync, toFfiError } from '@app/walletBackend/ffi';

describe('toFfiError', () => {
  test('Tests that a ZingoError keeps its tag and detail when it carries a detail field', () => {
    const rejection = new ZingoError.MigrationConsentStale({
      detail: 'plan hash moved',
    });
    expect(toFfiError(rejection)).toEqual({
      tag: ZingoError_Tags.MigrationConsentStale,
      detail: 'plan hash moved',
      error: rejection,
    });
  });

  test('Tests that a Busy rejection names the running job when it carries no detail', () => {
    const rejection = new ZingoError.Busy({ running: JobKind.Drain });
    expect(toFfiError(rejection)).toMatchObject({
      tag: ZingoError_Tags.Busy,
      detail: 'Drain',
    });
  });

  test('Tests that a variant without fields yields its variant text when no detail exists', () => {
    expect(toFfiError(new ZingoError.Closed())).toMatchObject({
      tag: ZingoError_Tags.Closed,
      detail: 'ZingoError.Closed',
    });
  });

  test('Tests that a LoadError keeps its tag when the file module throws one', () => {
    const rejection = new LoadError.Unreadable({ detail: 'bad magic' });
    expect(toFfiError(rejection)).toEqual({
      tag: 'Unreadable',
      detail: 'bad magic',
      error: rejection,
    });
  });

  test('Tests that a native rejection maps to its tag when its code is a LoadError tag or Host', () => {
    expect(
      toFfiError(Object.assign(new Error('disk full'), { code: 'Save' })),
    ).toEqual({ tag: 'Save', detail: 'disk full' });
    expect(
      toFfiError(Object.assign(new Error('shim missing'), { code: 'Host' })),
    ).toEqual({ tag: 'Host', detail: 'shim missing' });
  });

  test('Tests that an unrecognized rejection maps to Unknown when it carries no known code', () => {
    expect(
      toFfiError(Object.assign(new Error('boom'), { code: 'Bogus' })),
    ).toEqual({ tag: 'Unknown', detail: 'boom' });
    expect(toFfiError(new Error('boom'))).toEqual({
      tag: 'Unknown',
      detail: 'boom',
    });
    expect(toFfiError('boom')).toEqual({ tag: 'Unknown', detail: 'boom' });
    expect(toFfiError(undefined)).toEqual({
      tag: 'Unknown',
      detail: 'undefined',
    });
  });

  test('Tests that prose naming a variant stays Unknown when the rejection carries no tag', () => {
    const rejection = new Error('ZingoError.MigrationConsentStale: plan moved');
    expect(toFfiError(rejection).tag).toBe('Unknown');
  });
});

describe('callFfi', () => {
  test('Tests that a resolution crosses as ok when the promise resolves', async () => {
    await expect(callFfi(Promise.resolve(42))).resolves.toEqual({
      ok: true,
      value: 42,
    });
  });

  test('Tests that a rejection crosses as a typed error when the promise rejects', async () => {
    const rejection = new ZingoError.MigrationNotInProgress();
    await expect(callFfi(Promise.reject(rejection))).resolves.toEqual({
      ok: false,
      error: {
        tag: ZingoError_Tags.MigrationNotInProgress,
        detail: 'ZingoError.MigrationNotInProgress',
        error: rejection,
      },
    });
  });

  test('Tests that a synchronous throw crosses as a typed error when the call throws', () => {
    expect(
      callFfiSync(() => {
        throw new ZingoError.InvalidInput({ detail: 'not an address' });
      }),
    ).toMatchObject({
      ok: false,
      error: { tag: ZingoError_Tags.InvalidInput, detail: 'not an address' },
    });
    expect(callFfiSync(() => 'v')).toEqual({ ok: true, value: 'v' });
  });
});
